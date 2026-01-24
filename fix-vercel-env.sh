#!/bin/bash

# Fix the VITE_API_BASE_URL in Vercel
# This removes the old incorrect value and adds the correct one

echo "🔧 Fixing Vercel environment variable..."
echo ""
echo "Please manually update in Vercel dashboard:"
echo "1. Go to: https://vercel.com/brians-projects-7f1c1438/gathergrove/settings/environment-variables"
echo "2. Find VITE_API_BASE_URL"
echo "3. Edit the Production value to: https://gathergrove-backend.onrender.com"
echo "4. Save"
echo ""
echo "Or remove and re-add via CLI:"
echo "  vercel env rm VITE_API_BASE_URL production"
echo "  echo 'https://gathergrove-backend.onrender.com' | vercel env add VITE_API_BASE_URL production"
