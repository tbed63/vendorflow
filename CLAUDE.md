# VendorFlow (app.myvendorflow.com and myvendorflow.com)

Tim is not a programmer. Make changes for him and explain in plain English.

## Where things live
- beta-preview/ is the app people log into at app.myvendorflow.com (app.js, styles.css).
  It uses real customer data in Firebase, so be careful with anything touching money.
- marketing/ is myvendorflow.com. subscribe/, privacy/, terms/ and admin/ are their own pages.
- The root index.html only redirects old bookmarks to app.myvendorflow.com.
- The backend (email intake, Stripe, AI reading) is a separate repo:
  github.com/tbed63/vendorflow-worker. It has its own CLAUDE.md.
- When app.js or styles.css changes, bump the ?v= number in beta-preview/index.html
  so browsers load the new copy.

## How changes go live (GitHub is the source of truth)
- Code lives at github.com/tbed63/vendorflow. This repo is PUBLIC (GitHub Pages needs
  that), so never commit customer data, passwords, API keys or Stripe keys.
- Anything merged into main is published by GitHub Pages within a few minutes.
  There is no preview link, so explain clearly what will change before Tim merges.
- Make changes on a branch and open a pull request. ALWAYS give Tim the pull request link.
  Tim approves by clicking "Merge pull request" then "Confirm merge".
- Do not push straight to main.
