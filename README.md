# Schedy Demo

This build runs entirely in the browser and does not require Supabase, API keys, environment variables, or a backend.

## Run locally

```bash
npm install
npm run dev
```

## Demo behavior

- The invitation builder includes two built-in sample templates.
- Invitations are saved to browser `localStorage` and appear on Dashboard and Analytics.
- Editing an invitation uses its local demo record.
- Data stays in the current browser profile. Clearing browser site data removes the demo records.
- Telugu fields can be entered manually; automatic online transliteration has been disabled for this offline demo.

This is a frontend demonstration, not a production multi-user data store.
