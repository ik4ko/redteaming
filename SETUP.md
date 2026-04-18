# RedTeamGig Deployment Guide

## Quick Start for Vercel + Supabase

### Step 1: Prepare Supabase

1. **Create a Supabase account**
   - Go to [supabase.com](https://supabase.com) and sign up
   - Create a new project

2. **Create the `waitlist` table**
   - In Supabase Dashboard → SQL Editor, run:
   ```sql
   CREATE TABLE waitlist (
     id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
     email TEXT NOT NULL UNIQUE,
     name TEXT NOT NULL,
     role TEXT NOT NULL,
     location TEXT,
     join_date TIMESTAMP DEFAULT NOW(),
     created_at TIMESTAMP DEFAULT NOW()
   );
   
   -- Enable Row Level Security
   ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
   
   -- Create policy to allow anyone to insert
   CREATE POLICY "Allow public insert" ON waitlist
     FOR INSERT WITH CHECK (true);
   ```

3. **Get your credentials**
   - Go to Settings → API
   - Copy: `Project URL` (this is your SUPABASE_URL)
   - Copy: `anon public` key (this is your SUPABASE_ANON_KEY)

### Step 2: Update index.html with Supabase Credentials

In `index.html`, find this section (around line 616):
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = 'your-anon-key'
```

Replace with your actual credentials from Step 1.

### Step 3: Deploy to Vercel

#### Option A: GitHub Integration (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Supabase integration and Vercel config"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New..." → "Project"
   - Select your GitHub repo (`ik4ko/redteaming`)
   - Click "Import"
   - Leave default settings, then click "Deploy"

#### Option B: Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow the prompts**: Select your project and deployment preferences

### Step 4: Buy a Domain

1. **Add a custom domain in Vercel**
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Click "Add Custom Domain"
   - Enter your domain (e.g., `redteamgig.com`)
   - Follow the DNS configuration instructions

2. **Purchase the domain**
   - Options: Namecheap, GoDaddy, Route53, or register directly in Vercel
   - Point DNS records to Vercel as instructed

### Step 5: Go Live!

Once everything is configured:
- Your site is live at your custom domain
- Waitlist submissions are now saving to Supabase
- You can view submissions in the Supabase Dashboard

---

## Environment Variables (Optional for Advanced Setup)

Create a `.env.local` file for development:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
```

---

## Troubleshooting

### Submissions not saving?
- Check browser console (F12) for errors
- Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct in index.html
- Ensure Supabase table exists and permissions are set

### Domain not working?
- Wait 24-48 hours for DNS propagation
- Check Vercel Domain Settings for correct DNS records

### Can't connect to Supabase?
- Verify the anon key has INSERT permissions
- Check that Row Level Security policies are correct

---

## Next Steps

After launch:
1. **Add Stripe integration** for payments
2. **Build matching engine** with Claude API
3. **Add authentication** for user profiles
4. **Create dashboard** for gig management

See the Phase 2 & 3 roadmap in the site footer.

---

## Support

For issues with:
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Domain setup**: Check your domain registrar's DNS guides

---

**Launch Status**: Ready for Vercel deployment ✅
**Supabase Integration**: Ready ✅
**Domain**: Awaiting purchase 🔄
