/* ============================================================
   RedTeamGig — script.js
   Gatekeeper: session check → role → render. No loops.
   ============================================================ */

const SUPA_URL = 'https://cnhmfxwyqtpbmjadlwty.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaG1meHd5cXRwYm1qYWRsd3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzA1NTksImV4cCI6MjA5MjEwNjU1OX0.bTTVehjz_LQLoTd0xW-FMqLdrB7nnKUlU163vLWcdrA';
const db = window.supabase.createClient(SUPA_URL, SUPA_KEY);

/* ── AI system prompt — strictly scoped ─────────────────────── */
const AI_SYSTEM = `You are Mission Control, the AI assistant inside RedTeamGig — a members-only AI safety talent marketplace.

Answer ONLY questions about:
- RedTeamGig platform usage (profiles, gigs, applications, scores, dashboard)
- AI red teaming: jailbreaking, prompt injection, bias auditing, agentic attacks, RAG exploitation, data poisoning
- Bug bounty scope evaluation, rules of engagement, payout structure
- Cover note and application advice for red teaming gigs
- Market rates and career advice for AI safety professionals
- Partner platforms: Mercor, Scale AI, Surge AI, Appen, Immunefi, HackerOne, Bugcrowd

For ANYTHING else reply: "I'm scoped to RedTeamGig and AI safety topics only."

Be concise, technically credible. End every answer with one actionable next step.`;

/* ── App state ──────────────────────────────────────────────── */
const APP = {
  user:         null,
  profile:      null,
  role:         null,
  gigs:         [],
  talent:       [],
  applications: [],
  filter:       'all',
  applyId:      null,
  applyTitle:   null,
  applyExtUrl:  null,
  aiOpen:       false,
  initialized:  false,   // ← prevents double-init
};

/* ══════════════════════════════════════════════════════════════
   BOOT — single entry point, no recursive calls
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', boot);

async function boot() {
  if (APP.initialized) return;
  APP.initialized = true;

  /* 1. Session check — getSession() is synchronous-ish, no listener needed */
  const { data: { session }, error: sessErr } = await db.auth.getSession();

  if (sessErr || !session?.user) {
    /* Not logged in → go to landing. Only redirect FROM app pages. */
    const onApp = window.location.pathname.includes('app');
    if (onApp) window.location.replace('/index.html');
    return;
  }

  APP.user = session.user;

  /* 2. Load profile once */
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', APP.user.id)
    .single();

  if (!profile) {
    /* Profile missing — create minimal record then reload once */
    const meta = APP.user.user_metadata || {};
    await db.from('profiles').upsert({
      id:           APP.user.id,
      display_name: meta.display_name || APP.user.email?.split('@')[0] || 'User',
      role:         meta.role         || 'red_teamer',
    });
    /* Hard reload once to re-run boot with the new profile */
    window.location.reload();
    return;
  }

  APP.profile = profile;
  APP.role    = profile.role || 'red_teamer';   // 'red_teamer' | 'company_client' | 'admin'

  /* 3. Render — never redirect, just show/hide */
  hide('loading-screen');
  show('app-shell');
  paintSidebar();

  if (APP.role === 'company_client' || APP.role === 'admin') {
    show('company-view');
    initCompany();
  } else {
    show('freelancer-view');
    initFreelancer();
  }

  /* 4. AI panel — freelancers only */
  if (APP.role === 'red_teamer') show('ai-panel');

  /* 5. Sign-out listener — only auth state change we care about */
  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.replace('/index.html');
  });
}

