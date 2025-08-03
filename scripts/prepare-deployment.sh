#!/bin/bash

echo "🚀 Preparing for deployment to muauni.com"

# Check if all required environment variables are set
echo "📋 Checking environment variables..."

required_vars=(
  "NEXT_PUBLIC_FIREBASE_API_KEY"
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "FIREBASE_SERVICE_ACCOUNT_KEY"
  "POSTGRES_URL"
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
  echo "❌ Missing required environment variables:"
  printf '%s\n' "${missing_vars[@]}"
  echo "Please set these in AWS Amplify Console"
else
  echo "✅ All required environment variables are present"
fi

# Build the project to check for errors
echo "🔨 Building project..."
pnpm build

if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed! Please fix errors before deploying"
  exit 1
fi

# Run type checking
echo "🔍 Running type check..."
pnpm tsc --noEmit

if [ $? -eq 0 ]; then
  echo "✅ Type check passed!"
else
  echo "❌ Type errors found! Please fix before deploying"
  exit 1
fi

echo "✨ Project is ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Set up AWS Amplify following DEPLOYMENT.md"
echo "3. Configure environment variables in Amplify Console"
echo "4. Set up custom domain (muauni.com)"
echo ""
echo "Good luck with your deployment! 🎉"