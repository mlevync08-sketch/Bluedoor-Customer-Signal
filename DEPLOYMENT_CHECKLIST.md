# Deployment checklist

## Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

## Required env var

- `OPENAI_API_KEY`

## Optional env vars

- `OPENAI_MODEL` — defaults to `gpt-5.5`
- `SIGNAL_ADMIN_TOKEN` — protects the signal function with a dashboard token

## Test URLs after deploy

- `/` should load the dashboard
- `/.netlify/functions/health` should return `{ "ok": true }`

## Common issues

### Missing OPENAI_API_KEY

Add `OPENAI_API_KEY` in Netlify environment variables, make sure Functions scope is included, then redeploy.

### Unauthorized

You set `SIGNAL_ADMIN_TOKEN`, but the dashboard token field is blank or incorrect.

### Model/tool access error

Set `OPENAI_MODEL` to a model your OpenAI account can access.

### Scan too slow or too large

Lower the company limit from 25 to 10-15.
