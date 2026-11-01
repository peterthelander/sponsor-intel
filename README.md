# Sponsor Intel

A Next.js/React prototype for preparing a sponsor or private-equity meeting brief.
Provide a target firm, a short professional profile, a sector focus, and a 7-, 14-,
or 30-day lookback window. The app plans research queries and assembles a Markdown briefing.

**Status:** research prototype. Without an API key it uses built-in synthetic evidence;
with a key it requests Gemini query planning and Google Search-grounded synthesis.
Generated reports still need independent verification before professional use.

## Run locally

From the repository root, with Node.js and npm installed:

```bash
npm ci
cp .env.example .env.local
# Replace the placeholder GOOGLE_API_KEY in .env.local with your own key.
npm run dev -- --hostname 127.0.0.1
```

Open http://localhost:3000. To explore the mock path without external generation,
leave `GOOGLE_API_KEY` unset or empty. A nonempty placeholder is not a working key.
Gemini requests require provider access and may incur charges.

```bash
npm run build
npm start
```

## Try a briefing

Enter an example profile and target firm, choose the lookback period, and run the scan.
The response includes the planned queries and a `gemini` or `fallback` mode. Inspect
sources and dates rather than treating a polished report as verified evidence.
There is no checked-in sample representing a validated research outcome.

## Design and data flow

- `app/page.tsx`: briefing form, progress display, and Markdown rendering.
- `app/api/scan/route.ts`: server endpoint and basic request checks.
- `lib/sponsorScan.ts`: query planning, mock evidence, and Gemini synthesis.

Profile fields are stored in browser localStorage. Submitted profile, target,
sector, and notes are processed server-side and sent to Google when the keyed
path is used. The API key remains in the server environment. Keep credentials
out of Git and use non-confidential inputs for evaluation.

The endpoint has no authentication or rate limiting. This is a local prototype;
public hosting requires access controls and a review of costs and data handling.
There is no automated test suite configured. The existing lint script is inherited
from the prototype and has not been validated for its installed Next.js version.
