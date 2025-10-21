# Learning Session Architecture (TL;DR)

  ## Modules
  - `session-controller.ts` – orchestrates the flow exposed to API routes (start,
  update, complete, end).
  - `session-store.ts` – Firestore access + sanitisation (`touchSession`,
  `persistSession`, `loadSessionForUser`).
  - `session-answers.ts` – applies answer deltas (`applyAnswersToSession`,
  `ensureQuestionIdentifiers`, `normaliseAnsweredFlag`).
  - `session-grading.ts` – runs `QuestionManager` for individual answers and final
  completion (`gradeAnswer`, `finaliseSession`).
  - `learning-session-context.tsx` – client state holder; debounces updates, queues
  autosave, handles `/complete` once.
  - Routes import `session-service.ts`, which simply re-exports the controller.

  ## Lifecycle
  1. **Start**
     - `createSession` writes a skeleton session.
     - `generateQuestionsForSession` builds the full question set and persists it.

  2. **Autosave**
     - Client mutates local question state, queues a debounced `/update`.
     - `updateSessionForUser` merges `answers`, fills metadata, sanitises, writes.
     - All writes pass through `sanitizeForFirestore`, so timestamp blobs become real
  `Date`s.

  3. **Completion**
     - The provider flushes outstanding updates, then calls `/complete` exactly once.
     - `completeSessionForUser` runs `QuestionManager.finaliseSession`, stores
  results, returns summary.
     - Results appear immediately; on close we call `/end` to mark the session status.

  4. **End session outside completion**
     - When invoked (e.g. “End session” button), `endSessionForUser` marks status
  + `endedAt`.

  ## Marking & Scoring
  - Every question carries `points = 1` (example gap gets `0`), so total score equals
  correct answers.
  - All scoring happens server-side in `session-grading.ts`; client components never
  colour answers pre-submission.
  - `SessionResultsView` only reflects the summary returned by `/complete`.

  ## Key Rules
  - No redundant writes: `/update` only sends changed answers + metadata, `/complete`
  runs once.
  - Never bypass `sanitizeForFirestore`; it strips invalid timestamp objects,
  preventing Firestore crashes.
  - For new question types: update configs, `session-answers.ts` (if answer shape
  differs), and ensure schema outputs `points`.

  Keep this separation intact—modules stay single-purpose, autosave stays debounced,
  and the server remains the single source of truth.