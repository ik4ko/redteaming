/* ============================================================
   RedTeamGig — script.js (FIXED)
   ============================================================ */

const SUPA_URL = 'https://cnhmfxwyqtpbmjadlwty.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaG1meHd5cXRwYm1qYWRsd3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzA1NTksImV4cCI6MjA5MjEwNjU1OX0.bTTVehjz_LQLoTd0xW-FMqLdrB7nnKUlU163vLWcdrA';
const db = window.supabase.createClient(SUPA_URL, SUPA_KEY);

const AI_SYSTEM = `You are Mission Control, the AI assistant inside RedTeamGig. Answer ONLY questions about platform usage and red teaming. Be extremely concise.`;

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
    // FORCE HIDE LOADING SCREEN
    const loader = document.getElementById('loading-screen') || document.querySelector('.circling-thing-container');
    if (loader) loader.style.display = 'none';
    
    show('app-shell');
    
    if (APP.role === 'company_client' || APP.role === 'admin') {
      show('company-view');
    } else {
      show('freelancer-view');
      showDashboard(); // Ensure Hub is visible
      initFreelancer(); 
    }
    
    paintSidebar();
  }

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.replace('/index.html');
  });
}

/* ── View Switching Logic ──────────────────────────────────── */

function showDashboard() {
  hide('fl-fl-profile'); // Matches your HTML ID
  show('fl-hub');
  const title = document.getElementById('topbar-title');
  if (title) title.innerText = "Mission Hub";
}

function showProfile() {
  hide('fl-hub');
  show('fl-fl-profile'); // Matches your HTML ID
  const title = document.getElementById('topbar-title');
  if (title) title.innerText = "Mission Profile";

  // Pre-fill profile fields
  if (APP.profile) {
    if(document.getElementById('p-name')) document.getElementById('p-name').value = APP.profile.display_name || '';
    if(document.getElementById('p-github')) document.getElementById('p-github').value = APP.profile.github_url || '';
    if(document.getElementById('p-bio')) document.getElementById('p-bio').value = APP.profile.bio || '';
  }
}

/* ── Freelancer Hub Logic ──────────────────────────────────── */

async function initFreelancer() {
  const { data, error } = await db.from('external_gigs').select('*').order('posted_at', { ascending: false });
  if (error) return console.error("Gigs error:", error);

  APP.gigs = data;
  renderGigs(APP.gigs);
  
  if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = data.length;
}

function renderGigs(list) {
  const grid = document.getElementById('gig-grid');
  if (!grid) return;
  grid.innerHTML = '';

  list.forEach(gig => {
    const finalLink = gig.referral_url || gig.apply_url || '#';
    const card = document.createElement('div');
    card.className = 'gig-card';
    card.innerHTML = `
      <div class="gig-head">
        <div class="gig-icon">${gig.source ? gig.source[0].toUpperCase() : 'R'}</div>
        <div class="gig-head-text">
          <div class="gig-badges"><span class="badge badge-dim">${gig.source || 'External'}</span></div>
          <div class="gig-title">${gig.title}</div>
        </div>
      </div>
      <div class="gig-pay-row"><span class="gig-pay">${gig.pay_range || 'Competitive'}</span></div>
      <div class="gig-tags">${gig.tags ? gig.tags.map(t => `<span class="gig-tag">${t}</span>`).join('') : ''}</div>
      <div class="gig-foot">
        <div class="fit-row">
           <div class="fit-track"><div class="fit-fill" style="width: ${Math.floor(Math.random() * 30) + 70}%"></div></div>
           <span>AI Match</span>
        </div>
        <a href="${finalLink}" target="_blank" class="btn btn-sig btn-sm">View Mission ↗</a>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ── Profile Management ────────────────────────────────────── */

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

  if (error) alert("Sync failed.");
  else {
    alert("Profile synced to Mission Control.");
    APP.profile.display_name = name;
    paintSidebar();
  }
}

/* ── AI Panel (Mission Control) ─────────────────────────────── */

function toggleAI(forceOpen = null) {
  const panel = document.getElementById('ai-panel');
  if (!panel) return;
  if (forceOpen === true) panel.classList.add('ai-open');
  else if (forceOpen === false) panel.classList.remove('ai-open');
  else panel.classList.toggle('ai-open');
}

async function aiSend() {
  const input = document.getElementById('ai-input');
  const chatBox = document.getElementById('ai-msgs'); // FIXED ID
  const text = input.value.trim();
  
  if (!text) return;
  if (APP.aiCount >= 10) return alert("Quota reached.");
  
  APP.aiCount++;
  chatBox.innerHTML += `<div class="ai-msg user"><div class="ai-bubble">${text}</div></div>`;
  input.value = '';

  const context = `Gigs: ${APP.gigs.slice(0,3).map(g => g.title).join(', ')}.`;
  const reply = await callClaude(text, AI_SYSTEM + " " + context);
  
  chatBox.innerHTML += `<div class="ai-msg assistant"><div class="ai-av">AI</div><div class="ai-bubble">${reply}</div></div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* ── UI Helpers ────────────────────────────────────────────── */

function show(id) { 
  const el = document.getElementById(id);
  if (el) el.style.display = (id === 'app-shell' ? 'flex' : 'block');
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

async function callClaude(userMsg, system) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userMsg, system: system }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || 'Offline...';
  } catch (e) {
    return "Connection error.";
  }
}

function paintSidebar() {
  const nameEl = document.getElementById('user-name-display');
  if (nameEl && APP.profile) nameEl.innerText = APP.profile.display_name;
}
