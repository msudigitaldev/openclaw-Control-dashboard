# Mission Control Dashboard — PRD

## Problem Statement
Build a full-stack Mission Control Dashboard for managing AI agents. The product visualises a fleet of simulated AI agents (Agent-Main / mimo-v2-pro, Agent-Research / gpt-4o, Agent-Writer / claude-3.5-sonnet, Agent-Coder / deepseek-coder), surfaces task execution status, and lets a commander send commands.

Originally specified as React + TS + Express. **Adapted to FastAPI + React + WebSocket** at user's request to match Emergent platform.

## User Personas
- **Mission Commander (admin)** — primary operator who oversees the fleet, dispatches tasks, kills misbehaving agents, watches live telemetry.

## Tech Stack (chosen)
- Backend: FastAPI + pyjwt + asyncio simulator + native FastAPI WebSocket
- Frontend: React 19 + React Router + Tailwind + shadcn/ui + recharts + sonner
- Auth: JWT HS256, 24h TTL, in-memory single admin
- State: in-memory python lists (no MongoDB persistence per user choice)

## Core Requirements (P0)
- [x] Login page with JWT
- [x] Dashboard (3 stat cards, live agent table, task queue with filter tabs, command input)
- [x] Agents grid + detail sheet (stats, action timeline, scrolling terminal, Message/Steer/Kill)
- [x] Kanban Tasks (4 columns, progress bars, priority pills, New Task modal, task log dialog)
- [x] Analytics (4 metric cards, stacked bar, pie, line; date range picker)
- [x] Settings tabs (Connections w/ test, Notifications toggles + cost threshold slider, Security)
- [x] WebSocket broadcasting agent.status / task.progress / log.entry / metrics.update every 2-3s

## Implemented (Feb 2026 - iter 1)
- All 6 pages implemented and routed
- 4 simulated agents auto-ticking with token/cost growth and status transitions
- 7 default tasks across all 4 lanes; live progress advancement
- Glassmorphism + JetBrains Mono headings + Inter body + dark navy theme
- Connection status dot in header reflects live WS state
- Toaster notifications via sonner
- data-testid coverage on all interactive elements

## Backlog (P1)
- Persist agents/tasks to MongoDB (currently in-memory; restart wipes state)
- Drag-and-drop on Kanban (currently click + button only)
- Real Heroku Procfile + production build pipeline (Emergent preview only for now)
- Wire chat command to real LLM via Emergent universal key
- Desktop push notifications when threshold exceeded

## Backlog (P2)
- Agent spawn UI button (endpoint exists)
- Export analytics as CSV/PNG
- Multi-user auth + role-based filtering
