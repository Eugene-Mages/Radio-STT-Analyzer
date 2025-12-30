# RSTA Debug Log

> Radio Speech-To-Text Analyzer — Development Debug Log

**Purpose:** Track issues, debugging sessions, and resolutions during development.

---

## Log Format

```markdown
### [DATE] Issue Title
**Status:** Open | Investigating | Resolved
**Component:** [Component name]
**Severity:** Critical | High | Medium | Low

**Description:**
Brief description of the issue.

**Steps to Reproduce:**
1. Step one
2. Step two

**Expected Behavior:**
What should happen.

**Actual Behavior:**
What actually happens.

**Investigation Notes:**
- Note 1
- Note 2

**Resolution:**
How the issue was fixed (if resolved).
```

---

## Active Issues

### [2025-12-30] ElevenLabs Finalization Error
**Status:** Investigating
**Component:** ElevenLabsRealtimeAdapter
**Severity:** Medium

**Description:**
ElevenLabs WebSocket connects successfully and shows "Listening" status, but enters "Error" state during finalization when recording ends.

**Steps to Reproduce:**
1. Select a choice in the UI
2. Click "Talk" to start recording
3. Wait for both providers to show "Listening"
4. Click "End" to stop recording
5. Observe ElevenLabs shows "Error" while OpenAI shows "Completed"

**Expected Behavior:**
ElevenLabs should process the audio and return a transcript.

**Actual Behavior:**
Connection succeeds (token works), but finalization fails silently.

**Investigation Notes:**
- Token endpoint correctly fetches single-use token from ElevenLabs API
- WebSocket URL uses correct `/v1/speech-to-text/realtime` endpoint
- Connection establishes and status shows "Listening"
- Issue likely in message format mismatch (adapter expects different event types)
- ElevenLabs realtime STT may use different event types than expected
- Debug logging is not enabled to see actual messages received

**Next Steps:**
1. Enable debug logging in ElevenLabsRealtimeAdapter
2. Capture actual WebSocket messages from ElevenLabs
3. Compare message format with adapter expectations
4. Update adapter to match actual ElevenLabs protocol

---

## Resolved Issues

### [2025-12-30] OpenAI WebSocket Authentication Failed
**Status:** Resolved
**Component:** OpenAIRealtimeAdapter
**Severity:** Critical

**Description:**
OpenAI Realtime API WebSocket connection failed with "Missing bearer or basic authentication" error.

**Root Cause:**
OpenAI Realtime API requires authentication via WebSocket subprotocols, not URL parameters or headers.

**Resolution:**
Added `getWebSocketProtocols()` override in `OpenAIRealtimeAdapter` that returns:
```typescript
['realtime', `openai-insecure-api-key.${token}`, 'openai-beta.realtime-v1']
```

Modified `BaseProviderAdapter.connect()` to support subprotocol configuration.

---

### [2025-12-30] ElevenLabs Token Authentication 403 Error
**Status:** Resolved
**Component:** tokenElevenLabs.ts (Server)
**Severity:** Critical

**Description:**
ElevenLabs WebSocket returned 403 Forbidden when connecting with API key in URL.

**Root Cause:**
ElevenLabs STT WebSocket requires single-use tokens from their official token endpoint, not the API key directly.

**Resolution:**
Updated server endpoint to:
1. Call `POST https://api.elevenlabs.io/v1/single-use-token/realtime_scribe` with API key in header
2. Return the single-use token to client
3. Use correct WebSocket URL: `wss://api.elevenlabs.io/v1/speech-to-text/realtime`

---

### [2025-12-30] TypeScript Compilation Errors
**Status:** Resolved
**Component:** App.tsx, useDualSTT.ts
**Severity:** High

**Description:**
Multiple TypeScript errors prevented compilation.

**Errors Fixed:**
1. `clsx` import unused in App.tsx → Removed import
2. `onLoad` prop doesn't exist on BankLoaderProps → Changed to `onBankLoaded`
3. `createOpenAIRealtimeAdapter` doesn't exist → Used `new OpenAIRealtimeAdapter()`
4. `ChunkerOptions.chunkDurationMs` doesn't exist → Used correct options: `sampleRate`, `chunkSize`, `mono`

---

## Development Notes

### 2025-12-30 — MVP Implementation Complete

**Setup Completed:**
- Monorepo structure created
- Contract pack (TypeScript types) defined
- App configuration system set up
- Environment variables configured
- Documentation files created

**Implementation Completed:**
- OpenAI Realtime provider adapter with subprotocol auth
- ElevenLabs provider adapter with single-use tokens
- Audio chunker with PCM16 @ 16kHz mono conversion
- Zustand state store for app state
- Scoring engine (clarity, pace, structure, overall)
- Full UI component suite
- End-to-end data flow integration

**Architecture Decisions:**
- Using Vite + React for frontend
- Using Express for backend
- WebSocket for realtime STT streaming
- Zustand for state management
- Token-based auth (server mints, client uses)

**Known Considerations:**
- OpenAI Realtime API requires subprotocol authentication
- ElevenLabs requires single-use tokens from their token API
- CORS must be localhost-only for security

---

## Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Transcript update latency | <2s | ~1s (OpenAI) | ✅ |
| Token minting time | <500ms | ~500ms (OpenAI), ~500ms (ElevenLabs) | ✅ |
| Scoring computation | <100ms | <10ms | ✅ |
| Page load time | <3s | <1s | ✅ |

---

## Provider-Specific Notes

### OpenAI Realtime API
- **Endpoint:** `wss://api.openai.com/v1/realtime`
- **Auth:** WebSocket subprotocols `['realtime', 'openai-insecure-api-key.{token}', 'openai-beta.realtime-v1']`
- **Audio format:** PCM16 @ 16kHz mono, base64 encoded in JSON
- **Token expiry:** 60 seconds from OpenAI session endpoint
- **Status:** ✅ Working

### ElevenLabs API
- **Token Endpoint:** `POST https://api.elevenlabs.io/v1/single-use-token/realtime_scribe`
- **WebSocket:** `wss://api.elevenlabs.io/v1/speech-to-text/realtime`
- **Auth:** `token` query parameter with single-use token
- **Audio format:** PCM16 @ 16kHz mono, raw binary
- **Token expiry:** 15 minutes
- **Status:** ⚠️ Connection works, finalization needs debugging

---

## Testing Notes

### Manual Testing Status
- [x] Question bank loads correctly
- [x] Choice selection enables recording
- [x] Recording starts with Talk button
- [x] OpenAI connects and transcribes
- [x] ElevenLabs connects (finalization pending)
- [x] Scoring calculates correctly
- [x] Cost estimation displays
- [x] Results comparison shows side-by-side

### Browser Testing
- Tested in Playwright (headless Chromium)
- Real microphone testing pending (requires manual test)
