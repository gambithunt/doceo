# Doceo

Doceo turns curiosity into focused, playable learning experiences and quietly
adapts what comes next from what the learner does.

The current application is an experience-validation prototype. It uses an
authored black-hole lesson and simulated progressive media; it does not yet use
live AI generation, authentication, a database, or payments.

## Development

```sh
npm install
npm run dev
```

## Quality checks

```sh
npm run check
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

Install the Playwright browser once before running end-to-end tests:

```sh
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
```

The active product and prototype decisions live in
[`docs/workstreams/active`](docs/workstreams/active).
