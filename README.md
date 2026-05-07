# Pplant

Pplant is a mobile-first student-life planner for money, time, work income, tasks, reminders, savings, and reflection.

## Foundation

This app was initialized from the Expo React Native default template for SDK 55:

```bash
npx create-expo-app@latest Pplant-scaffold-20260507-2315 --template default@sdk-55 --yes --no-install
```

The scaffold was created in a temporary sibling directory and merged into this existing `Pplant` workspace to avoid creating a nested `Pplant/Pplant` app and to preserve the BMad planning artifacts.

Verified local tool versions at scaffold time:

```bash
node --version # v22.22.2
npm --version  # 10.9.7
npx create-expo-app@latest --version # 3.5.3
```

## Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm start
```

Verification scripts:

```bash
npm run typecheck
npm run lint
npm test
```

Optional Expo checks:

```bash
npx expo --version
npx expo-doctor
```

## Architecture Guardrails

- Expo React Native, TypeScript, and Expo Router are the mobile foundation.
- Routes live in `src/app`; route files should stay thin and compose feature screens only.
- Feature orchestration belongs in `src/features`.
- Domain logic belongs in `src/domain` and should be testable without React Native UI.
- SQLite access belongs behind repositories in `src/data`; UI components must not import SQLite clients, Drizzle tables, or migrations.
- Expected failures should use `AppResult` and `AppError`.
- Boundary validation should use Zod.
- Money values must use integer minor units with currency codes.
- Diagnostics must be redacted and must not include raw receipt images, OCR text, spending details, income values, task contents, reminder text, or reflections.

## MVP Boundaries

Pplant is local-first for MVP. Do not add account auth, cloud sync, a backend API, server-side reminders, bank or payment integrations, investment or debt features, or regulated-finance flows unless the PRD and architecture are explicitly updated.

## Future Story Boundaries

- Story 1.2 owns single-user local workspace behavior.
- Later stories own concrete money, task, reminder, receipt, work, review, privacy, and offline behavior.
- This foundation story intentionally keeps feature screens as calm placeholders with architecture-ready boundaries.
