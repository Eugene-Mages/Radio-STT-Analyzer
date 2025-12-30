# RSTA Task Tracker

> Radio Speech-To-Text Analyzer — MVP Development Tasks

**Last Updated:** 2025-12-30
**Status:** MVP Complete (ElevenLabs finalization pending)

---

## Track Overview

| Track | Name | Status | Owner | Progress |
|-------|------|--------|-------|----------|
| A | Foundations & Repo Health | ✅ Complete | Monorepo Agent | 100% |
| B | UI Shell & Question Flow | ✅ Complete | React UI Agent | 100% |
| C | Audio Capture & Streaming | ✅ Complete | Audio Pipeline Agent | 100% |
| D | Provider Integrations | 🟡 In Progress | STT Adapter Agents | 90% |
| E | Scoring + Cost + Verification | ✅ Complete | Scoring Engine Agent | 100% |

---

## Track A — Foundations & Repo Health

### Tasks

| ID | Task | Status | Assignee | Acceptance Criteria |
|----|------|--------|----------|---------------------|
| A1 | Create monorepo structure | ✅ Done | Monorepo Agent | Directory structure matches PRD Section 14 |
| A2 | Set up root package.json | ✅ Done | Monorepo Agent | Workspaces configured, scripts defined |
| A3 | Create shared types package | ✅ Done | Monorepo Agent | All contracts in `packages/shared/src/types.ts` |
| A4 | Configure .env.example | ✅ Done | Security Agent | Template with all required env vars |
| A5 | Create app_config.json | ✅ Done | Config Agent | Scoring/pace/timeout configs defined |
| A6 | Set up apps/web package.json | ✅ Done | Build Agent | Vite + React + TypeScript configured |
| A7 | Set up apps/server package.json | ✅ Done | Build Agent | Express + TypeScript configured |
| A8 | Configure TypeScript | ✅ Done | Build Agent | tsconfig.json with resolveJsonModule |
| A9 | Set up Vite config | ✅ Done | Build Agent | Dev server, proxy config |
| A10 | Implement CORS middleware | ✅ Done | Security Agent | Localhost-only origins |
| A11 | Implement rate limiting | ✅ Done | Security Agent | 60/min for tokens, 30/min for transcribe |
| A12 | Verify `npm install && npm run dev` works | ✅ Done | Build Agent | Clean install, both servers start |

### Gate A Acceptance
- [x] `pnpm install` succeeds
- [x] `pnpm run dev` starts both web and server
- [x] `pnpm run build` produces dist folders
- [x] `.env.example` present (server only)
- [x] CORS restricted to localhost
- [x] Rate limiting enabled on token endpoints

---

## Track B — UI Shell & Question Flow

### Tasks

| ID | Task | Status | Assignee | Acceptance Criteria |
|----|------|--------|----------|---------------------|
| B1 | Create App.tsx shell | ✅ Done | React UI Agent | Single-screen layout structure |
| B2 | QuestionPanel component | ✅ Done | React UI Agent | Displays prompt + index (QuestionCard) |
| B3 | ChoicesGrid component | ✅ Done | React UI Agent | 4 selectable options (A-D) integrated |
| B4 | PushToTalkControls component | ✅ Done | React UI Agent | RecordingControls with Talk/End buttons |
| B5 | ProviderComparePanels component | ✅ Done | React UI Agent | ResultsComparison component |
| B6 | ProviderPanel component | ✅ Done | React UI Agent | TranscriptPanel + Scorecard + cost |
| B7 | ScoreBreakdown component | ✅ Done | React UI Agent | Scorecard with metrics breakdown |
| B8 | NextQuestionButton component | ✅ Done | React UI Agent | Advances question, resets state |
| B9 | BankLoader component | ✅ Done | React UI Agent | JSON file upload with drag-drop |
| B10 | Question bank validation | ✅ Done | Schema Agent | Validates 4 options, required fields |
| B11 | Session state management | ✅ Done | State Agent | Zustand sessionStore implemented |
| B12 | Apply style guide theming | ✅ Done | UX Agent | Tailwind with RSAF-appropriate colors |

### Gate B Acceptance
- [x] Single-screen layout matches PRD Section 5
- [x] Talk disabled until bank loaded + choice selected
- [x] Selection locked during recording
- [x] Next Question advances and resets state cleanly

---

## Track C — Audio Capture & Realtime Streaming

### Tasks

| ID | Task | Status | Assignee | Acceptance Criteria |
|----|------|--------|----------|---------------------|
| C1 | Mic permission handling | ✅ Done | Audio Agent | `requestMicPermission()` with error states |
| C2 | Audio capture (ScriptProcessorNode) | ✅ Done | Audio Agent | PCM16 @ 16kHz mono streaming |
| C3 | Audio chunking utilities | ✅ Done | Audio Agent | `AudioChunker` with configurable chunk size |
| C4 | Recording timer | ✅ Done | Audio Agent | Timer display in RecordingControls |
| C5 | Max recording limit (30s) | ✅ Done | Audio Agent | Auto-stop at `maxRecordingMs` config |
| C6 | Realtime transport abstraction | ✅ Done | Transport Agent | BaseProviderAdapter WebSocket management |
| C7 | Transcript buffering | ✅ Done | Transcript Agent | Interim/committed/final states in store |
| C8 | Provider status indicators | ✅ Done | UI Agent | Connecting/Listening/Error/Completed |

