# First Implementation Tasks

## Product Shell

- [x] Replace the mixed prototype homepage with a real app shell
- [x] Add a landing and authentication screen
- [x] Add onboarding for grade, curriculum, and subject context
- [x] Add a primary student navigation model

## Core Student Pages

- [x] Build dashboard page
- [x] Build subject page
- [x] Build topic roadmap and lesson navigation
- [x] Build lesson-first page layout
- [x] Build revision page
- [x] Build ask-question page
- [x] Build progress page

## UX Cleanup

- [x] Remove developer/debug UI from the student surface
- [x] Remove demo/reset controls from the production interface
- [x] Remove raw provider/state terminology from learner-facing screens
- [x] Make lesson flow the primary path through the product

## Data And State

- [x] Extend app state for auth, onboarding, navigation, and production flows
- [x] Normalize persisted state across versions
- [x] Make Supabase the persistence source when configured
- [x] Connect auth actions to Supabase client methods

## Validation

- [x] Run typecheck after the refactor
- [x] Run build after the refactor
- [x] Manually validate the main app flows
- [x] Validate the live GitHub Models path once `GITHUB_MODELS_TOKEN` is populated in `.env`
