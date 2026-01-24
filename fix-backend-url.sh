#!/bin/bash

# This script properly updates the Vercel environment variable
# and triggers a new deployment

echo "🔧 Fixing VITE_API_BASE_URL in Vercel..."
echo ""
echo "Step 1: Go to Vercel Dashboard"
echo "https://vercel.com/brians-projects-7f1c1438/gathergrove/settings/environment-variables"
echo ""
echo "Step 2: Find VITE_API_BASE_URL for Production"
echo ""
echo "Step 3: Click 'Edit' and change value to:"
echo "https://gathergrove-backend.onrender.com"
echo ""
echo "Step 4: Save and Redeploy"
echo ""
echo "Press Enter when done, and I'll trigger a new deployment..."
read

echo "🚀 Triggering new production deployment..."
git commit --allow-empty -m "Trigger rebuild with correct backend URL"
git push

echo "✅ Done! Wait 1-2 minutes for Vercel to rebuild and deploy."
