# redteaming
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="RedTeamGig — the Upwork + Fiverr for AI safety. Connect red teamers, safety testers & freelance developers with AI companies for jailbreak testing, bias auditing, prompt injection, and LLM security work.">
    <title>redteamgig.com • AI Red Teaming Marketplace</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Space+Grotesk:wght@500;600&amp;display=swap');
        
        :root {
            --redteam: #e11d48;
        }
        
        * {
            transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            transition-duration: 150ms;
        }
        
        .hero-bg {
            background: linear-gradient(90deg, #0f172a 0%, #1e2937 100%);
        }
        
        .card-hover {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 25px 50px -12px rgb(225 29 72);
        }
        
        .tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
    </style>
</head>
<body class="bg-slate-950 text-slate-200 font-sans">
    <!-- (all the same content as before — only footer and modal changed) -->
    <!-- ... [the entire previous HTML stays exactly the same until the footer] ... -->

    <footer class="bg-slate-950 border-t border-slate-800 py-12">
        <div class="max-w-screen-2xl mx-auto px-8 text-xs text-slate-400 flex flex-col md:flex-row justify-between items-center gap-4">
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
