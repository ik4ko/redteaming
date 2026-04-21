
'use client';

import { useState, useEffect } from 'react';
import MissionControlSidebar from './MissionControlSidebar';

// ── Supabase client (loaded from window in browser) ──────────
const getDb = () => {
  if (typeof window === 'undefined') return null;
  return window.supabase?.createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// ── Tiny design tokens ────────────────────────────────────────
const T = {
  card:    'bg-slate-900/60 border border-slate-800 rounded-2xl',
  cardHov: 'bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors',
  badge:   (color) => `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold`,
  btn:     'px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95',
};

// ── Score ring visual ─────────────────────────────────────────
function ScoreRing({ value, label, color = '#e11d48' }) {
  const r = 22, c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="#1e293b" strokeWidth="5"/>
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={`${(pct/100)*c} ${c}`}
                strokeDashoffset={c * 0.25}
                strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
        <text x="30" y="34" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">{Math.round(pct)}%</text>
      </svg>
      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Gig card (freelancer view) ─────────────────────────────────
function GigCard({ gig, onApply, onReferralClick }) {
  const isExternal = gig.source_type !== 'internal';
  const payStr = gig.pay_min_usd && gig.pay_max_usd
    ? `$${gig.pay_min_usd}–$${gig.pay_max_usd}/${gig.pay_type === 'hourly' ? 'hr' : 'task'}`
    : 'Rate negotiable';

  const tierColor = {
    entry:        'bg-emerald-900/40 text-emerald-400 border-emerald-800/40',
    intermediate: 'bg-amber-900/40  text-amber-400  border-amber-800/40',
    expert:       'bg-red-900/40    text-red-400    border-red-800/40',
    elite:        'bg-purple-900/40 text-purple-400 border-purple-800/40',
  }[gig.skill_level] || 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <div className={`${T.cardHov} p-5 flex flex-col gap-3`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isExternal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-900/30
                               border border-blue-700/40 rounded-md text-[10px] font-bold
                               text-blue-400 tracking-wide flex-shrink-0">
                ↗ PARTNER SITE
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 border rounded-md text-[10px] font-bold tracking-wide ${tierColor} flex-shrink-0`}>
              {gig.skill_level?.toUpperCase()}
            </span>
          </div>
          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">
            {gig.title}
          </h3>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-emerald-400 font-bold text-sm font-mono">{payStr}</div>
          {gig.external_source && (
            <div className="text-[10px] text-slate-500 mt-0.5">{gig.external_source}</div>
          )}
        </div>
      </div>

      {/* Tags */}
      {gig.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {gig.tags.slice(0, 4).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-slate-800 border border-slate-700
                                       rounded-md text-[10px] text-slate-400">
              {tag}
            </span>
          ))}
          {gig.tags.length > 4 && (
            <span className="px-2 py-0.5 text-[10px] text-slate-600">+{gig.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
        <div className="flex items-center gap-3 text-[10px] text-slate-600">
          <span>{gig.apply_count || 0} applicants</span>
          {gig.deadline && <span>Due {new Date(gig.deadline).toLocaleDateString()}</span>}
        </div>
        {isExternal ? (
          <a href={gig.external_url} target="_blank" rel="noopener"
             onClick={() => onReferralClick?.(gig)}
             className={`${T.btn} bg-blue-600 hover:bg-blue-500 text-white text-xs`}>
            Apply on Partner ↗
          </a>
        ) : (
          <button onClick={() => onApply?.(gig)}
                  className={`${T.btn} bg-red-600 hover:bg-red-500 text-white text-xs`}>
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
}

// ── Post Gig form (company view) ──────────────────────────────
function PostGigForm({ onSuccess }) {
  const [form, setForm]       = useState({ title: '', description: '', pay_min: '', pay_max: '', pay_type: 'per_task', skill_level: 'intermediate' });
  const [tags, setTags]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGen]  = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Auto-generate tags via Claude API
  const generateTags = async () => {
    if (!form.title && !form.description) return;
    setGen(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          system: 'You are a tag generator for an AI cybersecurity job board. Return ONLY a JSON array of 4-7 concise skill/topic tags. No explanation. Example: ["LLM Red Teaming","Prompt Injection","Expert","Web3"]',
          messages: [{ role: 'user', content: `Generate tags for this gig:\nTitle: ${form.title}\nDescription: ${form.description}` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === 'text')?.text || '[]';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      if (Array.isArray(parsed)) setTags(parsed);
    } catch (e) {
      setTags(['LLM Red Teaming', 'AI Safety', form.skill_level]);
    } finally {
      setGen(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const db = getDb();
    if (!db) { setLoading(false); return; }
    try {
      const { error } = await db.from('gigs').insert({
        source_type:  'internal',
        status:       'active',
        title:        form.title,
        description:  form.description,
        tags:         tags,
        skill_level:  form.skill_level,
        pay_min_usd:  parseFloat(form.pay_min) || null,
        pay_max_usd:  parseFloat(form.pay_max) || null,
        pay_type:     form.pay_type,
      });
      if (error) throw error;
      onSuccess?.();
      setForm({ title: '', description: '', pay_min: '', pay_max: '', pay_type: 'per_task', skill_level: 'intermediate' });
      setTags([]);
    } catch (err) {
      console.error('Post gig error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${T.card} p-6 space-y-4`}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-white">Post New Gig</h3>
        <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">Internal listing</span>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Gig Title *</label>
        <input type="text" required value={form.title} onChange={e => set('title', e.target.value)}
               placeholder="e.g. Agentic red team for Claude-powered product"
               className="w-full bg-slate-800 border border-slate-700 focus:border-red-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder-slate-600"/>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Description *</label>
        <textarea required value={form.description} onChange={e => set('description', e.target.value)} rows={4}
                  placeholder="Describe scope, deliverables, rules of engagement..."
                  className="w-full bg-slate-800 border border-slate-700 focus:border-red-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder-slate-600 resize-none"/>
      </div>

      {/* AI tag generator */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tags</label>
          <button type="button" onClick={generateTags} disabled={genLoading || (!form.title && !form.description)}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 disabled:text-slate-600
                             flex items-center gap-1 transition-colors">
            {genLoading
              ? <><span className="w-2.5 h-2.5 border border-red-400 border-t-transparent rounded-full animate-spin"/><span>Generating…</span></>
              : <><span>✦</span><span>AI Generate Tags</span></>
            }
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
          {tags.length === 0
            ? <span className="text-xs text-slate-600 italic">Click "AI Generate Tags" after filling title/description</span>
            : tags.map((t, i) => (
                <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-red-900/30 border border-red-700/40 rounded-lg text-xs text-red-300">
                  {t}
                  <button type="button" onClick={() => setTags(ts => ts.filter((_,j) => j!==i))}
                          className="text-red-600 hover:text-red-400 ml-0.5 leading-none">×</button>
                </span>
              ))
          }
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Pay Min (USD)</label>
          <input type="number" value={form.pay_min} onChange={e => set('pay_min', e.target.value)}
                 placeholder="50" className="w-full bg-slate-800 border border-slate-700 focus:border-red-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder-slate-600"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Pay Max (USD)</label>
          <input type="number" value={form.pay_max} onChange={e => set('pay_max', e.target.value)}
                 placeholder="200" className="w-full bg-slate-800 border border-slate-700 focus:border-red-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder-slate-600"/>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Pay Type</label>
          <select value={form.pay_type} onChange={e => set('pay_type', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-red-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none">
            <option value="per_task">Per Task</option>
            <option value="hourly">Hourly</option>
            <option value="fixed">Fixed Price</option>
            <option value="bounty">Bounty</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Skill Level</label>
          <select value={form.skill_level} onChange={e => set('skill_level', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-red-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none">
            <option value="entry">Entry</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
            <option value="elite">Elite</option>
          </select>
        </div>
      </div>

      <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600
                         text-white font-bold rounded-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2">
        {loading
          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Posting…</span></>
          : <><span>✦</span><span>Post Gig</span></>
        }
      </button>
    </form>
  );
}

// ── Company applicant row ──────────────────────────────────────
function ApplicantRow({ app }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-800 last:border-0">
      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
        {app.profile?.display_name?.slice(0,2).toUpperCase() || '??'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate">{app.profile?.display_name || 'Anonymous'}</div>
        <div className="text-xs text-slate-500 truncate">{app.profile?.skill_level} · {app.profile?.verified_skills?.slice(0,2).join(', ')}</div>
      </div>
      {app.ai_fit_score != null && (
        <div className="flex-shrink-0 text-center">
          <div className="text-sm font-bold text-emerald-400">{Math.round(app.ai_fit_score)}%</div>
          <div className="text-[10px] text-slate-600">AI fit</div>
        </div>
      )}
      <span className={`flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold
        ${ app.status === 'pending'     ? 'bg-slate-800 text-slate-400'
         : app.status === 'shortlisted' ? 'bg-emerald-900/40 text-emerald-400'
         : app.status === 'hired'       ? 'bg-blue-900/40 text-blue-400'
         :                                'bg-red-900/40 text-red-400'
        }`}>
        {app.status?.toUpperCase()}
      </span>
    </div>
  );
}

// ── MAIN DASHBOARD COMPONENT ──────────────────────────────────
export default function Dashboard({ initialProfile = null, initialGigs = [] }) {
  const [profile,      setProfile]      = useState(initialProfile);
  const [role,         setRole]         = useState(initialProfile?.role || 'red_teamer');
  const [gigs,         setGigs]         = useState(initialGigs);
  const [myGigs,       setMyGigs]       = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab,    setActiveTab]    = useState('hub');
  const [loading,      setLoading]      = useState(!initialProfile);
  const [filter,       setFilter]       = useState('all');
  const [postSuccess,  setPostSuccess]  = useState(false);

  // Load data
  useEffect(() => {
    const db = getDb();
    if (!db) return;

    (async () => {
      setLoading(true);
      try {
        // Profile
        const { data: { user } } = await db.auth.getUser();
        if (user) {
          const { data: p } = await db.from('profiles').select('*').eq('id', user.id).single();
          if (p) { setProfile(p); setRole(p.role); }
        }

        // Gigs
        const { data: g } = await db.from('gigs').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(20);
        if (g) setGigs(g);

        // Company: my posted gigs + applicants
        if (role === 'company_client' && user) {
          const { data: mg } = await db.from('gigs').select('*').eq('posted_by', user.id).order('created_at', { ascending: false });
          if (mg) setMyGigs(mg);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [role]);

  const handleReferralClick = async (gig) => {
    const db = getDb();
    if (!db) return;
    await db.from('referral_tracking').insert({
      gig_id:       gig.id,
      external_url: gig.external_url,
      partner_name: gig.external_source,
      session_id:   sessionStorage.getItem('rtg_session') || crypto.randomUUID(),
    });
  };

  const filteredGigs = gigs.filter(g => {
    if (filter === 'internal') return g.source_type === 'internal';
    if (filter === 'external') return g.source_type !== 'internal';
    return true;
  });

  const tabs = role === 'red_teamer'
    ? [
        { id: 'hub',      label: '⚡ Mission Hub',      count: filteredGigs.length },
        { id: 'applied',  label: '📋 My Applications',  count: applications.length },
        { id: 'profile',  label: '🛡 My Profile',       count: null },
      ]
    : [
        { id: 'hub',      label: '📊 Overview',         count: null },
        { id: 'post',     label: '✦ Post a Gig',        count: null },
        { id: 'mygigs',   label: '🗂 My Gigs',          count: myGigs.length },
        { id: 'profile',  label: '🏢 Company Profile',  count: null },
      ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"/>
          <p className="text-slate-500 text-sm">Loading mission data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">

      {/* Top nav */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">RT</div>
            <span className="font-bold text-white tracking-tight">redteamgig</span>
            <span className="text-slate-700">/</span>
            <span className="text-slate-400 text-sm">Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Role badge */}
            <span className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wide
              ${role === 'red_teamer'
                ? 'bg-red-900/40 border border-red-700/40 text-red-400'
                : 'bg-blue-900/40 border border-blue-700/40 text-blue-400'}`}>
              {role === 'red_teamer' ? '🛡 RED TEAMER' : '🏢 COMPANY'}
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-white">
              {profile?.display_name?.slice(0,2).toUpperCase() || 'ME'}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left sidebar ── */}
          <aside className="lg:w-56 flex-shrink-0">
            {/* Profile mini card */}
            <div className={`${T.card} p-4 mb-4`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-800 to-slate-700
                                flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {profile?.display_name?.slice(0,2).toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm truncate">{profile?.display_name || 'Your Name'}</div>
                  <div className="text-[10px] text-slate-500 truncate">{profile?.location || 'Location'}</div>
                </div>
              </div>

              {role === 'red_teamer' && (
                <div className="flex justify-around border-t border-slate-800 pt-3">
                  <ScoreRing value={profile?.reliability_score} label="Rely" color="#10b981"/>
                  <ScoreRing value={profile?.efficiency_score}  label="Effic" color="#e11d48"/>
                </div>
              )}

              {role === 'company_client' && (
                <div className="border-t border-slate-800 pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Gigs posted</span>
                    <span className="text-white font-semibold">{profile?.total_gigs_posted || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total spent</span>
                    <span className="text-emerald-400 font-semibold">${profile?.total_spent_usd || 0}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Nav tabs */}
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm
                                    font-medium transition-colors text-left
                          ${activeTab === tab.id
                            ? 'bg-red-600/20 border border-red-600/40 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                  <span>{tab.label}</span>
                  {tab.count != null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold
                      ${activeTab === tab.id ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Quick stats */}
            <div className={`${T.card} p-4 mt-4`}>
              <div className="text-[10px] font-bold text-slate-600 tracking-widest mb-3 uppercase">Market</div>
              <div className="space-y-2">
                {[
                  { label: 'Active gigs',    val: gigs.length,               color: 'text-white' },
                  { label: 'Internal',       val: gigs.filter(g=>g.source_type==='internal').length, color: 'text-red-400' },
                  { label: 'Partner sites',  val: gigs.filter(g=>g.source_type!=='internal').length, color: 'text-blue-400' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between text-xs">
                    <span className="text-slate-500">{s.label}</span>
                    <span className={`font-bold ${s.color}`}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0">

            {/* ── RED TEAMER: Mission Hub ── */}
            {role === 'red_teamer' && activeTab === 'hub' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h1 className="text-xl font-bold text-white">Mission Hub</h1>
                    <p className="text-sm text-slate-500">Internal postings + partner aggregations</p>
                  </div>
                  {/* Filter pills */}
                  <div className="flex gap-1.5">
                    {[
                      { id: 'all',      label: 'All' },
                      { id: 'internal', label: 'Internal' },
                      { id: 'external', label: 'Partner ↗' },
                    ].map(f => (
                      <button key={f.id} onClick={() => setFilter(f.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                                ${filter === f.id
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredGigs.length === 0 ? (
                  <div className="text-center py-16 text-slate-600">
                    <div className="text-4xl mb-3">🎯</div>
                    <p>No gigs match your filter. Check back soon.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {filteredGigs.map(gig => (
                      <GigCard key={gig.id} gig={gig}
                               onApply={g => console.log('Apply to', g.id)}
                               onReferralClick={handleReferralClick}/>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── RED TEAMER: Applications ── */}
            {role === 'red_teamer' && activeTab === 'applied' && (
              <div>
                <h1 className="text-xl font-bold text-white mb-5">My Applications</h1>
                {applications.length === 0
                  ? <div className="text-center py-16 text-slate-600"><div className="text-4xl mb-3">📋</div><p>No applications yet. Start applying from the Mission Hub.</p></div>
                  : applications.map(app => <ApplicantRow key={app.id} app={app}/>)
                }
              </div>
            )}

            {/* ── COMPANY: Overview ── */}
            {role === 'company_client' && activeTab === 'hub' && (
              <div>
                <h1 className="text-xl font-bold text-white mb-5">Company Overview</h1>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Active Gigs',    val: myGigs.filter(g=>g.status==='active').length,  color: 'text-white' },
                    { label: 'Total Applicants',val: applications.length, color: 'text-emerald-400' },
                    { label: 'Total Spent',    val: `$${profile?.total_spent_usd||0}`, color: 'text-blue-400' },
                  ].map(s => (
                    <div key={s.label} className={`${T.card} p-4 text-center`}>
                      <div className={`text-2xl font-bold ${s.color} mb-1`}>{s.val}</div>
                      <div className="text-xs text-slate-500">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className={`${T.card} p-4`}>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recent applicants</div>
                  {applications.length === 0
                    ? <p className="text-sm text-slate-600 py-4 text-center">Post a gig to start receiving applications.</p>
                    : applications.slice(0,5).map(a => <ApplicantRow key={a.id} app={a}/>)
                  }
                </div>
              </div>
            )}

            {/* ── COMPANY: Post Gig ── */}
            {role === 'company_client' && activeTab === 'post' && (
              <div className="max-w-xl">
                {postSuccess && (
                  <div className="mb-4 px-4 py-3 bg-emerald-900/30 border border-emerald-700/40 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                    ✅ Gig posted successfully! It's now live in the marketplace.
                    <button onClick={() => setPostSuccess(false)} className="ml-auto text-emerald-600 hover:text-emerald-400">✕</button>
                  </div>
                )}
                <PostGigForm onSuccess={() => { setPostSuccess(true); setActiveTab('mygigs'); }} />
              </div>
            )}

            {/* ── COMPANY: My Gigs ── */}
            {role === 'company_client' && activeTab === 'mygigs' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h1 className="text-xl font-bold text-white">My Gigs</h1>
                  <button onClick={() => setActiveTab('post')}
                          className={`${T.btn} bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5`}>
                    <span>✦</span><span>Post New Gig</span>
                  </button>
                </div>
                {myGigs.length === 0
                  ? <div className="text-center py-16 text-slate-600"><div className="text-4xl mb-3">🗂</div><p>No gigs posted yet.</p></div>
                  : (
                    <div className="space-y-3">
                      {myGigs.map(gig => (
                        <div key={gig.id} className={`${T.card} p-4 flex items-center gap-4`}>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white text-sm truncate">{gig.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{gig.apply_count || 0} applicants · {gig.view_count || 0} views</div>
                          </div>
                          <span className={`flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold
                            ${gig.status === 'active' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                            {gig.status?.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}

            {/* ── PROFILE tab (both roles) ── */}
            {activeTab === 'profile' && (
              <div className="max-w-xl">
                <h1 className="text-xl font-bold text-white mb-5">
                  {role === 'red_teamer' ? 'My Profile' : 'Company Profile'}
                </h1>
                <div className={`${T.card} p-6 space-y-4`}>
                  <p className="text-sm text-slate-500">Profile editing coming in Phase 2. Your profile is already visible in the directory.</p>
                  {profile && (
                    <div className="space-y-2 text-sm">
                      {Object.entries({
                        'Display name': profile.display_name,
                        'Role':         profile.role,
                        'Location':     profile.location || '—',
                        'Verified':     profile.is_verified ? '✅ Yes' : '⏳ Pending',
                        'NDA ready':    profile.is_nda_ready ? '✅ Yes' : 'No',
                        ...(role === 'red_teamer' ? {
                          'Skill level':  profile.skill_level,
                          'GitHub':       profile.github_url || '—',
                          'Total tasks':  profile.total_tasks_done,
                        } : {
                          'Company':      profile.company_name || '—',
                          'Website':      profile.company_website || '—',
                        }),
                      }).map(([k, v]) => (
                        <div key={k} className="flex justify-between py-2 border-b border-slate-800">
                          <span className="text-slate-500">{k}</span>
                          <span className="text-white font-medium">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* ── Mission Control AI Sidebar (persistent) ── */}
      <MissionControlSidebar userRole={role} />
    </div>
  );
}
