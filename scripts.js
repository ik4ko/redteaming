/* ============================================================
   RedTeamGig — script.js (STABLE RESTORED)
   ============================================================ */

const SUPA_URL = 'https://cnhmfxwyqtpbmjadlwty.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaG1meHd5cXRwYm1qYWRsd3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzA1NTksImV4cCI6MjA5MjEwNjU1OX0.bTTVehjz_LQLoTd0xW-FMqLdrB7nnKUlU163vLWcdrA';
const db = window.supabase.createClient(SUPA_URL, SUPA_KEY);

const APP = {
  user: null,
  profile: null,
  role: null,
  gigs: [],
  initialized: false,
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
    // ── THE KILL SWITCH FOR THE SPINNER ──
    const loader = document.getElementById('loading-screen') || document.querySelector('.circling-thing-container');
    if (loader) loader.style.display = 'none';
    
    const shell = document.getElementById('app-shell');
    if (shell) shell.style.display = 'flex';
    
    paintSidebar();

    if (APP.role === 'company_client' || APP.role === 'admin') {
      show('company-view');
    } else {
      show('freelancer-view');
      initFreelancer(); 
    }
  }
}

/* ── These functions are what your Sidebar buttons call ── */

function showDashboard() {
  hide('fl-fl-profile'); 
  show('fl-hub');
}

function showProfile() {
  hide('fl-hub');
  show('fl-fl-profile');
  // Fill profile if it exists
  if (APP.profile) {
    const nameInp = document.getElementById('p-name');
    if (nameInp) nameInp.value = APP.profile.display_name || '';
  }
}

/* ── Core Functions ── */

async function initFreelancer() {
  show('fl-hub');
  const { data } = await db.from('external_gigs').select('*').limit(20);
  if (data) renderGigs(data);
}

function renderGigs(list) {
  const grid = document.getElementById('gig-grid');
  if (!grid) return;
  grid.innerHTML = list.map(gig => `
    <div class="gig-card">
      <div class="gig-title">${gig.title}</div>
      <a href="${gig.apply_url || '#'}" target="_blank" class="btn btn-sig btn-sm">View Mission</a>
    </div>
  `).join('');
}

function paintSidebar() {
  const nameEl = document.getElementById('sb-name');
  if (nameEl && APP.profile) nameEl.innerText = APP.profile.display_name;
}

function show(id) { const el = document.getElementById(id); if (el) el.style.display = 'block'; }
function hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
