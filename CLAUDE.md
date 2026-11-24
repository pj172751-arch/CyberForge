# CyberForge Assistant Guide

Refer to [AGENTS.md](AGENTS.md) for the active system architecture, database schema, and operational boundaries.

## Key Developer Commands
- **Start Docker Stack**: `docker compose up -d`
- **Verify Stack**: `docker compose ps`
- **Run Backend**: `uvicorn backend.main:app --reload --port 8000`
- **Backend Health Check**: `curl http://localhost:8000/health`
- **Database Connection Check**: `curl http://localhost:8000/health/db`
- **Run Frontend**: `npm run dev` (runs Vite on `http://localhost:5173`)
- **Build Frontend**: `npm run build`

## Safety Rules
- Never commit `.env` or secrets.
- Do not execute `git add` or `git commit` automatically; keep modifications unstaged.
