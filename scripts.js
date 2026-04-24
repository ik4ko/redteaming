/* ============================================================
   RedTeamGig — script.js
   ============================================================ */

const SUPA_URL = 'https://cnhmfxwyqtpbmjadlwty.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaG1meHd5cXRwYm1qYWRsd3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzA1NTksImV4cCI6MjA5MjEwNjU1OX0.bTTVehjz_LQLoTd0xW-FMqLdrB7nnKUlU163vLWcdrA';
const db = window.supabase.createClient(SUPA_URL, SUPA_KEY);

const AI_SYSTEM = `You are Mission Control, the AI assistant inside RedTeamGig — a members-only AI safety talent marketplace. Answer ONLY platform questions.`;

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
    // Reveal UI
    const loadingScreen = document.getElementById('loading-screen') || document.querySelector('.circling-thing-container');
    if (loadingScreen) loadingScreen.style.display = 'none';
    show('app-shell');
    
    // Initial Render
    if (typeof paintSidebar === 'function') paintSidebar();

    if (APP.role === 'company_client' || APP.role === 'admin') {
      show('company-view');
      if (typeof initCompany === 'function') initCompany();
    } else {
      show('freelancer-view');
      initFreelancer(); // Defined below
      show('ai-panel');
    }
  }

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.replace('/index.html');
  });
}

/* ── Freelancer Hub Logic ──────────────────────────────────── */

async function initFreelancer() {
  show('fl-hub');
  
  const { data, error } = await db
    .from('external_gigs')
    .select('*')
    .order('posted_at', { ascending: false });

  if (error) {
    console.error("Error fetching gigs:", error);
    return;
  }

  APP.gigs = data;
  renderGigs(APP.gigs);
}

function renderGigs(list) {
  const grid = document.getElementById('gig-grid');
  const countLbl = document.getElementById('gig-count-lbl');
  if (!grid) return;

  grid.innerHTML = '';
  if (countLbl) countLbl.innerText = `${list.length} missions available`;

  if (list.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1; padding:40px; text-align:center; opacity:0.5;">No missions found. Check back later!</div>';
    return;
  }

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

/* ── UI Helpers ────────────────────────────────────────────── */

function show(id) { 
  const el = document.getElementById(id);
  if (el) el.style.display = (id === 'app-shell' ? 'flex' : 'block');
}

function hide(id) { 
  const el = document.getElementById(id);
  if (el) el.style.display = 'none'; 
}

// Add your paintSidebar, callClaude, and other functions below...
