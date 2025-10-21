Playwright API smoke tests

Quick guide:

- Ensure backend dev server is running (dev-server or backend functions) and Vite dev server is serving the frontend on http://localhost:5173. The tests use the frontend Vite proxy to reach `/api/*` endpoints.

- Optionally set an auth token for protected endpoints:

  export PLAYWRIGHT_AUTH_TOKEN="<token>"
  # optionally set alternate base url
  export PLAYWRIGHT_BASE_URL="http://localhost:5173"

- Run tests from `apps/Frontend`:

  npm run test:e2e

The tests are lightweight smoke checks and accept a range of server responses (200/401 etc.) because local dev setups may vary. They are intended to validate that the endpoints are reachable and returning JSON or expected statuses.
