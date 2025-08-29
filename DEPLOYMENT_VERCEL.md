# Deployment Guide for muauni.com on Vercel

## Prerequisites
1. Vercel account (free tier works)
2. GitHub repository with your code
3. Domain (muauni.com)

## Step 1: Prepare Your Repository

1. Ensure all changes are committed:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Select your GitHub repo
# - Use default settings for Next.js
```

### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js
5. Configure environment variables (see below)
6. Click "Deploy"

## Step 3: Configure Environment Variables

In Vercel Dashboard > Settings > Environment Variables, add:

```
# Firebase Public Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=muauni.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=muauni
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=muauni.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (paste entire JSON as single line)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"muauni"...}

# Database
POSTGRES_URL=your_postgres_connection_string

# AI Services (add what you're using)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
# etc.
```

## Step 4: Configure Custom Domain

1. In Vercel Dashboard > Settings > Domains
2. Add `muauni.com`
3. Add `www.muauni.com`
4. You'll get DNS records to configure:

### For domain at external registrar:
Add these DNS records:
- A record: @ → 76.76.21.21
- CNAME record: www → cname.vercel-dns.com

### For domain at Vercel:
- Transfer domain to Vercel for automatic configuration

## Step 5: Update Firebase Authorized Domains

1. Go to Firebase Console > Authentication > Settings
2. Add to Authorized domains:
   - `muauni.com`
   - `www.muauni.com`
   - `your-project.vercel.app`

## Step 6: SSL Certificate

Vercel automatically provisions SSL certificates. Wait 10-30 minutes after adding domain.

## Deployment Complete! 🎉

Your site should be live at:
- https://muauni.com
- https://www.muauni.com
- https://your-project.vercel.app

## Continuous Deployment

Every push to `main` branch auto-deploys:
```bash
git add .
git commit -m "Update feature"
git push origin main
```

## Preview Deployments

Each PR gets a preview URL automatically.

## Monitoring

- **Build Logs**: Vercel Dashboard > Functions > Logs
- **Analytics**: Vercel Dashboard > Analytics (Pro feature)
- **Speed Insights**: Automatically enabled

## Troubleshooting

### Build Errors
- Check build logs in Vercel dashboard
- Ensure all env vars are set
- Try building locally: `pnpm build`

### Dynamic Server Errors
- We've added `export const dynamic = 'force-dynamic'` to pages using auth
- This prevents static generation errors

### Domain Not Working
- Check DNS propagation: `nslookup muauni.com`
- Verify DNS records are correct
- Wait up to 48 hours for propagation

### Firebase Auth Issues
- Ensure authorized domains include all Vercel URLs
- Check Firebase service account key is valid
- Verify API keys match between Firebase and Vercel

## Performance Tips

1. Enable Vercel Edge Config for faster reads
2. Use Vercel KV for session storage
3. Enable ISR for semi-static pages
4. Monitor Core Web Vitals in Vercel Analytics

## Rollback

To rollback to previous deployment:
1. Vercel Dashboard > Deployments
2. Find previous successful deployment
3. Click "..." menu > "Promote to Production"