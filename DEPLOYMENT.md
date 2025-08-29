# Deployment Guide for muauni.com on AWS Amplify

## Prerequisites
1. AWS Account
2. Domain (muauni.com) - can be registered with Route 53 or external registrar
3. GitHub repository with your code

## Step 1: Prepare Your Repository

1. Ensure all sensitive files are in `.gitignore`
2. Commit and push your code to GitHub:
```bash
git add .
git commit -m "Prepare for AWS Amplify deployment"
git push origin main
```

## Step 2: Set Up AWS Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Choose "GitHub" and authorize AWS Amplify
4. Select your repository and branch (main)
5. Amplify should auto-detect Next.js settings
6. Review the build settings (should match our amplify.yml)
7. Click "Save and deploy"

## Step 3: Configure Environment Variables

In Amplify Console:
1. Go to "App settings" → "Environment variables"
2. Add all variables from `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_SERVICE_ACCOUNT_KEY` (paste the entire JSON as a string)
   - `POSTGRES_URL`
   - All AI API keys
   - AWS credentials (if using S3)

## Step 4: Set Up Custom Domain

### If domain is in Route 53:
1. In Amplify Console, go to "Domain management"
2. Click "Add domain"
3. Select your domain from the dropdown
4. Configure subdomains:
   - `@` → Branch: main (for muauni.com)
   - `www` → Branch: main (for www.muauni.com)
5. Click "Save"
6. Amplify will automatically create SSL certificates

### If domain is with external registrar:
1. In Amplify Console, go to "Domain management"
2. Click "Add domain"
3. Enter "muauni.com"
4. You'll get DNS records to add:
   - CNAME records for domain validation
   - CNAME or ALIAS records for the domain
5. Add these records in your registrar's DNS settings
6. Wait for DNS propagation (can take up to 48 hours)

## Step 5: Configure Firebase for Production

1. In Firebase Console, add your production domain:
   - Go to Authentication → Settings → Authorized domains
   - Add `muauni.com` and `www.muauni.com`
   
2. Update OAuth redirect URIs:
   - Go to Authentication → Sign-in method → Google
   - Add `https://muauni.com` to authorized domains

## Step 6: Post-Deployment Checklist

- [ ] Test authentication flow
- [ ] Verify all environment variables are working
- [ ] Check SSL certificate is active
- [ ] Test both muauni.com and www.muauni.com
- [ ] Monitor Amplify build logs for any errors
- [ ] Set up CloudWatch alarms for monitoring

## Monitoring & Logs

- **Build logs**: Amplify Console → "Build" tab
- **Access logs**: Amplify Console → "Monitoring" tab
- **CloudWatch**: Detailed logs and metrics

## Continuous Deployment

Amplify automatically deploys when you push to main branch:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

## Rollback

If needed, you can redeploy a previous build:
1. Go to Amplify Console → "Hosting environments"
2. Click on your branch
3. Go to "Build history"
4. Click "Redeploy this version" on any previous successful build

## Cost Optimization

- Enable build notifications to avoid unnecessary builds
- Use build triggers only for main branch
- Consider using preview environments for feature branches
- Monitor data transfer costs in CloudWatch

## Troubleshooting

### Build Failures
- Check Amplify build logs
- Ensure all dependencies are in package.json
- Verify environment variables are set correctly

### Domain Issues
- Check DNS propagation: `nslookup muauni.com`
- Verify SSL certificate status in Amplify Console
- Ensure all DNS records are correctly added

### Performance
- Enable Amplify performance mode
- Consider CloudFront distribution for static assets
- Monitor Core Web Vitals in Amplify Console