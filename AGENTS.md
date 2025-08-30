# Repository Guidelines

## Project Structure & Module Organization
- `Jobbify/`: Expo React Native mobile app (screens in `app/`, UI in `components/`, config in `app.config.js`).
- `file_text_backend/`: Flask API for text extraction and resume analysis.
- `scripts/`: Utility Node scripts (e.g., Supabase checks).
- `assets/`, `setup/`: Shared assets and setup helpers.

## Build, Test, and Development Commands
- Mobile (Expo):
  - `cd Jobbify && npm install`: Install dependencies.
  - `npm start` (dev client), `npm run android`, `npm run ios`, `npm run web`: Run locally.
  - `npm test`, `npm run test:watch`, `npm run test:coverage`: Run Jest tests and coverage.
- Backend (Flask):
  - `cd file_text_backend && pip install -r requirements.txt`: Install Python deps.
  - Windows: `set FLASK_APP=extract_text_api.py && flask run --host=0.0.0.0 --port=5000`
  - Unix: `FLASK_APP=extract_text_api.py flask run --host=0.0.0.0 --port=5000`
  - Quick check: `python file_text_backend/test_api.py` (adjust `API_BASE_URL` if needed).

## Coding Style & Naming Conventions
- JavaScript/TypeScript (Jobbify): 2-space indent; TypeScript preferred (`.ts/.tsx`). Components in `PascalCase`, variables/functions in `camelCase`, hooks start with `use`. Screens live under `app/` (Expo Router), e.g., `app/(tabs)/home.tsx`.
- Python (backend): 4-space indent; `snake_case` for functions/vars. Keep route handlers small and pure; move helpers to separate functions.

## Testing Guidelines
- Mobile: Jest + React Native Testing Library. Tests in `__tests__/` or `*.test.(ts|tsx)`. Aim for meaningful unit tests of components, hooks, and services. Use `npm run test:coverage` to gauge coverage.
- Backend: Smoke-test endpoints via `test_api.py`. For local changes, validate `/health`, `/extract-text`, `/analyze-resume` with small payloads.

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`). Example: `feat(job-list): add Ashby pagination`.
- PRs: Include a clear description, linked issues, screenshots for UI, and testing steps (commands + expected results). Keep scope focused; update docs and `.env.example` when config changes.

## Security & Configuration Tips
- Never commit secrets. Use environment variables:
  - Backend: `OPENROUTER_API_KEY` (required for AI analysis).
  - Mobile (Expo): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Add new keys to `.env.example`. Validate locally before pushing changes.
