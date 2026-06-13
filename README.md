# Bluedoor Customer Signal BI

A Netlify-ready business intelligence dashboard for the Bluedoor Customer Signal search-and-analyze workflow.

It includes:

- Vite + React front end
- Netlify Functions API endpoint
- OpenAI Responses API integration with live web search
- Bluedoor scoring model
- Ranked company table
- Account detail view
- CSV export
- Saved scan history in browser localStorage
- Optional endpoint token protection
- Built-in demo data so the UI works before API setup

## Folder structure

```txt
.
├── netlify.toml
├── package.json
├── .env.example
├── index.html
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── styles.css
│   └── lib/
│       ├── csv.js
│       └── sampleData.js
└── netlify/
    └── functions/
        ├── health.mjs
        └── signal.mjs
```

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

For full Netlify Function testing locally, use Netlify CLI:

```bash
npm install netlify-cli -g
netlify dev
```

## Environment variables

Set these in Netlify under your site environment variables. The OpenAI key must be available to Functions.

```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5.5
SIGNAL_ADMIN_TOKEN=optional-secret-token
```

`SIGNAL_ADMIN_TOKEN` is optional. If you set it, users must enter the same token in the dashboard before running a scan.

## Deploy to Netlify

1. Push this folder to GitHub.
2. In Netlify, create a new project from that GitHub repo.
3. Netlify should use `netlify.toml`, but the settings are:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. Add `OPENAI_API_KEY` in environment variables.
5. Deploy.

## How the scoring works

The serverless function asks the model to run a live market scan, return structured JSON, and score every company using the Bluedoor Customer Signal weights:

- 40 points: leadership / GTM trigger
- 20 points: ICP fit
- 10 points: funding momentum
- 20 points: hiring velocity
- 10 points: strategic fit

Best-fit targets are generally Series A-C or post-revenue digital health / health transformation companies with 50-1000 employees and commercial inflection signals such as new CRO, CMO, Head of Growth, VP Marketing, VP Product Marketing, VP RevOps, VP Sales, new funding, expansion, new product launch, or active GTM hiring.

## Bluedoor package map options

- Buyer Journey Map
- Sales Enablement Portfolio
- Category Narrative
- Founder-led GTM to Repeatable Pipeline
- Product Marketing Sprint
- Customer Evidence/ROI
- RevOps/GTM Infrastructure
- Discovery Sprint

## Important implementation notes

- The browser never sees `OPENAI_API_KEY`; it only calls `/.netlify/functions/signal`.
- Evidence links are returned inside each company record.
- The dashboard stores saved runs in localStorage only. For team-wide persistence, add Supabase, Airtable, Firebase, or Netlify Blobs.
- This starter is intentionally lightweight so it can be imported into Netlify quickly.
