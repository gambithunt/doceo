# Doceo

Doceo is a SvelteKit-based AI-assisted learning platform prototype for structured school learning. It is designed around three modes:

- Learn from scratch
- Exam revision
- Ask question

The current implementation includes a typed curriculum model, seeded lesson and question content, mastery tracking, local session persistence, revision planning, ask-question guidance, analytics events, and a light/dark IBM Plex Mono UI aligned to the project spec in [docs/prompt.md](/Users/delon/Documents/code/projects/doceo/docs/prompt.md).

## Stack

- SvelteKit
- Svelte 5
- TypeScript
- Tailwind CSS v4
- Optional Supabase client hook

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The local dev server runs on `http://localhost:5185`.

Run typecheck:

```bash
npm run typecheck
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Environment

Supabase is optional in the current app. If you want to wire a real backend, define:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Without these values, the app still runs with the built-in local demo state.

## Project Structure

- [src/routes/+page.svelte](/Users/delon/Documents/code/projects/doceo/src/routes/+page.svelte): main application shell
- [src/lib/types.ts](/Users/delon/Documents/code/projects/doceo/src/lib/types.ts): domain types
- [src/lib/data/platform.ts](/Users/delon/Documents/code/projects/doceo/src/lib/data/platform.ts): seeded curriculum, lessons, questions, and platform helpers
- [src/lib/stores/app-state.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.ts): app state, persistence, sessions, analytics, and user interactions
- [src/lib/components](/Users/delon/Documents/code/projects/doceo/src/lib/components): learning mode and dashboard UI components
- [docs/prompt.md](/Users/delon/Documents/code/projects/doceo/docs/prompt.md): source product specification and completion checklist

## Current Behavior

- Uses seeded demo curriculum content for Mathematics
- Stores progress and session state in browser local storage
- Supports lesson practice and mastery updates
- Generates a revision plan from current subject/topic state
- Produces structured ask-question tutoring responses
- Tracks recent analytics events in-app
- Supports light and dark themes

## Notes

- `npm run build` currently succeeds.
- The production build emits a Svelte/Vite chunking warning, but it does not fail the build.
- `.svelte-kit` and `node_modules` are generated local artifacts.
