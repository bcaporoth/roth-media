#!/bin/zsh
cd "/Users/brandon/Roth Media project "
echo "Syncing with GitHub first (picks up anything committed from the web)..."
git pull --rebase origin main || { echo ""; echo "Sync hit a conflict — stop here and ask Claude."; exit 1; }
echo ""
echo "Pushing to GitHub (Vercel deploys automatically)..."
git push origin main
echo ""
echo "Done! You can close this window."
