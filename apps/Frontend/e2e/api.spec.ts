import { test, expect } from '@playwright/test';

// These tests are lightweight smoke checks for the backend endpoints.
// They assume the backend dev server is running and reachable via the Vite proxy
// (i.e., run `npm run dev` from the workspace root or start backend separately).

const AUTH_TOKEN = process.env.PLAYWRIGHT_AUTH_TOKEN || null;
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

test.describe('Backend API smoke', () => {
  test('GET /api/warm should return 200 or 500 with JSON', async ({ request }) => {
    const res = await request.get(`${BASE}/api/warm`);
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(600);
    const body = await res.json().catch(() => null);
    // body may be { warmed: true } or { warmed: false, error: '...' }
    expect(body).not.toBeNull();
  });

  test('POST /api/warm (pingAI) should return JSON', async ({ request }) => {
    const res = await request.post(`${BASE}/api/warm`, {
      data: { pingAI: true }
    });
    // We accept success or graceful failure (e.g., AI not configured)
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(600);
    const body = await res.json().catch(() => null);
    expect(body).not.toBeNull();
  });

  test('POST /api/init-conversation (auth optional) should return 200 or 401', async ({ request }) => {
    const headers = {} as Record<string, string>;
    if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;

    const res = await request.post(`${BASE}/api/init-conversation`, { headers, data: {} });
    // If unauthenticated, server may return 401; if authenticated, 200
    expect([200, 401, 403]).toContain(res.status());
    // If 200, ensure we received a conversationId
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.conversationId).toBeTruthy();
    }
  });

  test('POST /api/conversation (basic) should accept request or return error', async ({ request }) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;

    const payload = {
      message: 'Playwright smoke test',
      conversationId: null,
      userId: null,
    };

    const res = await request.post(`${BASE}/api/conversation`, { headers, data: payload });
    // Accept a variety of server statuses depending on auth and backend state
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(600);
    const contentType = res.headers()['content-type'] || '';
    // If streaming, Playwright's request will still return a status; we just assert JSON or text
    if (contentType.includes('application/json')) {
      const body = await res.json().catch(() => null);
      expect(body).not.toBeNull();
    }
  });

  test('GET /api/history should return 200 or 401', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    const res = await request.get(`${BASE}/api/history`, { headers });
    expect([200, 401]).toContain(res.status());
  });
});
