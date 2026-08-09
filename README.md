# VendorFlow MVP

VendorFlow is an AI-assisted command center for education vendors.

This first working prototype focuses on the foundation:

**CSV class roster import → clean roster → stored locally in the browser**

## What works in this version

- Create classes
- Upload a CSV roster for a selected class
- Automatically recognize common roster fields
- Preview the cleaned roster
- Save the roster in the browser
- Keep dropped/cancelled students in history while excluding them from the active-student dashboard count
- Send ambiguous imports to a Needs Review area
- Export a JSON backup
- Responsive layout for desktop and mobile

## What is intentionally NOT wired up yet

- Login / Firebase Authentication
- Firestore cloud database
- Forwarded-email intake
- Venmo payment extraction
- Charter certificate extraction
- Add/drop email processing
- Batch charter invoicing
- Tax-ready income ledger
- Subscription/payment system

Those come after the roster flow is tested.

## Run locally

You can simply double-click `index.html`, but because the page loads Papa Parse from a CDN, you need an internet connection.

For a local web server:

```bash
python3 -m http.server 8000
```

Then open:

`http://localhost:8000`

## Deploy on GitHub Pages

Upload these files to the root of your GitHub repository:

- `index.html`
- `styles.css`
- `app.js`

Then:

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose branch **main** and folder **/(root)**.
5. Save.

## Important prototype limitation

This version stores data in the browser's `localStorage`. That means it is for testing the user experience only. Data does not sync across devices.

The next infrastructure step is to replace localStorage with Firebase Authentication + Firestore.
