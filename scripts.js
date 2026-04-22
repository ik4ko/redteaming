// 1. Connection (Using 'sb' to avoid declaration errors)
const sbUrl = 'https://YOUR_URL.supabase.co'; 
const sbKey = 'YOUR_ANON_KEY';
const sb = supabase.createClient(sbUrl, sbKey); 

async function runPortal() {
    const { data: { session } } = await sb.auth.getSession();
    const isAtApp = window.location.pathname.includes('app');

    if (session) {
        // Stop the loop
        if (!isAtApp) {
            window.location.href = '/app';
            return;
        }

        // Fetch User Profile
        const { data: profile, error } = await sb
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            console.log("Access Granted. Initializing UI...");

            // --- THE SWITCH ---
            // 1. Kill the spinner
            const loader = document.getElementById('loading-screen');
            if (loader) loader.style.display = 'none';

            // 2. Show the app layout
            const appLayout = document.getElementById('app');
            if (appLayout) appLayout.style.display = 'flex';

            // 3. Set Role Info
            if (document.getElementById('sb-name')) document.getElementById('sb-name').innerText = profile.display_name || 'User';
            if (document.getElementById('sb-role')) document.getElementById('sb-role').innerText = profile.role.toUpperCase().replace('_', ' ');

            // 4. Activate View (Checks your Supabase Enum)
            const viewId = (profile.role === 'company_client') ? 'company-view' : 'freelancer-view';
            const viewNode = document.getElementById(viewId);
            if (viewNode) viewNode.classList.add('active');
            
            // 5. Show AI Panel
            if (document.getElementById('ai-panel')) document.getElementById('ai-panel').style.display = 'block';

        } else {
            console.error("No profile found. Please ensure your Supabase 'profiles' table has a row for this ID.");
            // Optional: alert("Profile not found. Please contact support.");
        }
    } else {
        if (isAtApp) window.location.href = '/';
    }
}

// Start immediately
runPortal();

// Handle Sign Out
async function signOut() {
    await sb.auth.signOut();
    window.location.href = '/';
}
