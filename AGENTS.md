# Repository Guidelines

## Project Structure & Module Organization
- `src/` hosts NestJS feature modules (`auth`, `jlpt-voca`, `profiles`) plus shared helpers in `src/common/`.
- Core wiring lives in `src/app.module.ts`, while `src/main.ts` contains bootstrap logic and Swagger bootstrapping.
- Handlebars responses sit in `views/`, and compiled assets with generated Swagger docs land under `dist/` after `npm run build`.
- End-to-end specs reside in `test/app.e2e-spec.ts` with configuration in `jest-e2e.json`; shared types are tracked in `src/types/`.

## Build, Test, and Development Commands
- `npm run start:dev` — run the API with hot reload via Nest CLI.
- `npm run start` — launch the compiled app once; `npm run start:prod` runs from `dist/`.
- `npm run build` — transpile TypeScript and emit Swagger by invoking `GENERATE_SWAGGER=true node dist/main.js`.
- `npm run vercel-build` — production build variant for Vercel.
- `npm run test`, `test:watch`, `test:cov`, `test:e2e` — unit, watch mode, coverage, and e2e suites; run before submitting changes.

## Coding Style & Naming Conventions
- Target ES2022 with TypeScript; prefer async/await and explicit return types on public APIs.
- Follow NestJS naming (`*.module.ts`, `*.controller.ts`, `*.service.ts`) and keep reusable utilities in `src/common/`.
- Format with Prettier (`npm run format`); two-space indentation and semicolons are enforced. Avoid manual stylistic overrides.

## Testing Guidelines
- Place unit specs alongside implementations using the `*.spec.ts` suffix.
- Mock Supabase and external HTTP calls to keep suites deterministic; share fixtures under `src/common/testing/` when adding new ones.
- Maintain high coverage via `npm run test:cov`; investigate coverage drops before raising a PR.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat: add jlpt vocab parser`, `fix: handle expired tokens`).
- PRs should outline the problem, solution, and executed checks; link relevant issues and attach screenshots for template updates in `views/`.
- Confirm build, lint, and test commands succeed locally prior to submission to match CI expectations.

## Security & Configuration Tips
- Store sensitive environment variables outside the repo and load them via `.env`; never commit secrets.
- When touching Supabase configuration or auth flows, sync with stakeholders to ensure changes align with deployed policies.
