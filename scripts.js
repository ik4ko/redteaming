/* ============================================================
   RedTeamGig — script.js
   Gatekeeper: session check → role → render. 
   ============================================================ */

const SUPA_URL = 'https://cnhmfxwyqtpbmjadlwty.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaG1meHd5cXRwYm1qYWRsd3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzA1NTksImV4cCI6MjA5MjEwNjU1OX0.bTTVehjz_LQLoTd0xW-FMqLdrB7nnKUlU163vLWcdrA';
const db = window.supabase.createClient(SUPA_URL, SUPA_KEY);

/* ── AI system prompt ──────────────────────────────────────── */
const AI_SYSTEM = `You are Mission Control, the AI assistant inside RedTeamGig. Be concise.`;

/* ── App state ──────────────────────────────────────────────── */
const APP = {
  user: null,
  profile: null,
  role: null,
  gigs: [],
  talent: [],
  applications: [],
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

  } catch (err) {
    console.error("Critical Boot Error:", err);
  } finally {
    // 3. THE FAIL-SAFE: Kills the spinner
    const loadingScreen = document.getElementById('loading-screen') || document.querySelector('.circling-thing-container');
    if (loadingScreen) loadingScreen.style.display = 'none';

    const appShell = document.getElementById('app-shell');
    if (appShell) appShell.style.display = 'flex';

    // 4. Initial Render
    paintSidebar();

    if (APP.role === 'company_client' || APP.role === 'admin') {
      show('company-view');
    } else {
      show('freelancer-view');
      showDashboard(); // Defaults to Hub
      initFreelancer(); 
    }
  }

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.replace('/index.html');
  });
}

/* ── View Switching (Syncs with your Sidebar) ──────────────── */

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

/* ── Freelancer Data ───────────────────────────────────────── */

async function initFreelancer() {
  const { data, error } = await db.from('external_gigs').select('*').order('posted_at', { ascending: false });
  if (data) {
    APP.gigs = data;
    renderGigs(data);
    const totalEl = document.getElementById('stat-total');
    if(totalEl) totalEl.innerText = data.length;
  }
}

function renderGigs(list) {
  const grid = document.getElementById('gig-grid');
  if (!grid) return;
  grid.innerHTML = '';
  list.forEach(gig => {
    const card = document.createElement('div');
    card.className = 'gig-card';
    card.innerHTML = `
      <div class="gig-head">
        <div class="gig-icon">${gig.source ? gig.source[0].toUpperCase() : 'R'}</div>
        <div class="gig-title">${gig.title}</div>
      </div>
      <div class="gig-pay-row"><span class="gig-pay">${gig.pay_range || 'Competitive'}</span></div>
      <a href="${gig.apply_url || '#'}" target="_blank" class="btn btn-sig btn-sm">View Mission ↗</a>
    `;
    grid.appendChild(card);
  });
}

/* ── Profile Actions ───────────────────────────────────────── */

async function saveProfile() {
  const name = document.getElementById('p-name')?.value;
  const github = document.getElementById('p-github')?.value;
  const bio = document.getElementById('p-bio')?.value;

  const { error } = await db.from('profiles').update({
    display_name: name,
    github_url: github,
    bio: bio,
    updated_at: new Date()
  }).eq('id', APP.user.id);

  if (error) alert("Update failed.");
  else {
    alert("Profile Updated.");
    APP.profile.display_name = name;
    paintSidebar();
  }
}

/* ── Helpers ───────────────────────────────────────────────── */

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
  
  // Show the freelancer nav
  const nav = document.getElementById('nav-freelancer');
  if (nav && APP.role === 'red_teamer') nav.style.display = 'block';
}

function toggleAI() {
  const panel = document.getElementById('ai-panel');
  if (panel) panel.classList.toggle('ai-open');
}

function aiAsk(text) {
  const input = document.getElementById('ai-input');
  if (input) { input.value = text; }
}
