
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ── System prompt — strictly scoped to cybersecurity/AI safety work ──
const SYSTEM_PROMPT = `You are RedTeamGig's Mission Control AI — a specialized assistant embedded in a professional AI safety and cybersecurity marketplace.

YOUR STRICT SCOPE:
- AI/LLM red teaming: jailbreaking, prompt injection, bias auditing, agentic system attacks, RAG exploitation, data poisoning
- Cybersecurity: penetration testing, vulnerability research, CVE analysis, OWASP LLM Top 10, bug bounties
- Bounty scope analysis: help freelancers understand scope, rules of engagement, payout structures
- GitHub/portfolio analysis: help companies evaluate if a candidate's history matches their tech stack
- Gig/job matching: help users understand requirements, assess fit, write cover notes
- Industry context: Immunefi, Mercor, Scale AI, Surge AI, Appen, HackerOne, Bugcrowd, Anthropic, OpenAI

YOU MUST REFUSE (politely redirect):
- Personal advice, lifestyle, entertainment, general coding help unrelated to AI safety/cybersecurity
- Creative writing, math tutoring, cooking, anything outside the professional scope above
- Sharing personal opinions on politics, religion, or topics outside your scope

TONE: Professional, technical, efficient. You are a specialist tool, not a general assistant.
FORMAT: Use markdown. Be concise. For code, always use code blocks. For scope analysis, use structured bullet points.

When analyzing a JOB DESCRIPTION, extract: required skills, pay range, difficulty tier, red flags, fit assessment.
When analyzing a GITHUB PROFILE, look for: relevant repos, languages, security tools used, contribution frequency, relevant experience.`;

// ── Message types ─────────────────────────────────────────────
const SUGGESTIONS = {
  gig: [
    { icon: '🎯', label: 'Analyze this gig scope',    prompt: 'Analyze the scope, requirements, and red flags of this gig. Is it legitimate and well-scoped?' },
    { icon: '💰', label: 'Assess the pay rate',       prompt: 'Is the pay rate for this gig fair for the skill level required? Compare to industry standards.' },
    { icon: '✍️', label: 'Draft a cover note',        prompt: 'Help me write a professional cover note to apply for this gig. Keep it under 150 words, confident and specific.' },
    { icon: '🔍', label: 'What skills do I need?',   prompt: 'What specific technical skills, tools, and experience does this gig require? What should I study if I\'m missing any?' },
  ],
  candidate: [
    { icon: '🧬', label: 'Analyze GitHub fit',        prompt: 'Based on the GitHub profile shown, how well does this candidate match our tech stack and requirements?' },
    { icon: '⭐', label: 'Score this candidate',      prompt: 'Give this candidate a structured fit score (0-100) with breakdown by: skills match, experience level, reliability signals.' },
    { icon: '❓', label: 'Suggest interview Qs',      prompt: 'Suggest 5 technical interview questions specific to this candidate\'s background and our gig requirements.' },
    { icon: '⚠️', label: 'Identify gaps',             prompt: 'What skills or experience is this candidate missing for our requirements? What would close those gaps?' },
  ],
  general: [
    { icon: '📋', label: 'Explain OWASP LLM Top 10', prompt: 'Give me a quick reference guide to the OWASP LLM Top 10 vulnerabilities with one-line descriptions.' },
    { icon: '🔐', label: 'Bounty scope checklist',   prompt: 'Give me a checklist to evaluate whether an AI bug bounty scope is well-defined and fair to testers.' },
    { icon: '📈', label: 'Market rates for skills',  prompt: 'What are current market rates for AI red teaming work? Break down by skill level (entry/intermediate/expert).' },
    { icon: '🌐', label: 'Platform comparison',      prompt: 'Compare the main AI red teaming platforms: Mercor, Scale AI, Surge AI, Appen, Immunefi, HackerOne. Pros/cons of each.' },
  ],
};

// ── Detect page context for smart suggestions ─────────────────
function detectPageContext() {
  if (typeof window === 'undefined') return 'general';
  const path = window.location.pathname;
  const text = document.body?.innerText?.slice(0, 500) || '';
  if (path.includes('/gig/') || text.includes('Apply Now') || text.includes('Pay Rate')) return 'gig';
  if (path.includes('/profile/') || path.includes('/candidate/') || text.includes('GitHub')) return 'candidate';
  return 'general';
}

