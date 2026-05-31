# Listen Meet Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Listen Meet buildable, safer for real meeting audio, more reliable in production, and easier to maintain.

**Architecture:** Keep the current Next.js App Router structure, but move duplicated meeting summary/export logic into shared utilities. Harden API routes with validation, generic errors, rate limiting, and safer secret handling. Keep large-file support honest by enforcing the Vercel Function payload limit until a direct-storage pipeline is introduced.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Radix UI, Google Gemini SDK, Vitest.

---

## File Structure

- Modify `package.json` and `package-lock.json`: dependency updates, audit fixes, scripts for lint/typecheck/test.
- Modify `next.config.ts`: production security headers.
- Create `src/lib/audio-constraints.ts`: upload limits, accepted MIME types/extensions, validation helpers.
- Create `src/lib/meeting-summary.ts`: shared meeting summary types, JSON parsing, normalization, TXT export generation.
- Create `src/lib/rate-limit.ts`: small in-memory IP limiter for expensive local/serverless operations.
- Create `src/app/api/test-gemini/route.ts`: API key/env health check and lightweight Gemini validation.
- Modify `src/app/api/process-audio/route.ts`: validation, generic error handling, Gemini response parsing, shared TXT generation.
- Modify `src/app/page.tsx`: safer API key flow, no persistent localStorage secret, real test route, cleaner processing state.
- Modify `src/hooks/useAdvancedAudioRecorder.ts`: single monitoring stream per operation, cleanup, upload size/type validation.
- Modify `src/components/AdvancedAudioRecorder.tsx`: correct upload max copy, processing guard, less console noise.
- Modify `src/components/AudioSetupModal.tsx`: fix lint errors and external-link safety.
- Modify `src/components/MeetingsList.tsx`: confirmation before delete, safer event handling, empty search state.
- Modify `src/utils/storage.ts`: import shared types/export generation and reduce duplication.
- Update `README.md`: document `GEMINI_API_KEY`, privacy model, upload limit, test/build commands.
- Add `src/lib/*.test.ts`: tests for validation, parsing, export formatting, and rate limiting.

## Task 1: Baseline Hygiene and Dependency Security

- [ ] Update runtime dependencies using `npm install next@latest react@latest react-dom@latest eslint-config-next@latest`.
- [ ] Add `vitest` and `zod` with `npm install -D vitest` and `npm install zod`.
- [ ] Replace `lint` script with `eslint .`, add `typecheck`, `test`, and `verify` scripts.
- [ ] Run `npm audit --audit-level=moderate`.
- [ ] Run `npm run build` and note any migration errors from the Next upgrade.

## Task 2: Shared Meeting Types and Export Generation

- [ ] Create `src/lib/meeting-summary.ts` with `MeetingSummary`, `MeetingRecord`, `parseMeetingSummary`, `normalizeMeetingSummary`, `buildMeetingTxt`, and `buildAllMeetingsTxt`.
- [ ] Move duplicated TXT generation from `src/app/api/process-audio/route.ts` and `src/utils/storage.ts` into the shared utility.
- [ ] Add tests covering:
  - JSON wrapped in Markdown fences.
  - Missing optional fields.
  - Invalid JSON rejection.
  - TXT content for single and multi-meeting exports.

## Task 3: Audio Upload Constraints

- [ ] Create `src/lib/audio-constraints.ts` with a conservative `MAX_AUDIO_UPLOAD_BYTES` below Vercel's 4.5MB payload limit.
- [ ] Validate both MIME type and extension.
- [ ] Use the same helper in client upload and server route.
- [ ] Update UI copy from 100MB to the real limit.
- [ ] Add tests for allowed/rejected MIME types, extensions, and file size.

## Task 4: API Secret Handling and Gemini Test Route

- [ ] Add `src/app/api/test-gemini/route.ts`.
- [ ] `GET` should report whether `process.env.GEMINI_API_KEY` is configured without exposing it.
- [ ] `POST` should validate a provided BYOK key with a small Gemini call.
- [ ] Remove persistent `localStorage` storage of `gemini-api-key`; use server env first, then in-memory/session-only BYOK.
- [ ] Clear the old localStorage key on app load.

## Task 5: Harden Audio Processing Route

- [ ] Validate `audio`, `duration`, `apiKey`, type, extension, and size before calling Gemini.
- [ ] Add best-effort IP rate limiting before expensive model calls.
- [ ] Stop logging raw model output and sensitive request data.
- [ ] Use shared parsing/normalization for Gemini JSON.
- [ ] Return generic client errors and keep internal details server-side.
- [ ] Use shared TXT generation for the response.

## Task 6: Audio Hook Resource Cleanup

- [ ] Remove duplicate stream acquisition when recording starts.
- [ ] Keep one active analyser loop and cancel it deterministically.
- [ ] Ensure `AudioContext`, streams, recorder, intervals, and animation frames are cleared on stop/unmount/error.
- [ ] Remove high-frequency console logging from the analyser loop.
- [ ] Keep pause/resume duration accounting intact.

## Task 7: UI Reliability and Lint Cleanup

- [ ] Escape or restructure quoted text in `AudioSetupModal.tsx`.
- [ ] Add `rel="noreferrer"` for external links and use safe `window.open` handling.
- [ ] Remove stale auto-download commented block and fix copy that says automatic download still happens.
- [ ] Disable recording/upload controls while processing where applicable.
- [ ] Add delete confirmation in the meeting history.
- [ ] Fix dropdown item click propagation so card selection does not toggle accidentally.

## Task 8: Docs and Verification

- [ ] Update README install/configuration docs for `.env.local` and optional session BYOK.
- [ ] Document upload limits and why larger audio needs a storage-backed pipeline.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `npm audit --audit-level=moderate`.
- [ ] Confirm `git status --short` contains only intentional project files.

## Follow-Up Architecture After This Pass

- [ ] Add Vercel Blob or another object-storage direct-upload path for long recordings.
- [ ] Add authenticated accounts and encrypted server-side storage if meeting history must sync across devices.
- [ ] Add E2E coverage for record/upload/process/history/delete.
- [ ] Add observability for Gemini failures and payload-limit errors.
