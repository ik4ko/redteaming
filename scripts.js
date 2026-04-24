/* ============================================================
   RedTeamGig — script.js
   Gatekeeper: session check → role → render. No loops.
   ============================================================ */

const SUPA_URL = 'https://cnhmfxwyqtpbmjadlwty.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaG1meHd5cXRwYm1qYWRsd3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzA1NTksImV4cCI6MjA5MjEwNjU1OX0.bTTVehjz_LQLoTd0xW-FMqLdrB7nnKUlU163vLWcdrA';
const db = window.supabase.createClient(SUPA_URL, SUPA_KEY);

/* ── AI system prompt — strictly scoped ─────────────────────── */
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

/* ══════════════════════════════════════════════════════════════
   BOOT — Fixed to prevent infinite spinner
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', boot);

async function boot() {
  if (APP.initialized) return;
  APP.initialized = true;

  // 1. Session check
  const { data: { session }, error: sessErr } = await db.auth.getSession();
  if (sessErr || !session?.user) {
    window.location.replace('/index.html');
    return;
  }
  APP.user = session.user;

  // 2. Profile fetch
  let { data: profile } = await db.from('profiles').select('*').eq('id', APP.user.id).single();
  if (!profile) {
    const { data: newProfile } = await db.from('profiles').upsert({
      id: APP.user.id,
      display_name: APP.user.email.split('@')[0],
      role: 'red_teamer',
    }).select().single();
    profile = newProfile;
  }
  APP.profile = profile;
  APP.role = profile?.role || 'red_teamer';

  // 3. THE KEY CHANGE: Hide spinner, show app shell 
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) loadingScreen.style.display = 'none';

  const appShell = document.getElementById('app-shell');
  if (appShell) appShell.style.display = 'flex';

  paintSidebar();

  if (APP.role === 'company_client' || APP.role === 'admin') {
    show('company-view');
    initCompany();
  } else {
    show('freelancer-view');
    initFreelancer();
    show('ai-panel');
  }

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.replace('/index.html');
  });
}

// Ensure these helper functions exist at the bottom 
function show(id) { 
  const el = document.getElementById(id);
  if (el) el.style.display = (id === 'app-shell' ? 'flex' : 'block');
}
function hide(id) { 
  const el = document.getElementById(id);
  if (el) el.style.display = 'none'; 
}

  APP.profile = profile;
  APP.role = profile?.role || 'red_teamer';

  // 3. Render — Hide spinner, show app
  const loadingScreen = document.getElementById('loading-screen') || document.querySelector('.circling-thing-container');
  if (loadingScreen) loadingScreen.style.display = 'none';
  
  show('app-shell');
  paintSidebar();

  if (APP.role === 'company_client' || APP.role === 'admin') {
    show('company-view');
    initCompany();
  } else {
    show('freelancer-view');
    initFreelancer();
  }

  if (APP.role === 'red_teamer') show('ai-panel');

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.replace('/index.html');
  });
}

/* ══════════════════════════════════════════════════════════════
   CLAUDE API (Pointed to Vercel Proxy for Security)
══════════════════════════════════════════════════════════════ */
async function callClaude(userMsg, system, maxTokens = 600) {
  // We fetch our OWN /api/claude route so the key stays hidden on Vercel
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: userMsg,
      system: system
    }),
  });
  const data = await res.json();
  // Handling the response from our Vercel function
  return data.content?.find(b => b.type === 'text')?.text || '';
}

// ... Rest of your helper functions (paintSidebar, initFreelancer, etc. stay the same)
