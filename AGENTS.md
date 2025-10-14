# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds NestJS modules such as `auth`, `jlpt-voca`, `profiles`, and shared helpers under `common/`. Root wiring lives in `app.module.ts` and bootstrap logic in `main.ts`.
- `views/` contains Handlebars templates for rendered responses. Swagger artifacts land in `dist/` after build, while generated API docs are tracked in `swagger.json`.
- Integration specs reside in `test/` (`app.e2e-spec.ts`) with configuration in `jest-e2e.json`. Shared type definitions are under `src/types/`.

## Build, Test, and Development Commands
- Install dependencies with `npm install`.
- `npm run start:dev` launches the API in watch mode; use `npm run start` for a single run and `npm run start:prod` from the compiled output in `dist/`.
- `npm run build` compiles TypeScript and triggers Swagger generation (`GENERATE_SWAGGER=true node dist/main.js`). For Vercel builds use `npm run vercel-build`.
- `npm run test`, `npm run test:watch`, `npm run test:cov`, and `npm run test:e2e` cover unit, watch, coverage, and end-to-end suites respectively.

## Coding Style & Naming Conventions
- Follow NestJS patterns: modules `*.module.ts`, controllers `*.controller.ts`, services `*.service.ts`. Export reusable utilities from `src/common/`.
- TypeScript targets ES2022 via `tsconfig.json`; prefer async/await, explicit return types for public APIs, and `PascalCase` for classes.
- Format code with Prettier (`npm run format`); default indentation is two spaces with semicolons enforced. Avoid manual formatting overrides unless justified.

## Testing Guidelines
- Unit specs live next to implementation files and use the `*.spec.ts` pattern configured in `package.json`.
- Keep tests deterministic by mocking Supabase and external HTTP calls. Share fixtures under `src/common/testing/` if you add them.
- Maintain coverage by running `npm run test:cov`; investigate regressions before submitting.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`) as seen in recent history (`git log`).
- Each PR should note the problem, summarize the solution, list test commands executed, and link relevant issues. Include screenshots for user-facing template changes in `views/`.
- Ensure CI steps (build, lint, tests) pass locally before opening a PR.
