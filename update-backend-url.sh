#!/bin/bash

# Script to update backend URL after Render deployment
# Usage: ./update-backend-url.sh https://your-backend-url.onrender.com

if [ -z "$1" ]; then
  echo "❌ Error: Please provide the backend URL"
  echo "Usage: ./update-backend-url.sh https://your-backend-url.onrender.com"
  exit 1
fi

BACKEND_URL=$1

echo "🔧 Updating backend URL to: $BACKEND_URL"

# Add environment variable to Vercel
echo "📤 Adding VITE_API_BASE_URL to Vercel production..."
echo "$BACKEND_URL" | vercel env add VITE_API_BASE_URL production

echo "✅ Environment variable added to Vercel!"
echo ""
echo "🚀 Now deploying frontend with new backend URL..."
vercel --prod

echo ""
echo "✅ Done! Your app should now be connected to the backend."
echo ""
echo "🧪 Test it out:"
echo "   - Frontend: https://gathergrove-nine.vercel.app"
echo "   - Backend: $BACKEND_URL"
