# Session Execution Flow

## 1. UI Triggers (`components/session/session-page.tsx`, `components/session/start-session-button.tsx`)
- The session page renders metadata for the selected `sessionType` and provides a `StartSessionButton`. Pressing **Start Session** calls `useLearningSession.startSession`, which blocks other active sessions, POSTs `/api/sessions/start`, and routes to `/{type}/session/{id}` once the returned session is `active`/`paused`.
- History/analytics are fetched via `/api/sessions/by-type` and rendered as charts plus `SessionResultsView`. If the latest completed session matches the current type, results display inline until `clearResults` is invoked.
- When a session is already active for the same type, the button switches to an **End Session** control that first runs `completeQuestions`, then `/api/sessions/{id}/end` to finalise status.

## 2. Client-Side Session Management (`lib/sessions/learning-session-context.tsx`)
- Maintains `activeSession`, `sessionQuestions`, progress, and `generationState`. It debounces mutations through `enqueueUpdate`, batching answer/metadata changes into `pendingUpdateRef` and PATCHing `/api/sessions/{id}` after `SAVE_DEBOUNCE_MS`.
- Uses `navigator.sendBeacon` or `forceSave()` on tab hide/unload to flush unsent answers. Periodically polls `generation` status (every 2.5 s) until question generation completes/fails.
- `setQuestionAnswer` normalises answers locally, updates progress, and queues a payload containing `answers`, `metadata.activeQuestionId/activeView`, and `data.progress/state`.
- `submitAnswer` POSTs `/api/sessions/{id}/answer`, merges back the returned `QuestionResult`, and forces a save so the server snapshot stays consistent.
- `completeQuestions` flushes pending updates, POSTs `/api/sessions/{id}/complete`, hydrates `latestResults`, syncs local questions with graded answers, then refreshes the session snapshot. `endSession` ensures one final flush before POSTing `/api/sessions/{id}/end`.

## 3. Session APIs & Controller (`app/api/sessions/*`, `lib/sessions/session-controller.ts`)
- `/api/sessions/start` authenticates the user, validates `SessionTypeEnum`, and calls `createSession`, which:
  - Initializes metadata/data via `initializeSessionData`, sets `data.generation.status = 'in_progress'`, and persists the skeleton record.
  - Launches `generateQuestionsForSession` asynchronously (without awaiting completion) and returns the freshly loaded session.
- `/api/sessions/{id}` (PATCH) funnels through `updateSessionForUser`, merging incoming `answers`, `data` (questions/results/progress/state/metrics), and `metadata`, sanitising before persisting.
- `/answer`, `/complete`, and `/end` respectively call `gradeAnswer`, `completeSessionForUser`, and `endSessionForUser`, each ensuring writes go through `QuestionManager`, `finaliseSession`, and `touchSession` to keep timestamps/duration accurate.

## 4. Question Generation Pipeline
- Session configs (`lib/sessions/configs/*.ts`) declare fixed layouts per Teil with module/scoring/source overrides. `getSessionLayout` normalises these definitions so each Teil has an `id`, label, module, and override bundles.
- `generateQuestionsForSession`:
  - Optionally resets questions/answers/results/progress/state when `regenerate` is true and stamps `data.generation`.
  - Spins up a worker pool (up to 4 concurrent) that pulls the next layout entry, calls `generateTeilQuestions`, and queues results per Teil.
  - `generateTeilQuestions` builds a `QuestionModuleTask`, routes it through `executeQuestionModuleTask`, and may insert an example item, redistribute points, and record token usage/error metrics. Successful batches are appended via `appendQuestion`, updating `progress`, `metrics`, `generation.currentTeil`, and `activeQuestionId`.
  - Once all Teils flush, `generation.status` changes to `completed` (or `failed` on error), capturing totals and timestamps.
- `executeQuestionModuleTask` deep-merges module defaults with layout overrides for prompts/render/scoring/source before calling the module’s `generate`. Each returned question is annotated with `moduleId`, `layoutId`, render config, and scoring policy so the client knows how to display/score it later.

## 5. Source Creation & Customisation
- `SessionSourceOptions` let each Teil influence:
  - `raw` prompts (theme/system/user) for initial passage creation.
  - `gaps` parameters (required gap count, prompts) for post-processing.
  - Additional module-specific metadata (`renderOverrides`, `scoringOverrides`, `metadata`).
- Reading sources flow through `generateSourceWithGaps`:
  1. `generateRawSource` calls `customModel(ModelId.CLAUDE_HAIKU_4_5)` with a schema enforcing theme/title/subtitle/context and can seed prompts with a curated news headline (`lib/news/news-topic-pool.ts`).
  2. `identifyGapsInSource` (same model) enforces exact `[GAP_n]` placeholders, with a deterministic fallback gap placement if the AI under-delivers.
- Listening content leverages `generateNewsBackedAudioTranscript`, again using Claude 4.5 Haiku, to first outline and then script multi-speaker transcripts complete with metadata for playback/TTS. MCQs for these transcripts are produced via the same module interface.

## 6. Model Usage (`lib/ai/models.ts`, `lib/ai/model-registry.ts`)
- `customModel` now resolves every request to Anthropic’s Claude 4.5 Haiku (`ModelId.CLAUDE_HAIKU_4_5`), so all question generation, grading, and audio scripting share a single consistent provider.
- Usage records (`ModelUsageRecord`) capture prompt/completion tokens per Teil, enabling `generateQuestionsForSession` to log aggregate token counts and estimated cost via `calculateCost`.

## 7. Completion, Results, and Analytics
- `finaliseSession` (invoked by `/complete` or `/end` when status→completed) runs `QuestionManager.finaliseSession`, ensuring every question is answered/graded, storing `resultsSummary`, `completedAt`, `duration`, and question-level data for future display.
- `SessionResultsView` uses the returned `results` and `summary`, while `/api/sessions/by-type` pulls historical sessions so `SessionPage` can compute chart points, per-session summaries, and paginated history. If a summary is missing server-side, the client falls back to `buildQuestionSessionSummary`.

## 8. Key Guarantees
- The server is the source of truth: autosave never mutates Firestore directly from the UI; everything routes through controller helpers that enforce sanitisation and metadata updates.
- Generation is resilient: Teils retry independently, partial results are persisted incrementally, and `generation` metadata ensures the UI knows whether it should keep polling, resume, or surface an error.
- Model usage is observable: every AI call (raw sources, gap extraction, question crafting, audio transcripts) records tokens so the session generator can log throughput and cost for each Teil.