// ── Extract page context text for AI ─────────────────────────
function extractPageContext() {
  if (typeof window === 'undefined') return '';
  const title   = document.title || '';
  const h1      = document.querySelector('h1')?.innerText || '';
  const h2s     = Array.from(document.querySelectorAll('h2')).map(el => el.innerText).join(' | ');
  const meta    = document.querySelector('meta[name="description"]')?.content || '';
  const content = document.querySelector('[data-gig-content],[data-profile-content]')?.innerText?.slice(0, 800) || '';
  return [title, h1, h2s, meta, content].filter(Boolean).join('\n').slice(0, 1200);
}

// ── Single message component ──────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
        ${isUser ? 'bg-red-600 text-white' : 'bg-slate-700 text-red-400'}`}>
        {isUser ? 'YOU' : 'AI'}
      </div>
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed
        ${isUser
          ? 'bg-red-600/20 border border-red-600/30 text-slate-100 rounded-tr-sm'
          : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-sm'
        }`}>
        {msg.loading ? (
          <span className="flex items-center gap-2 text-slate-400">
            <span className="inline-flex gap-1">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
            Analyzing…
          </span>
        ) : (
          <FormattedContent content={msg.content} />
        )}
      </div>
    </div>
  );
}

// ── Simple markdown-lite renderer ────────────────────────────
function FormattedContent({ content }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <p key={i} className="font-bold text-red-400 text-xs uppercase tracking-wider mt-2">{line.slice(4)}</p>;
        if (line.startsWith('## '))  return <p key={i} className="font-bold text-white mt-2">{line.slice(3)}</p>;
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-white">{line.slice(2,-2)}</p>;
        if (line.startsWith('- ') || line.startsWith('• ')) return <p key={i} className="flex gap-2"><span className="text-red-400 flex-shrink-0">▸</span><span>{line.slice(2)}</span></p>;
        if (line.startsWith('```')) return null;
        if (line.trim() === '') return <div key={i} className="h-1" />;
        // Inline bold
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i}>
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{part}</strong> : part)}
          </p>
        );
      })}
    </div>
  );
}

