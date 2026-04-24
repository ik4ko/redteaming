/* ============================================================
   RedTeamGig — script.js
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
    const loadingScreen = document.getElementById('loading-screen') || document.querySelector('.circling-thing-container');
    if (loadingScreen) loadingScreen.style.display = 'none';
    show('app-shell');
    
    paintSidebar();

    if (APP.role === 'company_client' || APP.role === 'admin') {
      show('company-view');
    } else {
      show('freelancer-view');
      showDashboard(); // Default view
      initFreelancer(); 
    }
  }

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.replace('/index.html');
  });
}

/* ── View Switching Logic ──────────────────────────────────── */

function showDashboard() {
  const hub = document.getElementById('fl-hub');
  const profView = document.getElementById('profile-edit-view');
  const title = document.getElementById('topbar-title');

  if (hub) hub.style.display = 'block';
  if (profView) profView.style.display = 'none';
  if (title) title.innerText = "Mission Hub";
}

function showProfile() {
  const hub = document.getElementById('fl-hub');
  const profView = document.getElementById('profile-edit-view');
  const title = document.getElementById('topbar-title');

  if (hub) hub.style.display = 'none';
  if (profView) profView.style.display = 'block';
  if (title) title.innerText = "Mission Profile";

  // Pre-fill data
  if (APP.profile) {
    if(document.getElementById('prof-github')) document.getElementById('prof-github').value = APP.profile.github_url || '';
    if(document.getElementById('prof-bio')) document.getElementById('prof-bio').value = APP.profile.bio || '';
    if(document.getElementById('prof-skills')) document.getElementById('prof-skills').value = APP.profile.skills?.join(', ') || '';
  }
}

/* ── Freelancer Hub Logic ──────────────────────────────────── */

async function initFreelancer() {
  const { data, error } = await db.from('external_gigs').select('*').order('posted_at', { ascending: false });
  if (error) return console.error("Gigs error:", error);

  APP.gigs = data;
  renderGigs(APP.gigs);
  
  // Update stats
  if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = data.length;
}

function renderGigs(list) {
  const grid = document.getElementById('gig-grid');
  const countLbl = document.getElementById('gig-count-lbl');
  if (!grid) return;

  grid.innerHTML = '';
  if (countLbl) countLbl.innerText = `${list.length} missions available`;

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
  const github = document.getElementById('prof-github')?.value;
  const bio = document.getElementById('prof-bio')?.value;
  const skills = document.getElementById('prof-skills')?.value;

  const { error } = await db.from('profiles').update({
    github_url: github,
    bio: bio,
    skills: skills ? skills.split(',').map(s => s.trim()) : [],
    updated_at: new Date()
  }).eq('id', APP.user.id);

  if (error) alert("Sync failed.");
  else {
    alert("Profile synced to Mission Control.");
    // Update local state
    APP.profile.github_url = github;
    APP.profile.bio = bio;
    APP.profile.skills = skills ? skills.split(',') : [];
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
  const chatBox = document.getElementById('ai-chat-box');
  const text = input.value.trim();
  if (!text) return;
  if (APP.aiCount >= 10) return alert("Mission Control quota reached.");
  if (text.length > 400) return alert("Message too long.");

  APP.aiCount++;
  chatBox.innerHTML += `<div class="msg msg-user">${text}</div>`;
  input.value = '';

  const context = `Context: Gigs: ${APP.gigs.slice(0,5).map(g => g.title).join(', ')}.`;
  const reply = await callClaude(text, AI_SYSTEM + " " + context);
  
  chatBox.innerHTML += `<div class="msg msg-ai">${reply}</div>`;
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
    return data.content?.[0]?.text || 'Connection lost...';
  } catch (e) {
    return "Mission Control offline.";
  }
}

function paintSidebar() {
  // Update user name in sidebar
  const nameEl = document.querySelector('.user-name');
  if (nameEl && APP.profile) nameEl.innerText = APP.profile.display_name;
}

async function signOut() {
  await db.auth.signOut();
}