/* ══════════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════════ */
function paintSidebar() {
  const p = APP.profile;
  const initials = (p.display_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  setText('sb-initials',  initials);
  setText('sb-name',      p.display_name || 'User');
  setText('sb-role-lbl',  APP.role === 'red_teamer' ? 'Red Teamer' : 'Company');
  setText('sb-rely',      p.reliability_score ? Math.round(p.reliability_score) + '%' : '—');
  setText('sb-effic',     p.efficiency_score  ? Math.round(p.efficiency_score)  + '%' : '—');

  /* Show score chips only for freelancers */
  if (APP.role !== 'red_teamer') hide('sb-scores');
}

/* ══════════════════════════════════════════════════════════════
   FREELANCER
══════════════════════════════════════════════════════════════ */
async function initFreelancer() {
  showFreelancerView('hub');
  await Promise.all([loadGigs(), loadMyApplications()]);
}

function showFreelancerView(view) {
  /* Hide all sub-views */
  ['hub', 'applications', 'fl-profile', 'resources'].forEach(v => hide('fl-' + v));

  /* Activate nav */
  document.querySelectorAll('[data-fl-nav]').forEach(el => el.classList.remove('nav-active'));
  const navEl = document.querySelector(`[data-fl-nav="${view}"]`);
  if (navEl) navEl.classList.add('nav-active');

  /* Show target */
  show('fl-' + view);
  setText('topbar-title', {
    hub: 'Mission Hub', applications: 'My Applications',
    'fl-profile': 'My Profile', resources: 'Resources',
  }[view] || 'Dashboard');

  /* Show/hide search row */
  view === 'hub' ? show('hub-controls') : hide('hub-controls');
}

/* ── Load gigs from both tables ─────────────────────────────── */
async function loadGigs() {
  showSkeleton('gig-grid', 4, 'gig-skel');

  const [mRes, eRes] = await Promise.all([
    db.from('mercor_jobs').select('*').order('created_at', { ascending: false }),
    db.from('external_gigs').select('*').order('created_at', { ascending: false }),
  ]);

  const mercor   = (mRes.data || []).map(g => ({ ...g, _origin: 'mercor',   _ext: true,  source: g.source || 'Mercor' }));
  const external = (eRes.data || []).map(g => ({ ...g, _origin: 'external', _ext: true,  source: g.external_source || g.source || 'Partner' }));

  APP.gigs = [...mercor, ...external];
  if (APP.gigs.length === 0) APP.gigs = demoGigs();

  renderGigs(APP.gigs);
  renderStats();
}

function renderStats() {
  const total   = APP.gigs.length;
  const matches = APP.gigs.filter(g => fitScore(g) >= 65).length;
  const topPay  = Math.max(...APP.gigs.map(g => g.pay_max_usd || g.hourly_max || g.rate_max || 0));
  setText('stat-total',   total);
  setText('stat-matched', matches);
  setText('stat-top-pay', '$' + (topPay || 80) + '+');
  setText('stat-apps',    APP.applications.length);
}

function renderGigs(gigs) {
  const grid = qs('#gig-grid');
  if (!grid) return;
  setText('gig-count-lbl', `${gigs.length} opportunit${gigs.length !== 1 ? 'ies' : 'y'}`);
  setBadge('nav-hub-badge', gigs.length);

  if (!gigs.length) {
    grid.innerHTML = emptyState('🔍', 'No gigs match', 'Try adjusting your search or filters.');
    return;
  }

  grid.innerHTML = gigs.map(g => {
    const pay      = formatPay(g);
    const tags     = parseTags(g);
    const fit      = fitScore(g);
    const fitClr   = fit >= 75 ? '#16c979' : fit >= 50 ? '#f0a000' : '#e8382f';
    const tier     = g.skill_level || g.difficulty || 'intermediate';
    const srcLabel = g.source || g._origin || 'Partner';
    const srcIcon  = { Mercor: 'M', 'Scale AI': 'S', 'Surge AI': '⚡', Appen: 'A', Anthropic: 'An' }[srcLabel] || '⬡';
    const extUrl   = g.referral_url || g.apply_url || g.external_url || '';

    return `
    <div class="gig-card" onclick="handleGigClick('${esc(g.id)}','${esc(g.title || '')}','${!!extUrl}','${esc(extUrl)}')">
      <div class="gig-head">
        <div class="gig-icon">${srcIcon}</div>
        <div class="gig-head-text">
          <div class="gig-badges">
            ${g._ext ? `<span class="badge badge-blue">↗ Partner</span>` : `<span class="badge badge-green">Internal</span>`}
            <span class="badge ${tierBadge(tier)}">${tier}</span>
          </div>
          <div class="gig-title">${esc(g.title || 'Untitled')}</div>
        </div>
      </div>
      <div class="gig-pay-row">
        <span class="gig-pay">${pay}</span>
        <span class="gig-source">${esc(srcLabel)}</span>
      </div>
      ${tags.length ? `<div class="gig-tags">${tags.slice(0,4).map(t => `<span class="gig-tag">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="gig-foot">
        <div class="gig-meta">${g.apply_count || 0} applied</div>
        <div class="fit-row">
          <span class="fit-label">Fit</span>
          <div class="fit-track"><div class="fit-fill" style="width:${fit}%;background:${fitClr};"></div></div>
          <span class="fit-pct" style="color:${fitClr};">${fit}%</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function handleGigClick(id, title, isExt, extUrl) {
  if (isExt === 'true' && extUrl) {
    recordClick(id, extUrl);
    window.open(extUrl, '_blank');
    return;
  }
  openApplyModal(id, title, false, '');
}

/* ── Gig filter / search ────────────────────────────────────── */
function setFilter(f) {
  APP.filter = f;
  document.querySelectorAll('[data-filter]').forEach(el => {
    el.classList.toggle('filter-active', el.dataset.filter === f);
  });
  applySearch();
}

function applySearch() {
  const q = (qs('#gig-search')?.value || '').toLowerCase();
  const filtered = APP.gigs.filter(g => {
    const isExt   = g._ext;
    const srcOk   = APP.filter === 'all' ||
      (APP.filter === 'internal' && !isExt) ||
      (APP.filter === 'partner'  && isExt);
    const text    = (g.title + ' ' + parseTags(g).join(' ')).toLowerCase();
    return srcOk && (!q || text.includes(q));
  });
  renderGigs(filtered);
}

/* ── Applications ───────────────────────────────────────────── */
async function loadMyApplications() {
  const { data } = await db
    .from('gig_applications')
    .select('*')
    .eq('applicant_id', APP.user.id)
    .order('created_at', { ascending: false });
  APP.applications = data || [];
  setBadge('nav-apps-badge', APP.applications.length);
  renderApplicationsTable();
}

function renderApplicationsTable() {
  const tbody = qs('#apps-tbody');
  if (!tbody) return;
  if (!APP.applications.length) {
    tbody.innerHTML = `<tr><td colspan="5">${emptyState('📋', 'No applications yet', 'Apply to gigs from the Mission Hub.')}</td></tr>`;
    return;
  }
  const STATUS_CLASS = { pending: 'badge-dim', shortlisted: 'badge-green', hired: 'badge-blue', rejected: 'badge-red', withdrawn: 'badge-dim' };
  tbody.innerHTML = APP.applications.map(a => `
    <tr>
      <td class="td-title">${esc(a.gig_title || a.gig_id || '—')}</td>
      <td><span class="badge badge-dim">${esc(a.source || 'Internal')}</span></td>
      <td class="td-mono">${new Date(a.created_at).toLocaleDateString()}</td>
      <td class="td-pay">${a.proposed_rate ? '$' + a.proposed_rate : '—'}</td>
      <td><span class="badge ${STATUS_CLASS[a.status] || 'badge-dim'}">${a.status || 'pending'}</span></td>
    </tr>`
  ).join('');
}

/* ── Profile save ───────────────────────────────────────────── */
async function saveProfile() {
  const payload = {
    display_name:   val('p-name'),
    location:       val('p-loc'),
    bio:            val('p-bio'),
    github_url:     val('p-github'),
    portfolio_url:  val('p-portfolio'),
    hourly_rate_min:parseFloat(val('p-rmin')) || null,
    hourly_rate_max:parseFloat(val('p-rmax')) || null,
    is_nda_ready:   val('p-nda') === 'true',
  };
  const { error } = await db.from('profiles').update(payload).eq('id', APP.user.id);
  if (error) { toast('Save failed: ' + error.message, 'err'); return; }
  Object.assign(APP.profile, payload);
  toast('Profile saved ✓', 'ok');
  setText('sb-name', payload.display_name || APP.profile.display_name);
}

function populateProfileForm() {
  const p = APP.profile || {};
  setVal('p-name',      p.display_name || '');
  setVal('p-loc',       p.location     || '');
  setVal('p-bio',       p.bio          || '');
  setVal('p-github',    p.github_url   || '');
  setVal('p-portfolio', p.portfolio_url|| '');
  setVal('p-rmin',      p.hourly_rate_min || '');
  setVal('p-rmax',      p.hourly_rate_max || '');
  setVal('p-nda',       p.is_nda_ready ? 'true' : 'false');
}

/* ══════════════════════════════════════════════════════════════
   COMPANY
══════════════════════════════════════════════════════════════ */
async function initCompany() {
  showCompanyView('co-overview');
  await loadTalent();
}

function showCompanyView(view) {
  ['co-overview', 'co-talent', 'co-scout', 'co-analytics', 'co-post'].forEach(v => hide(v));
  document.querySelectorAll('[data-co-nav]').forEach(el => el.classList.remove('nav-active'));
  const navEl = document.querySelector(`[data-co-nav="${view}"]`);
  if (navEl) navEl.classList.add('nav-active');
  show(view);
  setText('topbar-title', {
    'co-overview': 'Overview', 'co-talent': 'Talent Pool',
    'co-scout': 'AI Scout', 'co-analytics': 'Analytics', 'co-post': 'Post a Gig',
  }[view] || 'Dashboard');
  if (view === 'co-talent' && !APP.talent.length) loadTalent();
  if (view === 'co-analytics') loadAnalytics();
}

/* ── Talent pool ─────────────────────────────────────────────── */
async function loadTalent() {
  const { data } = await db.from('talent_pool').select('*').order('created_at', { ascending: false });
  APP.talent = data || [];
  setBadge('nav-talent-badge', APP.talent.length);
  renderTalentTable(APP.talent);
  renderOverviewStats();
}

function renderOverviewStats() {
  setText('co-stat-talent',  APP.talent.length);
  const experts = APP.talent.filter(t => t.tier === 'expert').length;
  setText('co-stat-experts', experts);
}

function renderTalentTable(rows) {
  const tbody = qs('#talent-tbody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6">${emptyState('🛡', 'No talent registered yet', 'Share the link — red teamers register directly.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(t => `
    <tr>
      <td>
        <div class="talent-name-cell">
          <div class="t-av">${(t.full_name || '?').slice(0,2).toUpperCase()}</div>
          <div>
            <div class="td-title">${esc(t.full_name || 'Anonymous')}</div>
            <div class="td-mono" style="font-size:9px;">${esc(t.email || '')}</div>
          </div>
        </div>
      </td>
      <td class="td-mono">${esc(t.specialty || '—')}</td>
      <td><span class="badge ${tierBadge(t.tier)}">${t.tier || 'entry'}</span></td>
      <td>${t.github ? `<a href="${esc(t.github)}" target="_blank" class="link-blue">GitHub ↗</a>` : '<span class="td-muted">—</span>'}</td>
      <td class="td-mono">${new Date(t.created_at).toLocaleDateString()}</td>
      <td>
        <button class="btn-sm btn-ghost" onclick="quickScout('${esc(t.full_name||'')}','${esc(t.specialty||'')}')">Scout</button>
      </td>
    </tr>`
  ).join('');
}

function filterTalent() {
  const q    = (val('talent-search') || '').toLowerCase();
  const tier = val('talent-tier-filter') || '';
  const rows = APP.talent.filter(t => {
    const matchQ = !q || (t.full_name||'').toLowerCase().includes(q) || (t.specialty||'').toLowerCase().includes(q);
    const matchT = !tier || t.tier === tier;
    return matchQ && matchT;
  });
  renderTalentTable(rows);
}

/* ── AI Scout ───────────────────────────────────────────────── */
async function runScout() {
  const query = val('scout-query');
  if (!query?.trim()) { toast('Describe what you need first.', 'err'); return; }

  const resultEl = qs('#scout-result');
  setLoading('scout-btn', 'scout-spin', true);
  if (resultEl) resultEl.innerHTML = '<div class="skel" style="height:100px;border-radius:8px;"></div>';

  const summary = APP.talent
    .slice(0, 25)
    .map(t => `- ${t.full_name||'?'} | ${t.specialty||'?'} | ${t.tier||'?'} | github:${t.github||'none'}`)
    .join('\n') || 'No talent registered yet.';

  const prompt = `You are a talent scout for an AI safety marketplace. A company needs:\n\n"${query}"\n\nAvailable red teamers:\n${summary}\n\nReturn ONLY valid JSON (no markdown):\n{"matches":[{"name":"...","reason":"..."}],"criteria":["..."],"recommendation":"...","missing_skills":["..."]}`;

  try {
    const res  = await callClaude(prompt, 'Return only valid JSON, no markdown.', 800);
    const text = res.replace(/```json|```/g, '').trim();
    const data = JSON.parse(text);
    if (resultEl) resultEl.innerHTML = renderScoutResult(data);
  } catch(e) {
    if (resultEl) resultEl.innerHTML = `<div class="scout-error">Scout error — check API config.</div>`;
  } finally {
    setLoading('scout-btn', 'scout-spin', false);
  }
}

function renderScoutResult(d) {
  return `
  <div class="scout-result">
    <div class="scout-section-lbl">Top Matches</div>
    ${(d.matches||[]).map(m=>`
      <div class="scout-match">
        <span class="scout-check">✓</span>
        <span><strong>${esc(m.name)}</strong> — ${esc(m.reason)}</span>
      </div>`).join('')}
    ${d.criteria?.length ? `
      <div class="scout-section-lbl" style="margin-top:12px;">Key Requirements</div>
      <div class="tag-row">${d.criteria.map(c=>`<span class="badge badge-dim">${esc(c)}</span>`).join('')}</div>` : ''}
    ${d.recommendation ? `
      <div class="scout-rec">${esc(d.recommendation)}</div>` : ''}
    ${d.missing_skills?.length ? `
      <div class="scout-missing">Skills not in pool: ${d.missing_skills.join(', ')}</div>` : ''}
  </div>`;
}

function quickScout(name, specialty) {
  setVal('scout-query', `I'm interested in ${name} who specializes in ${specialty}. Assess their fit and suggest 3 interview questions.`);
  showCompanyView('co-scout');
  setTimeout(runScout, 150);
}

/* ── Analytics ──────────────────────────────────────────────── */
async function loadAnalytics() {
  const rows  = APP.talent.length ? APP.talent : (await db.from('talent_pool').select('tier,specialty,created_at').then(r => r.data || []));
  const total = rows.length || 1;
  const byTier= { entry:0, intermediate:0, expert:0 };
  const bySpec= {};
  rows.forEach(r => {
    if (r.tier in byTier) byTier[r.tier]++;
    if (r.specialty) bySpec[r.specialty] = (bySpec[r.specialty]||0) + 1;
  });
  const topSpecs = Object.entries(bySpec).sort((a,b)=>b[1]-a[1]).slice(0,5);

  setText('an-total', rows.length);

  const tierEl = qs('#an-tier-bars');
  if (tierEl) tierEl.innerHTML = Object.entries(byTier).map(([k,v]) => `
    <div class="a-bar-row">
      <span class="a-bar-lbl">${k}</span>
      <div class="a-bar-track"><div class="a-bar-fill" style="width:${Math.round((v/total)*100)}%"></div></div>
      <span>${v}</span>
    </div>`).join('');

  const specEl = qs('#an-spec-bars');
  if (specEl) specEl.innerHTML = topSpecs.length
    ? topSpecs.map(([k,v]) => `
      <div class="a-bar-row">
        <span class="a-bar-lbl" style="width:130px;">${esc(k)}</span>
        <div class="a-bar-track"><div class="a-bar-fill" style="width:${Math.round((v/total)*100)}%"></div></div>
        <span>${v}</span>
      </div>`).join('')
    : '<span class="td-muted">No data yet.</span>';
}

/* ── Post Gig ───────────────────────────────────────────────── */
let pendingTags = [];

async function generateTags() {
  const title = val('pg-title');
  const desc  = val('pg-desc');
  if (!title && !desc) { toast('Add title or description first.', 'err'); return; }
  setLoading('tag-btn', 'tag-spin', true);
  try {
    const raw    = await callClaude(`Title: ${title}\nDesc: ${desc}`, 'Return ONLY a JSON array of 4-6 concise AI red teaming skill tags. Example: ["Prompt Injection","Expert","Claude API"]. No markdown.', 150);
    pendingTags  = JSON.parse(raw.replace(/```json|```/g,'').trim());
  } catch { pendingTags = ['LLM Red Teaming','AI Safety']; }
  renderTagsUI();
  setLoading('tag-btn', 'tag-spin', false);
}

function removeTag(i) { pendingTags.splice(i,1); renderTagsUI(); }

function renderTagsUI() {
  const el = qs('#tags-box');
  if (!el) return;
  el.innerHTML = pendingTags.length
    ? pendingTags.map((t,i) => `<span class="tag-chip">${esc(t)}<button onclick="removeTag(${i})" class="tag-rm">×</button></span>`).join('')
    : '<span class="td-muted" style="font-size:10px;">Click "AI Generate" after filling title & description</span>';
}

async function postGig() {
  const title = val('pg-title');
  const desc  = val('pg-desc');
  if (!title || !desc) { toast('Title and description required.', 'err'); return; }
  setLoading('post-gig-btn','post-gig-spin',true);
  const { error } = await db.from('gigs').insert({
    source_type: 'internal', status: 'active',
    title, description: desc, tags: pendingTags,
    skill_level:  val('pg-tier'),
    pay_min_usd:  parseFloat(val('pg-pmin'))||null,
    pay_max_usd:  parseFloat(val('pg-pmax'))||null,
    pay_type:     val('pg-ptype'),
    posted_by:    APP.user.id,
  });
  setLoading('post-gig-btn','post-gig-spin',false);
  if (error) { toast('Post failed: ' + error.message, 'err'); return; }
  toast('Gig posted! Red teamers can now see it.', 'ok');
  pendingTags = [];
  renderTagsUI();
}

/* ══════════════════════════════════════════════════════════════
   APPLY MODAL
══════════════════════════════════════════════════════════════ */
function openApplyModal(id, title, isExt, extUrl) {
  APP.applyId     = id;
  APP.applyTitle  = title;
  APP.applyExtUrl = extUrl;
  setText('apply-gig-name', title);
  show('apply-modal');
}

function closeApplyModal() {
  hide('apply-modal');
  setVal('apply-cover', '');
  setVal('apply-rate',  '');
}

async function submitApply() {
  const cover = val('apply-cover');
  const rate  = parseFloat(val('apply-rate')) || null;
  if (!cover?.trim()) { toast('Please write a cover note.', 'err'); return; }

  setLoading('apply-btn','apply-spin',true);

  /* Write to gig_applications — this is the engagement tracking event */
  const { error } = await db.from('gig_applications').insert({
    gig_id:       APP.applyId,
    applicant_id: APP.user.id,
    cover_note:   cover,
    proposed_rate:rate,
    status:       'pending',
    gig_title:    APP.applyTitle,
    source:       APP.applyExtUrl ? 'partner' : 'internal',
  });

  setLoading('apply-btn','apply-spin',false);

  if (error && error.code !== '23505') {
    toast('Error: ' + error.message, 'err');
    return;
  }

  closeApplyModal();
  toast('Application submitted! 🎯', 'ok');
  APP.applications.unshift({ gig_id: APP.applyId, gig_title: APP.applyTitle, status:'pending', proposed_rate: rate, created_at: new Date().toISOString(), source: APP.applyExtUrl?'partner':'internal' });
  setBadge('nav-apps-badge', APP.applications.length);
  setText('stat-apps', APP.applications.length);
}

/* ── Track external referral clicks ─────────────────────────── */
async function recordClick(gigId, url) {
  await db.from('referral_tracking').insert({
    gig_id: gigId, user_id: APP.user?.id || null,
    external_url: url,
    session_id: (() => {
      let s = sessionStorage.getItem('rtg_sid');
      if (!s) { s = Math.random().toString(36).slice(2); sessionStorage.setItem('rtg_sid', s); }
      return s;
    })(),
  }).catch(() => {});
}

/* ══════════════════════════════════════════════════════════════
   AI MISSION CONTROL
══════════════════════════════════════════════════════════════ */
function toggleAI() {
  APP.aiOpen = !APP.aiOpen;
  qs('#ai-win')?.classList.toggle('open', APP.aiOpen);
  if (APP.aiOpen) setTimeout(() => qs('#ai-input')?.focus(), 80);
}

function aiAsk(prompt) {
  if (!APP.aiOpen) toggleAI();
  setVal('ai-input', prompt);
  sendAI();
}

function addAIMsg(role, content, loading = false) {
  const wrap = qs('#ai-msgs');
  if (!wrap) return null;
  const div  = document.createElement('div');
  div.className = `ai-msg ${role}`;
  if (loading) div.id = 'ai-loading';
  div.innerHTML = `
    <div class="ai-av">${role === 'user' ? 'YOU' : 'AI'}</div>
    <div class="ai-bubble">${loading ? '<span class="dots"><span>.</span><span>.</span><span>.</span></span>' : esc(content).replace(/\n/g,'<br>')}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

async function sendAI() {
  const input = qs('#ai-input');
  const text  = input?.value.trim();
  if (!text) return;
  input.value = '';
  hide('ai-suggs');
  addAIMsg('user', text);
  addAIMsg('assistant', '', true);
  qs('#ai-send').disabled = true;
  try {
    const reply = await callClaude(text, AI_SYSTEM, 600);
    qs('#ai-loading')?.remove();
    addAIMsg('assistant', reply);
  } catch(e) {
    qs('#ai-loading')?.remove();
    addAIMsg('assistant', '⚠ Connection error.');
  } finally {
    qs('#ai-send').disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════════ */
async function signOut() {
  await db.auth.signOut();
  /* onAuthStateChange handles the redirect */
}

/* ══════════════════════════════════════════════════════════════
   CLAUDE API
══════════════════════════════════════════════════════════════ */
async function callClaude(userMsg, system, maxTokens = 600) {
  const res  = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  const data = await res.json();
  return data.content?.find(b => b.type === 'text')?.text || '';
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
function qs(sel)          { return document.querySelector(sel); }
function show(id)         { const el = document.getElementById(id); if (el) el.style.display = ''; }
function hide(id)         { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
function setBadge(id, n)  { const el = document.getElementById(id); if (el) el.textContent = n; }
function val(id)          { return document.getElementById(id)?.value || ''; }
function setVal(id, v)    { const el = document.getElementById(id); if (el) el.value = v; }

function setLoading(btnId, spinId, on) {
  const btn  = document.getElementById(btnId);
  const spin = document.getElementById(spinId);
  if (btn)  btn.disabled     = on;
  if (spin) spin.style.display = on ? 'inline-block' : 'none';
}

function toast(msg, type = 'info') {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function showSkeleton(containerId, count, className) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array(count).fill(`<div class="${className} skel"></div>`).join('');
}

function emptyState(icon, title, sub) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><p>${sub}</p></div>`;
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function formatPay(g) {
  const mn = g.pay_min_usd || g.hourly_min || g.rate_min;
  const mx = g.pay_max_usd || g.hourly_max || g.rate_max;
  const pt = g.pay_type || 'hourly';
  if (!mn && !mx) return 'Rate TBD';
  const u = pt === 'hourly' ? '/hr' : pt === 'per_task' ? '/task' : '';
  if (mn && mx) return `$${mn}–$${mx}${u}`;
  return mx ? `Up to $${mx}${u}` : `$${mn}+${u}`;
}

function parseTags(g) {
  const raw = g.tags || g.skills || g.required_skills || g.category || '';
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return raw ? String(raw).split(',').map(s => s.trim()).filter(Boolean) : []; }
}

function fitScore(g) {
  const skills = APP.profile?.verified_skills || [];
  const tier   = APP.profile?.skill_level || 'entry';
  const tags   = parseTags(g);
  if (!skills.length || !tags.length) return 35 + Math.floor(Math.random() * 40);
  const hits   = tags.filter(t => skills.some(s => s.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(s.toLowerCase())));
  const base   = Math.round((hits.length / tags.length) * 65);
  const bonus  = g.skill_level === tier ? 15 : 0;
  return Math.min(99, base + bonus + 10);
}

function tierBadge(tier) {
  return { entry:'badge-green', intermediate:'badge-amber', expert:'badge-red', elite:'badge-red' }[tier] || 'badge-dim';
}

function demoGigs() {
  return [
    { id:'d1', _ext:true,  _origin:'mercor',   title:'AI Red Teamer — Adversarial Testing (EN/JP)',       tags:['Jailbreaking','Multilingual','Intermediate'], skill_level:'intermediate', pay_min_usd:20, pay_max_usd:50,  pay_type:'hourly', external_url:'https://work.mercor.com', source:'Mercor',   apply_count:14 },
    { id:'d2', _ext:false, _origin:'internal', title:'Prompt Injection Tester — Production LLM System',   tags:['Prompt Injection','Expert','Agentic'],         skill_level:'expert',        pay_min_usd:80, pay_max_usd:150, pay_type:'hourly', apply_count:3 },
    { id:'d3', _ext:true,  _origin:'external', title:'LLM Safety Evaluator — Bias & Harm Detection',      tags:['Bias Auditing','Entry','Content Safety'],       skill_level:'entry',         pay_min_usd:25, pay_max_usd:40,  pay_type:'hourly', external_url:'https://scale.com/jobs', source:'Scale AI', apply_count:28 },
    { id:'d4', _ext:false, _origin:'internal', title:'Claude Agentic Pipeline — Tool-Call Attack Testing', tags:['Agentic Systems','Expert','Claude API'],         skill_level:'expert',        pay_min_usd:100,pay_max_usd:180, pay_type:'hourly', apply_count:6 },
    { id:'d5', _ext:true,  _origin:'external', title:'RAG Pipeline Security Audit — Vector DB Poisoning',  tags:['RAG Exploitation','Data Poisoning','Expert'],    skill_level:'expert',        pay_min_usd:120,pay_max_usd:200, pay_type:'per_task',external_url:'https://surgehq.ai', source:'Surge AI',apply_count:2 },
    { id:'d6', _ext:true,  _origin:'mercor',   title:'Multi-turn Jailbreak Testing — GPT-4 & Claude 4',   tags:['Jailbreaking','Expert','Multi-turn'],            skill_level:'expert',        pay_min_usd:30, pay_max_usd:80,  pay_type:'hourly', external_url:'https://work.mercor.com',source:'Mercor',  apply_count:19 },
  ];
}
