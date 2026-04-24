# Agent Instructions

## Core Rules
- Follow project architecture and conventions
- Prefer simple, maintainable solutions
- Always use RED GREEN TDD
- Do not make destructive changes without approval

## Documentation
- Start with the smallest relevant canonical doc instead of reading all of `/docs`
- Use `/docs/README.md` to choose the right project document
- Treat `/docs/workstreams/` as implementation history and sprint notes, not default source of truth
- Shared personal skills and references are provided through the configured skills system

## UI Work
- Use the ui-design skill
- Always be mindefull of mobile design, every part of the site should work equally well on desktop and mobile
- When making design updates or changes always make changes to both light and dark mode colors
- Read `/docs/design-langauge.md` before implementing or revising app UI so new work matches the established component language
- Use `/docs/design-langauge.md` as the local source of truth for component hierarchy, tile states, spacing, and copy restraint

## Workstream usage
Only use workstreams from:
docs/workstreams/active/
Do not use workstreams from:
docs/workstreams/archive/
docs/workstreams/archived/
docs/workstreams/legacy/
docs/workstreams/completed/
unless the prompt explicitly names one of those files.
When implementing a task, treat the named workstream file as the source of truth.
Do not infer requirements from similarly named older workstreams.
When a workstream is completed move it to the completed dir

----
