#!/usr/bin/env bash
cd "$(dirname "$0")"
(cd backend && source .venv/bin/activate && uvicorn main:app --port 8000) &
(cd frontend && npm run dev)
