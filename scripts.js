/* ============================================================
   RedTeamGig — script.js
   Gatekeeper: session check → role → render. 
   ============================================================ */

const SUPA_URL = 'https://cnhmfxwyqtpbmjadlwty.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaG1meHd5cXRwYm1qYWRsd3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzA1NTksImV4cCI6MjA5MjEwNjU1OX0.bTTVehjz_LQLoTd0xW-FMqLdrB7nnKUlU163vLWcdrA';
const db = window.supabase.createClient(SUPA_URL, SUPA_KEY);

/* ── AI system prompt ──────────────────────────────────────── */
const AI_SYSTEM = `You are Mission Control, the AI assistant inside RedTeamGig — a members-only AI safety talent marketplace.
Answer ONLY questions about RedTeamGig platform usage and AI red teaming. Be concise.`;

/* ── App state ──────────────────────────────────────────────── */
const APP = {
  user: null,
  profile: null,
  role: null,
  gigs: [],
  talent: [],
  applications: [],
  filter: 'all',
  initialized: false,
};

document.addEventListener('DOMContentLoaded', boot);

async function boot() {
  if (APP.initialized) return;
  APP.initialized = true;

  try {
    // 1. Session check
    const { data: { session }, error: sessErr } = await db.auth.getSession();
    
    if (sessErr || !session?.user) {
      console.log("No session found, redirecting...");
      window.location.replace('/index.html');
      return;
    }
    APP.user = session.user;

    // 2. Profile fetch
    let { data: profile, error: profErr } = await db
      .from('profiles')
      .select('*')
      .eq('id', APP.user.id)
      .single();

    // If profile doesn't exist, try to create it
    if (!profile) {
      const { data: newProfile, error: createErr } = await db.from('profiles').upsert({
        id: APP.user.id,
        display_name: APP.user.email.split('@')[0],
        role: 'red_teamer',
      }).select().single();
      profile = newProfile;
    }

    APP.profile = profile;
    APP.role = profile?.role || 'red_teamer';

  } catch (err) {
    console.error("Critical Boot Error:", err);
  } finally {
    // 3. THE FAIL-SAFE: This code runs NO MATTER WHAT
    // Even if Supabase is down, we hide the spinner so the app doesn't hang.
    const loadingScreen = document.getElementById('loading-screen') || document.querySelector('.circling-thing-container');
    if (loadingScreen) loadingScreen.style.display = 'none';

    const appShell = document.getElementById('app-shell');
    if (appShell) appShell.style.display = 'flex';

    // 4. Initial Render
    paintSidebar();

    if (APP.role === 'company_client' || APP.role === 'admin') {
      show('company-view');
      if (typeof initCompany === 'function') initCompany();
    } else {
      show('freelancer-view');
      if (typeof initFreelancer === 'function') initFreelancer();
      show('ai-panel');
    }
  }

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.replace('/index.html');
  });
}

/* ── Helper Functions ──────────────────────────────────────── */
function show(id) { 
  const el = document.getElementById(id);
  if (el) el.style.display = (id === 'app-shell' ? 'flex' : 'block');
}

function hide(id) { 
  const el = document.getElementById(id);
  if (el) el.style.display = 'none'; 
}

async function callClaude(userMsg, system, maxTokens = 600) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userMsg, system: system }),
    });
    const data = await res.json();
    return data.content?.find(b => b.type === 'text')?.text || '';
  } catch (e) {
    return "Error connecting to Mission Control.";
  }
}

// ... Keep all your other functions (paintSidebar, initFreelancer, etc.) below this line
