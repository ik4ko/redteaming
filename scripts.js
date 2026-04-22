// --- 1. Supabase Connection ---
const SUPABASE_URL = 'https://YOUR_URL.supabase.co'; 
const SUPABASE_KEY = 'YOUR_ANON_KEY';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. The Logic ---
async function managePortal() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const isAtApp = window.location.pathname.includes('app');

    if (session) {
        // If logged in and at home, go to /app
        if (!isAtApp) {
            window.location.href = '/app';
            return;
        }

        // We are safely on the /app page. Load the profile.
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            // Hide the spinner and show your dashboard
            // Make sure these IDs match your app.html
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            
            // Set role and view
            document.getElementById('sb-role').innerText = profile.role.toUpperCase();
            const viewId = profile.role === 'company_client' ? 'company-view' : 'freelancer-view';
            document.getElementById(viewId).classList.add('active');
        }
    } else {
        // If NOT logged in and trying to see /app, send back to home
        if (isAtApp) {
            window.location.href = '/';
        }
    }
}

// Run the check instantly
managePortal();

// Watch for sign-outs
supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.href = '/';
});
