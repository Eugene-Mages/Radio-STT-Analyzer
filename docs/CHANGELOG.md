# Changelog

All notable changes to the Radio Speech-To-Text Analyzer (RSTA) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **2025-12-30**: End-to-end MVP implementation

  **Core Infrastructure**
  - pnpm monorepo with Vite + React + TypeScript frontend
  - Express + TypeScript backend with tsx watch for hot reload
  - Shared types package (`@rsta/shared`) with all data contracts

  **Provider Adapters**
  - `BaseProviderAdapter` abstract class with connection management, events, reconnection
  - `OpenAIRealtimeAdapter` with subprotocol authentication for WebSocket
  - `ElevenLabsRealtimeAdapter` with single-use token authentication

  **Token Endpoints**
  - `POST /api/token/openai` - Fetches ephemeral session tokens from OpenAI
  - `POST /api/token/elevenlabs` - Fetches single-use tokens from ElevenLabs

  **Audio Pipeline**
  - Microphone permission handling with `requestMicPermission()`
  - `AudioChunker` for PCM16 @ 16kHz mono conversion and streaming
  - Dual-provider audio streaming support

  **State Management**
  - Zustand store with `sessionStore` for complete app state
  - Provider-specific result tracking (status, transcript, scores, cost)
  - Recording state machine (idle → listening → processing → completed)

  **Scoring Engine**
  - `computeClarity()` - Word accuracy based on expected phrase matching
  - `computePace()` - Words-per-minute analysis with optimal range
  - `computeStructure()` - NATO phonetic alphabet detection
  - `computeOverall()` - Weighted composite (40% clarity, 30% pace, 30% structure)
  - Cost estimation based on audio duration

  **UI Components**
  - `BankLoader` - Question bank JSON file loader
  - `QuestionCard` - Question display with multiple choice options
  - `RecordingControls` - Push-to-talk with timer and status indicators
  - `TranscriptPanel` - Real-time transcript display with status
  - `ResultsComparison` - Side-by-side provider comparison
  - `Scorecard` - Visual score display with progress bars

  **Integration**
  - `useDualSTT` hook coordinating both providers
  - Full data flow: question → recording → dual STT → scoring → display

### Architecture Decisions
- **REALTIME_MODE**: Default to `direct` mode (browser connects directly to providers)
- **Token-based auth**: Node server mints short-lived tokens, no secrets on client
- **Dual provider**: Side-by-side OpenAI + ElevenLabs STT comparison
- **Deterministic scoring**: Clarity (40%) + Pace (30%) + Structure (30%)
- **WebSocket auth**: OpenAI uses subprotocols, ElevenLabs uses token query param

### Fixed
- **2025-12-30**: OpenAI WebSocket authentication via subprotocols
- **2025-12-30**: ElevenLabs token endpoint to use official single-use token API
- **2025-12-30**: TypeScript errors in App.tsx and useDualSTT.ts

### Known Issues
- ElevenLabs message handling needs debugging (connection works but finalization fails)

---

## [1.0.0] - TBD

### Planned Features (MVP)
- [x] Question bank loader with JSON validation
- [x] Push-to-talk audio capture
- [x] Dual realtime STT streaming (OpenAI + ElevenLabs)
- [x] Realtime transcript display with interim/committed/final states
- [x] Scoring engine (Clarity, Pace, Structure)
- [x] Cost estimation per attempt
- [x] Correctness indicator
- [x] Single-screen UI with provider comparison panels

### Remaining Work
- [ ] Debug ElevenLabs message handling
- [ ] Real microphone testing (Playwright uses simulated audio)
- [ ] Production deployment configuration

---

## Version History Template

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements
```
