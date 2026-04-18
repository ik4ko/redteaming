# 🚀 Launch Checklist

Complete these steps in order to launch redteamgig.com

---

## ☐ Phase A: Supabase Setup (10 minutes)

- [ ] Create Supabase account at [supabase.com](https://supabase.com)
- [ ] Create a new project
- [ ] Run the SQL migration in Supabase SQL Editor:
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
  
  ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "Allow public insert" ON waitlist
    FOR INSERT WITH CHECK (true);
  ```
- [ ] Copy `Project URL` from Settings → API
- [ ] Copy `anon public` key from Settings → API
- [ ] Save both values securely

---

## ☐ Phase B: Update Code (2 minutes)

- [ ] Open `index.html` in your editor
- [ ] Find line ~616: `const SUPABASE_URL = 'https://your-project.supabase.co'`
- [ ] Replace with your actual Project URL
- [ ] Find line ~617: `const SUPABASE_ANON_KEY = 'your-anon-key'`
- [ ] Replace with your actual anon key
- [ ] Save the file

---

## ☐ Phase C: Git Commit (2 minutes)

```bash
git add .
git commit -m "Add Supabase credentials and Vercel config"
git push origin main
```

---

## ☐ Phase D: Deploy to Vercel (3 minutes)

- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign in with GitHub
- [ ] Click "Add New" → "Project"
- [ ] Select the `ik4ko/redteaming` repository
- [ ] Click "Import"
- [ ] Leave default settings
- [ ] Click "Deploy"
- [ ] ✅ Wait for deployment to complete

**Your site is now live at:** `https://redteaming.vercel.app`

---

## ☐ Phase E: Buy a Domain (5 minutes)

**Choose one:**

### Option 1: Buy through Vercel
- [ ] Go to Vercel Dashboard → Your Project → Settings → Domains
- [ ] Click "Add Custom Domain"
- [ ] Enter your domain: `redteamgig.com`
- [ ] Click "Buy" and complete payment
- [ ] Vercel handles DNS automatically ✅

### Option 2: Buy elsewhere (e.g., Namecheap)
- [ ] Purchase domain from registrar
- [ ] Go to Vercel Dashboard → Settings → Domains
- [ ] Add domain name
- [ ] Copy the nameservers from Vercel
- [ ] Update nameservers in your registrar
- [ ] Wait 24-48 hours for propagation

---

## ☐ Phase F: Enable Email Notifications (Optional)

In Supabase:
- [ ] Go to Settings → Email Templates
- [ ] Customize confirmation emails
- [ ] Set up transactional email provider (Resend, SendGrid, etc.)

---

## ✅ Launch Complete!

Your site is now live at `https://redteamgig.com` with a working waitlist!

### What happens next:

1. Users can join the waitlist
2. Submissions appear in Supabase → your database
3. You can export data and send emails to waitlist members

---

## 🎯 Next Milestones

| Step | Task | Est. Time |
|------|------|-----------|
| 1 | ✅ Landing page + waitlist | Done |
| 2 | 🔄 Freelancer profiles + Stripe | Week of {DATE} |
| 3 | 🔄 Company matching engine | Week of {DATE} |

---

## ❓ Troubleshooting

**Form submissions aren't saving?**
- Check browser console (F12 → Console tab)
- Verify Supabase URL and key are correct
- Ensure RLS policies are set up

**Domain not working?**
- DNS can take 24-48 hours
- Verify nameservers are correct in your registrar
- Check Vercel domain settings

**Need help?**
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs

---

**Status**: 🚀 Ready to launch
**Last Updated**: April 18, 2026
