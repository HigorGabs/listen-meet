# Review Hardening Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the security, architecture, accessibility, i18n, and verification issues found in the pre-PR review.

**Architecture:** Keep the app usable locally while making production safer by disabling server-key fallback unless explicitly enabled. Move provider/prompt/export behavior behind small helpers, validate uploads before provider calls, and keep UI fixes scoped to existing components.

**Tech Stack:** Next.js App Router, React 19, Vitest, Testing Library, Radix/shadcn primitives, Google Gemini REST header authentication.

---

### Task 1: Production Server-Key Guard And Model Rate Limit

**Files:**
- Modify: `src/lib/ai-providers.ts`
- Modify: `src/app/api/models/route.ts`
- Modify: `src/app/api/process-audio/route.ts`
- Modify: `src/lib/rate-limit.ts`
- Test: `src/lib/ai-providers.test.ts`
- Test: `src/app/api/models/route.test.ts`

- [ ] Write failing tests that production does not expose server keys by default and `/api/models` rate limits repeated POSTs.
- [ ] Implement `canUseServerApiKeys()` and route-level use of `modelsLimiter`.
- [ ] Send Gemini model-listing keys through `x-goog-api-key`, not query string.
- [ ] Verify focused tests pass.

### Task 2: Remove Public Gemini Debug Route

**Files:**
- Delete: `src/app/api/test-gemini/route.ts`
- Modify: `src/lib/rate-limit.ts`
- Modify: `src/lib/rate-limit.test.ts`

- [ ] Add/adjust tests so no runtime limiter remains solely for the deleted debug route.
- [ ] Delete the route and unused limiter.
- [ ] Verify route search has no active references.

### Task 3: Upload Hardening

**Files:**
- Modify: `src/lib/audio-constraints.ts`
- Modify: `src/app/api/process-audio/route.ts`
- Test: `src/lib/audio-constraints.test.ts`
- Test: `src/app/api/process-audio/route.test.ts`

- [ ] Write failing tests for missing `Content-Length` and spoofed audio payloads.
- [ ] Add `validateAudioSignature()` and reject invalid uploaded bytes before provider calls.
- [ ] Reject missing/invalid `Content-Length` before multipart parsing.
- [ ] Verify focused tests pass.

### Task 4: Backend I18n And Provider-Aware Export

**Files:**
- Modify: `src/lib/meeting-summary.ts`
- Modify: `src/app/api/process-audio/route.ts`
- Modify: `src/app/page.tsx`
- Test: `src/lib/meeting-summary.test.ts`
- Test: `src/app/api/process-audio/route.test.ts`

- [ ] Write failing tests for English exports and non-Gemini provider footer.
- [ ] Pass `locale` through processing.
- [ ] Localize prompt language, export labels, date formatting, and provider footer.
- [ ] Verify focused tests pass.

### Task 5: Recorder Cleanup And Render Throttling

**Files:**
- Modify: `src/hooks/useAdvancedAudioRecorder.ts`
- Test: `src/hooks/useAdvancedAudioRecorder.test.tsx`

- [ ] Write failing tests for unmount cleanup during recording.
- [ ] Extract cleanup helpers for recorder, streams, timers, animation frame, and audio context.
- [ ] Throttle audio-level state updates to roughly 15fps.
- [ ] Verify focused tests pass.

### Task 6: UI Accessibility And Contrast Fixes

**Files:**
- Modify: `src/components/StudioCommandRail.tsx`
- Modify: `src/components/MeetingsList.tsx`
- Modify: `src/components/AdvancedAudioRecorder.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/StudioCommandRail.test.tsx`
- Test: `src/components/MeetingsList.test.tsx`
- Test: `src/app/page.test.tsx`

- [ ] Write failing tests for menu semantics, named icon buttons, status live regions, labels, and light-theme contrast classes.
- [ ] Use Radix menu items/radio semantics or accessible controls without nested broken menu patterns.
- [ ] Add `aria-label`, `aria-live`, `role=status`, associated labels, and theme tokens for status colors.
- [ ] Verify focused tests pass.

### Task 7: Verification Hygiene

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `.gitignore`
- Delete local artifacts: `src/components/* 2.tsx`, `.next/types/* 2.ts`

- [ ] Add Node engine metadata for Next 16.
- [ ] Update README stack/prerequisites and production server-key behavior.
- [ ] Remove duplicate copied artifacts from the workspace.
- [ ] Run `npm audit --omit=dev`, `npm run verify`, and `npx tsc --noEmit --incremental false`.
- [ ] Keep `npm run dev` available on `http://localhost:3000`.
