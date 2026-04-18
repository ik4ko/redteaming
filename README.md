# redteamgig.com

The Upwork + Fiverr for AI safety. Connect red teamers, safety testers & freelance developers with AI companies for jailbreak testing, bias auditing, prompt injection, and LLM security work.

## Features

- **Cold-start directory**: Aggregated gigs from Anthropic, Scale, Surge, Appen, Reddit, LinkedIn
- **Talent pool**: Freelancers submit profiles once, get matched instantly
- **Gig applications**: Apply to open gigs with one click
- **Post gigs**: Companies pay $49 deposit to post proprietary gigs
- **AI matching**: Claude-powered matching engine (coming soon)
- **Supabase backend**: Waitlist, talent pool, job applications tables

## Tech Stack

- **Frontend**: HTML5, Tailwind CSS, Font Awesome
- **Backend**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **AI**: Claude API (future)
- **Payments**: Stripe (future)

## Development

```bash
# Serve locally
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

## Deployment

1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Deploy

## Database Schema

### waitlist
- email (text, primary)
- name (text)
- role (text)
- location (text)
- join_date (timestamp)

### talent_pool
- full_name (text)
- email (text)
- github (text)

### job_applications
- gig_title (text)
- applicant_name (text)
- applicant_email (text)
- github (text)

## Roadmap

1. ✅ Cold-start directory (live)
2. 🔄 Freelancer profiles + scores
3. 🔄 Company side + AI matching
4. 🔄 Stripe payments + escrow

## Contributing

Built by Erekle Niniashvili in New Jersey. Mission: make AI safety work accessible to everyday technical people.

Total launch budget: under $100 (Next.js + Supabase + Vercel + Stripe + Claude API)
            <div>© 2026 redteamgig.com • All rights reserved</div>
            <div class="flex gap-x-8">
                <a href="#" class="hover:text-white">Twitter / X</a>
                <a href="#" class="hover:text-white">Discord for red teamers</a>
                <a href="#" class="hover:text-white">Privacy &amp; Safety</a>
                <a href="#" class="hover:text-white">Founder: Erekle Niniashvili (NJ)</a>
            </div>
            <div>Made with Next.js • Supabase • Vercel • Claude</div>
        </div>
    </footer>

    <!-- WAITLIST MODAL (now with relative positioning fix) -->
    <div onclick="if(event.target.id === 'waitlistModal')hideWaitlistModal()" 
         id="waitlistModal"
         class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
        <div onclick="event.stopImmediatePropagation()" 
             class="bg-slate-900 rounded-3xl max-w-lg w-full mx-4 p-8 relative">
            <h3 class="text-3xl font-semibold mb-6">Join redteamgig.com waitlist</h3>
            
            <form id="modalForm" onsubmit="handleSubmit(event)" class="space-y-6">
                <!-- role buttons and inputs unchanged -->
                <div class="flex gap-4">
                    <button type="button" onclick="selectRoleModal(0)" id="modal-role-0"
                            class="flex-1 py-6 border-2 border-transparent data-[active=true]:border-red-600 rounded-3xl text-center font-semibold">
                        <i class="fa-solid fa-user-secret text-3xl mb-2 block"></i>
                        Red Teamer / Tester
                    </button>
                    <button type="button" onclick="selectRoleModal(1)" id="modal-role-1"
                            class="flex-1 py-6 border-2 border-transparent data-[active=true]:border-red-600 rounded-3xl text-center font-semibold">
                        <i class="fa-solid fa-building text-3xl mb-2 block"></i>
                        AI Company
                    </button>
                </div>
                
                <input type="email" id="modalEmail" placeholder="Email address" required
                       class="w-full px-6 py-6 bg-slate-800 border border-slate-700 rounded-3xl text-lg outline-none">
                
                <input type="text" id="modalName" placeholder="Your name" 
                       class="w-full px-6 py-6 bg-slate-800 border border-slate-700 rounded-3xl text-lg outline-none">
                
                <button type="submit" 
                        class="w-full py-6 bg-red-600 rounded-3xl text-xl font-semibold text-white">Get early access</button>
            </form>
            
            <p class="text-center text-xs text-slate-400 mt-6">We’ll email you the moment the directory goes live.<br>Built in New Jersey with ❤️ for the AI safety community.</p>
            
            <button onclick="hideWaitlistModal()" class="absolute top-8 right-8 text-slate-400 text-2xl">✕</button>
        </div>
    </div>

    <!-- Rest of your script stays the same except the handleSubmit part below -->
    <script>
        // ... (all previous functions unchanged) ...

        async function handleSubmit(e) {
            e.preventDefault();
            
            const email = (document.getElementById('email') || document.getElementById('modalEmail')).value;
            const name = (document.getElementById('name') || document.getElementById('modalName')).value || 'Anonymous';
            const roleBtn = document.getElementById('modal-role-0');
            const role = roleBtn && roleBtn.dataset.active === 'true' ? 'Red Teamer' : 'AI Company';

            // === SUPABASE INTEGRATION GOES HERE (we'll fill this in after you create the project) ===
            // For now it still shows the success toast so you can test the page immediately
            console.log('%c✅ Waitlist submission (ready for Supabase)', 'background:#e11d48;color:#fff;padding:2px 4px;border-radius:2px', { email, name, role });

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.style.backgroundColor = '#10b981';
            btn.innerHTML = '🎉 You’re in! Check your email soon';

            setTimeout(() => {
                hideWaitlistModal();
                btn.style.backgroundColor = '';
                btn.innerHTML = originalText;

                const toast = document.createElement('div');
                toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#10b981;color:white;padding:16px 24px;border-radius:9999px;box-shadow:0 10px 15px -3px rgb(16 185 129);font-weight:600';
                toast.innerHTML = '✅ Added to waitlist. You’re #47!';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 4000);
            }, 1800);
        }

        // ... rest of your script unchanged ...
    </script>
</body>
</html>
=======
# 🔴 RedTeamGig

**The Upwork + Fiverr for AI safety.**

Connect red teamers, safety testers & freelance developers with AI companies for jailbreak testing, bias auditing, prompt injection, and LLM security work.

![Status](https://img.shields.io/badge/status-launching%20soon-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🚀 Quick Links

- **[SETUP.md](./SETUP.md)** — Deploy to Vercel + connect Supabase
- **[Live Site](https://redteamgig.com)** — (Coming soon)
- **[GitHub](https://github.com/ik4ko/redteaming)** — This repo

---

## 📋 What's Inside

```
.
├── index.html          # Main landing page (Tailwind + JS)
├── package.json        # Dependencies
├── vercel.json         # Vercel deployment config
├── .env.example        # Environment variables template
├── SETUP.md            # Full deployment guide
└── README.md           # This file
```

---

## ⚡ Launch Checklist

- ✅ Landing page complete
- ✅ Supabase integration (waitlist table)
- ✅ Vercel config ready
- 🔄 Domain purchase (in progress)
- 🔄 Deploy to production
- 🚧 Phase 2: Freelancer profiles + matching engine
- 🚧 Phase 3: Company side + AI matching

---

## 🛠 Tech Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Hosting**: Vercel
- **Payments**: Stripe (Phase 2)
- **AI Matching**: Claude API (Phase 3)

---

## 📖 How to Deploy

### 1. **Set Up Supabase** (3 min)
Create a table and get your API credentials.
[Full instructions →](./SETUP.md#step-1-prepare-supabase)

### 2. **Update Credentials** (1 min)
Add your Supabase URL & key to `index.html`.
[Instructions →](./SETUP.md#step-2-update-indexhtml-with-supabase-credentials)

### 3. **Deploy to Vercel** (2 min)
Connect your GitHub repo and deploy.
[Instructions →](./SETUP.md#step-3-deploy-to-vercel)

### 4. **Buy Domain** (5 min)
Purchase domain and point to Vercel.
[Instructions →](./SETUP.md#step-4-buy-a-domain)

---

## 🎯 Development

**No build process needed!** This is a static site with client-side Supabase integration.

To serve locally:
```bash
npx serve .
```

Then open `http://localhost:3000`

---

## 📊 Phase Roadmap

| Phase | Feature | Timeline |
|-------|---------|----------|
| 1 | Cold-start directory + waitlist | Week 1-2 |
| 2 | Freelancer profiles + Stripe | Week 3-4 |
| 3 | Company matching engine (Claude API) | Week 5-6 |

---

## 🔐 Security Notes

- ✅ Supabase Row-Level Security (RLS) enabled
- ✅ Anon key restricted to INSERT only
- ✅ HTTPS enforced by Vercel
- 🔄 Email verification (Phase 2)
- 🔄 NDA template (Phase 2)

---

## 📝 Contributing

Help us build the future of AI safety work!

1. Fork the repo
2. Create a feature branch
3. Submit a PR

---

## 📧 Contact

Built by **Erekle Niniashvili** in New Jersey.

- Twitter: [@redteamgig](https://twitter.com)
- Discord: [Join our community](https://discord.gg)
- Email: founder@redteamgig.com

---

## 📄 License

MIT License — See `LICENSE` file for details.

---

**Status**: Ready for launch 🚀 | Last updated: April 18, 2026
>>>>>>> 4c37c16 (Add marketplace features: Open Gigs, Talent Pool, Post Gig modal, Supabase integration)