// ── MAIN SIDEBAR COMPONENT ────────────────────────────────────
export default function MissionControlSidebar({ userRole = 'red_teamer', className = '' }) {
  const [isOpen,      setIsOpen]      = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [pageCtx,     setPageCtx]     = useState('general');
  const [pageText,    setPageText]    = useState('');
  const [hasPageCtx,  setHasPageCtx]  = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Detect context on mount + route changes
  useEffect(() => {
    const detect = () => {
      const ctx  = detectPageContext();
      const text = extractPageContext();
      setPageCtx(ctx);
      setPageText(text);
      setHasPageCtx(text.length > 80);
    };
    detect();
    window.addEventListener('popstate', detect);
    return () => window.removeEventListener('popstate', detect);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, isMinimized]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user', content: text };
    const loadMsg = { role: 'assistant', content: '', loading: true };
    setMessages(prev => [...prev, userMsg, loadMsg]);

    // Build messages array with optional page context injected
    const contextNote = hasPageCtx && messages.length === 0
      ? `\n\n[PAGE CONTEXT — the user is currently viewing this content:\n${pageText}\n]`
      : '';

    const apiMessages = [
      ...messages.filter(m => !m.loading).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text + contextNote },
    ];

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      });

      const data = await response.json();
      const reply = data.content?.find(b => b.type === 'text')?.text
        || 'Sorry, I could not process that request.';

      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { role: 'assistant', content: reply },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { role: 'assistant', content: '⚠️ Connection error. Check your API configuration.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, hasPageCtx, pageText]);

  const handleSummarizePage = useCallback(() => {
    const prompts = {
      gig:       'Summarize this gig posting. Extract: title, required skills, pay range, difficulty, and any red flags.',
      candidate: 'Summarize this candidate profile. Assess their skill level, relevant experience, and estimated fit for AI red teaming work.',
      general:   'Summarize the key information on this page relevant to AI red teaming or cybersecurity work.',
    };
    sendMessage(prompts[pageCtx]);
  }, [pageCtx, sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const currentSuggestions = SUGGESTIONS[pageCtx] || SUGGESTIONS.general;
  const ctxLabel = { gig: 'Gig Detected', candidate: 'Profile Detected', general: 'Mission Control' }[pageCtx];
  const ctxColor = { gig: 'text-emerald-400', candidate: 'text-blue-400', general: 'text-red-400' }[pageCtx];

  return (
    <>
      {/* ── Floating trigger button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Open Mission Control AI"
        >
          <div className="relative w-14 h-14 bg-slate-900 border border-red-600/50 rounded-2xl
                          flex items-center justify-center shadow-2xl shadow-red-900/30
                          hover:border-red-500 hover:shadow-red-900/50 transition-all duration-300
                          hover:scale-110 active:scale-95">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-400">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {/* Pulse dot */}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-950">
              <span className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75" />
            </span>
          </div>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 border border-slate-700
                          rounded-xl text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100
                          transition-opacity pointer-events-none">
            Mission Control AI
          </div>
        </button>
      )}

      {/* ── Sidebar panel ── */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 flex flex-col
                         bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60
                         transition-all duration-300
                         ${isMinimized ? 'w-72 h-14' : 'w-[380px] h-[600px]'}
                         ${className}`}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-slate-800 border border-red-600/40 rounded-lg
                              flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-red-400">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="text-xs font-bold text-white tracking-wide">MISSION CONTROL</div>
                <div className={`text-[10px] font-mono ${ctxColor}`}>{ctxLabel}</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Summarize button — only shown when page context detected */}
              {hasPageCtx && !isMinimized && (
                <button onClick={handleSummarizePage}
                        className="px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-300
                                   bg-emerald-900/30 border border-emerald-700/40 rounded-lg
                                   hover:bg-emerald-900/60 transition-colors mr-1">
                  SUMMARIZE PAGE
                </button>
              )}
              {messages.length > 0 && !isMinimized && (
                <button onClick={clearChat} title="Clear chat"
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                   text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors text-xs">
                  ⌫
                </button>
              )}
              <button onClick={() => setIsMinimized(p => !p)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg
                                 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
                {isMinimized ? '↑' : '−'}
              </button>
              <button onClick={() => { setIsOpen(false); setIsMinimized(false); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg
                                 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors text-sm">
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0
                              scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

                {messages.length === 0 ? (
                  /* Empty state — smart suggestions */
                  <div>
                    <p className="text-xs text-slate-500 mb-4 text-center">
                      AI-powered assistance for AI safety professionals.<br/>
                      <span className="text-slate-600">Scoped strictly to cybersecurity &amp; red teaming.</span>
                    </p>

                    {hasPageCtx && (
                      <div className="mb-4 px-3 py-2.5 bg-slate-900 border border-slate-700/50 rounded-xl">
                        <div className={`text-[10px] font-bold ${ctxColor} mb-1 tracking-wider`}>
                          PAGE CONTEXT DETECTED
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{pageText.slice(0, 120)}…</p>
                      </div>
                    )}

                    <div className="text-[10px] font-bold text-slate-600 tracking-widest mb-2 uppercase">
                      Quick actions
                    </div>
                    <div className="space-y-2">
                      {currentSuggestions.map((s, i) => (
                        <button key={i} onClick={() => sendMessage(s.prompt)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                                           bg-slate-900/60 border border-slate-800 text-slate-300 text-xs
                                           hover:border-red-600/40 hover:text-white hover:bg-slate-900
                                           transition-all duration-150 group">
                          <span className="text-base flex-shrink-0">{s.icon}</span>
                          <span className="group-hover:translate-x-0.5 transition-transform">{s.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <div className="text-[10px] font-bold text-slate-600 tracking-widest mb-2 uppercase">Role</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide
                          ${userRole === 'red_teamer'
                            ? 'bg-red-900/40 text-red-300 border border-red-700/40'
                            : 'bg-blue-900/40 text-blue-300 border border-blue-700/40'}`}>
                          {userRole === 'red_teamer' ? '🛡 RED TEAMER' : '🏢 COMPANY'}
                        </span>
                        <span className="text-[10px] text-slate-600">
                          {userRole === 'red_teamer' ? 'Gig-finding mode' : 'Hiring mode'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Message thread */
                  <>
                    {messages.map((msg, i) => <Message key={i} msg={msg} />)}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input area */}
              <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-slate-800">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(input);
                        }
                      }}
                      placeholder="Ask about this gig, a candidate, or AI safety..."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-red-500/50
                                 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600
                                 outline-none resize-none leading-relaxed transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl
                               bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600
                               text-white transition-all active:scale-95 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    }
                  </button>
                </div>
                <p className="text-[10px] text-slate-700 mt-1.5 text-center">
                  Scoped to AI safety &amp; cybersecurity · Enter to send
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
