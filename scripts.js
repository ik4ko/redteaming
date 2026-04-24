/* ============================================================
   RedTeamGig — script.js (FINAL DEBUGGED)
   ============================================================ */

const SUPA_URL = 'https://cnhmfxwyqtpbmjadlwty.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaG1meHd5cXRwYm1qYWRsd3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzA1NTksImV4cCI6MjA5MjEwNjU1OX0.bTTVehjz_LQLoTd0xW-FMqLdrB7nnKUlU163vLWcdrA';
const db = window.supabase.createClient(SUPA_URL, SUPA_KEY);

const AI_SYSTEM = `You are Mission Control. Be concise.`;

const APP = {
  user: null,
  profile: null,
  role: null,
  gigs: [],
  initialized: false,
  aiCount: 0 
};

document.addEventListener('DOMContentLoaded', boot);

async function boot() {
  if (APP.initialized) return;
  APP.initialized = true;

  try {
    const { data: { session }, error: sessErr } = await db.auth.getSession();
    if (sessErr || !session?.user) {
      window.location.replace('/index.html');
      return;
    }
    APP.user = session.user;

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

  } catch (err) {
    console.error("Boot Error:", err);
  } finally {
    // ── KILL THE SPINNER ──
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'none';
    
    show('app-shell');
    
    if (APP.role === 'company_client' || APP.role === 'admin') {
      show('company-view');
    } else {
      show('freelancer-view');
      showDashboard(); // Logic to toggle Hub on
      initFreelancer(); 
    }
    paintSidebar();
  }

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.replace('/index.html');
  });
}

/* ── View Switching (IDs match your app.html) ── */

function showDashboard() {
  hide('fl-fl-profile'); 
  show('fl-hub');
  const title = document.getElementById('topbar-title');
  if (title) title.innerText = "Mission Hub";
}

function showProfile() {
  hide('fl-hub');
  show('fl-fl-profile'); 
  const title = document.getElementById('topbar-title');
  if (title) title.innerText = "Mission Profile";

  if (APP.profile) {
    if(document.getElementById('p-name')) document.getElementById('p-name').value = APP.profile.display_name || '';
    if(document.getElementById('p-github')) document.getElementById('p-github').value = APP.profile.github_url || '';
    if(document.getElementById('p-bio')) document.getElementById('p-bio').value = APP.profile.bio || '';
  }
}

/* ── AI Panel Logic ── */

function toggleAI() {
  const panel = document.getElementById('ai-panel');
  if (panel) panel.classList.toggle('ai-open');
}

// Fixed aiAsk to prevent "ReferenceError"
function aiAsk(text) {
  const input = document.getElementById('ai-input');
  if (input) {
    input.value = text;
    aiSend();
  }
}

async function aiSend() {
  const input = document.getElementById('ai-input');
  const chatBox = document.getElementById('ai-msgs'); 
  const text = input.value?.trim();
  if (!text) return;

  chatBox.innerHTML += `<div class="ai-msg user"><div class="ai-bubble">${text}</div></div>`;
  input.value = '';
  
  // Logic for callClaude goes here...
}

/* ── UI Helpers ── */

function show(id) { 
  const el = document.getElementById(id);
  if (el) el.style.display = (id === 'app-shell' ? 'flex' : 'block');
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function paintSidebar() {
  const nameEl = document.getElementById('sb-name');
  if (nameEl && APP.profile) nameEl.innerText = APP.profile.display_name;
}

async function initFreelancer() {
  const { data } = await db.from('external_gigs').select('*').limit(20);
  if (data) APP.gigs = data;
}
