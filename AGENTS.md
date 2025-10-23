# Repository Guidelines

## Project Structure & Module Organization
- `src/` hosts NestJS feature modules (`auth`, `jlpt-voca`, `profiles`, `ai`) plus shared helpers in `src/common/`.
- Core wiring lives in `src/app.module.ts`, which now registers both `AppController` and `AiController`; `src/main.ts` contains bootstrap logic and Swagger bootstrapping.
- JLPT vocabulary OpenAI workflows are centralized in `src/jlpt-voca/japanese-sentence.workflow.ts` and orchestrated by `JlptVocaAgentsService`; keep reusable logic there.
- Handlebars responses sit in `views/`, and compiled assets with generated Swagger docs land under `dist/` after `npm run build`.
- End-to-end specs live under `test/` (e.g., `test/app.e2e-spec.ts`, `test/jlpt-voca.e2e-spec.ts`) with configuration in `jest-e2e.json`; shared types are tracked in `src/types/`.

## Build, Test, and Development Commands
- `npm run start:dev` — run the API with hot reload via Nest CLI.
- `npm run start` — launch the compiled app once; `npm run start:prod` runs from `dist/`.
- `npm run build` — transpile TypeScript and emit Swagger (delegate to `npm run generate:swagger` → `GENERATE_SWAGGER=true node dist/main.js`).
- `npm run vercel-build` / `npm run build:vercel` — production build variants for Vercel; keep both in sync with infra expectations.
- `npm run test`, `test:watch`, `test:cov`, `test:e2e` — unit, watch mode, coverage, and e2e suites; run before submitting changes. JLPT e2e specs stub Supabase and `JlptVocaAgentsService` responses.

## Coding Style & Naming Conventions
- Target ES2022 with TypeScript; prefer async/await and explicit return types on public APIs.
- Follow NestJS naming (`*.module.ts`, `*.controller.ts`, `*.service.ts`) and keep reusable utilities in `src/common/`.
- Place new agent workflows beside their feature module (e.g., `jlpt-voca`) and model inputs/outputs with zod like existing `japanese-sentence.workflow.ts`.
- Format with Prettier (`npm run format`); two-space indentation and semicolons are enforced. Avoid manual stylistic overrides.
- When adding or updating UI under `views/`, reference Onsen UI’s visual concept—favor its teal/blue primaries with warm coral accents to keep colors and gradients consistent across components.

## AI Integrations & Guardrails
- OpenAI integrations rely on `@openai/agents`, `@openai/guardrails`, and the official `openai` SDK; reuse `JlptVocaAgentsService` and the shared workflow helpers when extending functionality.
- Guardrail configuration for moderation/PII/jailbreak detection lives in `src/jlpt-voca/japanese-sentence.workflow.ts`; do not bypass tripwire handling and surface actionable error messages to callers.
- The AI HTTP helpers (`src/ai/ai.controller.ts`, `src/jlpt-voca/jlpt-voca.http`) illustrate expected payloads—mirror existing validation patterns when adding endpoints.

## Testing Guidelines
- Place unit specs alongside implementations using the `*.spec.ts` suffix.
- Mock Supabase and external HTTP calls to keep suites deterministic; share fixtures under `src/common/testing/` when adding new ones.
- Exercise new agents through descriptive unit or e2e tests (see `test/jlpt-voca.e2e-spec.ts` for mocking patterns) and ensure guardrail failure paths are covered.
- Maintain high coverage via `npm run test:cov`; investigate coverage drops before raising a PR.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat: add jlpt vocab parser`, `fix: handle expired tokens`).
- PRs should outline the problem, solution, and executed checks; link relevant issues and attach screenshots for template updates in `views/`.
- Confirm build, lint, and test commands succeed locally prior to submission to match CI expectations.

## Security & Configuration Tips
- Store sensitive environment variables outside the repo and load them via `.env`; never commit secrets.
- `OPENAI_API_KEY` must be present for sentence generation workflows—fail fast with helpful errors if missing and avoid logging secrets or full AI responses.
- When touching Supabase configuration, auth flows, or OpenAI guardrails, sync with stakeholders to ensure changes align with deployed policies.