### Gate C Acceptance
- [x] Mic permissions handled gracefully
- [x] Timer and recording states reliable
- [x] Audio chunks stream continuously (4096 samples/chunk)
- [x] Transcript UI updates in real-time
- [x] Clear provider status indicators

---

## Track D — Provider Integrations

### Tasks

| ID | Task | Status | Assignee | Acceptance Criteria |
|----|------|--------|----------|---------------------|
| D1 | /api/health endpoint | ✅ Done | API Agent | Reports provider config presence |
| D2 | /api/token/openai endpoint | ✅ Done | API Agent | Mints ephemeral session token |
| D3 | /api/token/elevenlabs endpoint | ✅ Done | API Agent | Mints single-use token from ElevenLabs API |
| D4 | OpenAI Realtime STT adapter | ✅ Done | OpenAI Agent | Subprotocol auth, streaming, events |
| D5 | ElevenLabs Realtime STT adapter | 🟡 90% | ElevenLabs Agent | Token auth works, finalization pending |
| D6 | Error handling per provider | ✅ Done | Error Agent | Panel-scoped errors, app remains usable |
| D7 | Timeout management | ✅ Done | Error Agent | Connect 10s, finalization 5s configurable |
| D8 | Proxy mode (optional) | ⚪ Deferred | Proxy Agent | Not needed for MVP |

### Gate D Acceptance
- [x] /api/health reports provider config
- [x] Token endpoints mint short-lived tokens
- [x] OpenAI runs end-to-end: connect → interim → final ✅
- [x] ElevenLabs connects successfully (finalization pending)
- [x] Failure isolation: one provider fails, other completes

---

## Track E — Scoring + Cost + Verification

### Tasks

| ID | Task | Status | Assignee | Acceptance Criteria |
|----|------|--------|----------|---------------------|
| E1 | Text normalization utility | ✅ Done | Scoring Agent | `normalizeText()` in scoring utils |
| E2 | Similarity calculation | ✅ Done | Scoring Agent | Word overlap scoring |
| E3 | Filler word detection | ✅ Done | Scoring Agent | FILLER_WORDS constant + detection |
| E4 | Clarity scoring | ✅ Done | Scoring Agent | `computeClarity()` with filler penalty |
| E5 | Pace scoring | ✅ Done | Scoring Agent | `computePace()` with WPM calculation |
| E6 | Structure scoring | ✅ Done | Scoring Agent | `computeStructure()` with NATO detection |
| E7 | Overall score calculation | ✅ Done | Scoring Agent | `computeOverall()` with 40/30/30 weighting |
| E8 | Cost estimation | ✅ Done | Cost Agent | `estimateCost()` based on duration |
| E9 | Correctness indicator | ✅ Done | UI Agent | Compares selectedIndex to correctIndex |
| E10 | Unit tests for scoring | ⚪ Deferred | QA Agent | Deferred to post-MVP |
| E11 | Integration tests for server | ⚪ Deferred | QA Agent | Deferred to post-MVP |
| E12 | Manual acceptance checklist | ✅ Done | QA Agent | Playwright E2E flow tested |

### Gate E Acceptance
- [x] Deterministic scoring per PRD formulas
- [x] Breakdown shows clarity, pace, structure
- [x] Cost shows estimate based on duration
- [ ] Unit tests pass (deferred)
- [ ] Integration tests pass (deferred)
- [x] Manual acceptance checklist executed

---

## Risk Register

| Risk | Probability | Impact | Mitigation | Status |
|------|-------------|--------|------------|--------|
| Provider realtime flakiness | Medium | High | Proxy mode fallback | Mitigated (graceful error handling) |
| Finalization timeout | Medium | Medium | Use last committed text, mark as timeout | ✅ Implemented |
| Mic permission denied | Medium | High | Clear error messaging, retry UI | ✅ Implemented |
| Rate limiting triggered | Low | Medium | Exponential backoff, user feedback | ✅ Implemented |
| CORS issues in dev | Low | Low | Proper Vite proxy config | ✅ Resolved |

---

## Definition of Done

Each task is complete when:
1. ✅ Code implemented and reviewed
2. ✅ Unit tests pass (if applicable)
3. ✅ Acceptance criteria met
4. ✅ No TypeScript errors
5. ✅ Linting passes
6. ✅ Evidence provided (test output, screenshot, or log)

---

## Notes

- All secrets stay on server only ✅
- No unsafe HTML rendering for transcripts ✅
- Provider errors must be panel-scoped ✅
- Every "done" item requires evidence ✅

---

## Remaining Work (Post-MVP)

1. **ElevenLabs Finalization**: Debug message handling in ElevenLabsRealtimeAdapter
2. **Unit Tests**: Add comprehensive test coverage for scoring functions
3. **Integration Tests**: Add server endpoint tests
4. **Real Microphone Testing**: Manual testing with actual microphone
5. **Production Deployment**: Configure for production environment
