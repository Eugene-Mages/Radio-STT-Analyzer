# Radio Speech-To-Text Analyzer (RSTA)

> Local React + Node application with dual realtime Speech-to-Text analysis for radio communication training.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-MVP-yellow)

## Overview

RSTA is a training tool for learning proper radio communications. It provides:

- **Scenario-based questions** with multiple-choice answers
- **Push-to-talk** audio capture
- **Dual STT comparison** (OpenAI vs ElevenLabs) side-by-side
- **Realtime transcription** with live updates
- **Deterministic scoring** based on Clarity, Pace, and Structure
- **Cost estimation** per attempt

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- OpenAI API key
- ElevenLabs API key

### Installation

```bash
# Clone and install
cd radio-speech-to-text-analyzer
npm install

# Configure environment
cp apps/server/.env.example apps/server/.env
# Edit .env with your API keys

# Start development
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both web and server in development mode |
| `npm run dev:web` | Start only the web app |
| `npm run dev:server` | Start only the API server |
| `npm run build` | Build both apps for production |
| `npm run start` | Start production server |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all workspaces |
| `npm run typecheck` | Type-check all workspaces |

## Project Structure

```
radio-speech-to-text-analyzer/
├── apps/
│   ├── web/          # React + Vite frontend
│   └── server/       # Express API server
├── packages/
│   └── shared/       # Shared TypeScript types
└── docs/             # Documentation
```

## Configuration

### Environment Variables (Server)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Yes |
| `REALTIME_MODE` | `direct` or `proxy` | No (default: direct) |
| `CORS_ORIGIN` | Allowed CORS origin | No (default: localhost:5173) |

### App Configuration (Web)

Edit `apps/web/src/data/app_config.json` to customize:

- Scoring weights and thresholds
- Pace targets (WPM ranges)
- Timeout durations
- Feature flags

## Scoring System

### Metrics

| Metric | Weight | Description |
|--------|--------|-------------|
| **Clarity** | 40% | Transcript similarity minus filler penalties |
| **Pace** | 30% | WPM and pause analysis |
| **Structure** | 30% | Radio terminology compliance |

### Formula

```
overall = 0.40 × clarity + 0.30 × pace + 0.30 × structure
```

## Documentation

- [CHANGELOG](docs/CHANGELOG.md) - Version history
- [TASKS](docs/TASKS.md) - Development task tracker
- [DEBUG_LOG](docs/DEBUG_LOG.md) - Debug and issue tracking
- [PRD](../PRD.md) - Product Requirements Document

## Security

- API keys stored server-side only
- Short-lived tokens for provider connections
- CORS restricted to localhost
- Rate limiting on all endpoints
- No unsafe HTML rendering

## License

UNLICENSED - Private project for MAGES STUDIO
