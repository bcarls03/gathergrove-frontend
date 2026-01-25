#!/bin/bash
# Script to set Vercel environment variable and deploy

echo "Setting Vercel production environment variable..."
echo "https://gathergrove-backend.onrender.com" | vercel env add VITE_API_BASE_URL production

echo ""
echo "Deploying to production..."
vercel --prod --yes

echo ""
echo "✅ Deployment complete! Visit: https://gathergrove-nine.vercel.app/discovery"
