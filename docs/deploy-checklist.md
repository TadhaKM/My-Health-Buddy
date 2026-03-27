# Future You Stage Deploy Checklist

## 1) Environment Variables
- `ANTHROPIC_API_KEY` is set in runtime environment.
- `VITE_API_BASE_URL` points frontend to Next API host (for local: `http://localhost:3001`).
- `VITE_SIMULATION_API_URL` is set (for local: `http://localhost:3001/api/simulate`).

## 2) Server Startup
- Start API server: `npm run dev:next`.
- Start frontend server: `npm run dev`.
- Confirm both are up before demo.

## 3) Health Checks
- Hit `GET /api/health` and verify `status: ok`.
- Hit `POST /api/simulate` with a known payload and verify schema keys.
- Hit `POST /api/parse-habits` and verify habits + summary return.

## 4) CORS and API Base URL
- Verify browser requests use configured API base URL.
- Verify API routes respond to `OPTIONS` and `POST`.

## 5) Reliability Guards
- Run: `npm run test:simulate`.
- Confirm contract tests pass (organs/years/integers/non-decreasing).
- Confirm failure-drill tests pass (malformed AI output repaired by normalizer).

## 6) Demo Presets
- Verify one-click presets:
  - Healthy
  - Smoker
  - Poor Sleep
  - Stress Combo
- Confirm each preset produces visibly distinct 5/10/20 year trajectories.

## 7) Latency UX Contract
- Verify frontend state transitions:
  - `idle` -> `simulating` -> `done`
  - `idle` -> `simulating` -> `failed` (fallback path)
- Ensure loading indicators are visible while simulation is in flight.

## 8) Stage Backup Plan
- If AI provider throttles/fails, continue demo using fallback-backed simulation.
- Keep one known-good preset walkthrough ready (`Smoker`) for consistency.
