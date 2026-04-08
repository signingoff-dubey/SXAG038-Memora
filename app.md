# Android Kotlin MVP Plan (Mirror of Web App)

## TODO (Execution Plan)

- T1: Define MVP scope and success criteria
- T2: Create Android project skeleton (Compose) and CI groundwork
- T3: Implement local data layer (Room) and DataStore
- T4: Implement Retrofit API layer and DTO mappings
- T5: Build offline-first sync (WorkManager) and conflict policy
- T6: Implement Chat UI (Compose) and Memory Inspector UI
- T7: Implement Chat History and Settings screens
- T8: Add encryption for on-device storage; secure API key handling
- T9: Add unit/integration tests for DAOs, repositories, and sync
- T10: Set up CI/CD and Play Store prep
- T11: MVP demo with offline/online sync flows
- T12: Prepare migration path for future versions (schema upgrades)

## How to Do It (Approach)
- Phase 0: Planning (3–5 days)
  - Finalize MVP surface, storage strategy (Room + DataStore + optional Encryption), sync policy.
  - Create a simple risk log and success criteria.
- Phase 1: Skeleton & Architecture (7–12 days)
  - Boot Android project with Kotlin + Compose; set up DI (Hilt).
  - Add Retrofit scaffold and a base API client; establish a base URL.
  - Create initial Room DB schema and DataStore keys; ensure migrations plan exists.
- Phase 2: Local Data Layer (10–20 days)
  - Implement Room entities (Memory, Session, Message, ModelConfig) and DAOs.
  - Implement mappers from backend DTOs to local models.
  - Implement a repository pattern to decouple data sources.
- Phase 3: Network Layer (10–18 days)
  - Implement Retrofit interfaces for chat, memories, models, and context.
  - Implement mapping from API responses to local entities; set up error handling.
  - Introduce secure storage for API keys if needed.
- Phase 4: Sync & Offline-first (14–22 days)
  - Implement WorkManager sync: push local changes, pull server state, conflict resolution.
  - Implement backoff, retries, and offline queues.
  - Validate consistency and recovery from partial failures.
- Phase 5: UI MVP (14–28 days)
  - Build Chat UI (messages, attachments placeholders, memory references).
  - Build Memory Inspector UI with search/filter and basic analytics.
  - Build Chat History and Settings screens; ensure navigation works.
- Phase 6: Security, Tests, QA (7–14 days)
  - Enable encryption for sensitive data; add keystore usage.
  - Add unit/integration tests for DAOs, repos, and sync logic.
  - Add basic UI accessibility checks.
- Phase 7: Build, QA, Deployment (5–10 days)
  - Set up CI; build APK/AAB; prepare Play Store assets.
  - Create a quick demo script and release plan.

## What to Deliver (Acceptance Criteria)
- Local-first functionality with all web-app features represented in the MVP (chat, memories, contexts, model config, user profile).
- Data persisted on device across app restarts; offline mode works without backend connectivity.
- Secure handling of sensitive data; API keys stored securely and not in plaintext.
- End-to-end sync path with backend when online; deterministic conflict resolution.
- Clean architecture and test coverage for critical components.

## Milestones & Timeline (Rough)
- MVP skeleton: 1–2 weeks
- Local storage + network glue: 2–3 weeks
- Sync layer and UI MVP: 3–4 weeks
- Security, tests, QA: 2 weeks
- Final polish, demo: 1 week

If you want, I can convert this into a ready-to-run backlog with task estimates per day, assignable to a team, and a sprint plan. Also I can provide a starter repository scaffold (Gradle setup, package layout, sample DAOs, and Retrofit interfaces) upon request.
