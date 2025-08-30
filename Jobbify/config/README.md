Private API Config

- Copy `private.example.ts` to `private.ts` and fill your real keys and URLs.
- `private.ts` is gitignored; keep it local and out of the repo.
- The app reads values from `config/private.ts` first, then falls back to env variables (EXPO_PUBLIC_*).

Keys used:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`
- `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `RAPIDAPI_KEY`
- `SITE_URL`, `SITE_NAME`, `API_URL`, `FILE_TEXT_BACKEND_URL`

