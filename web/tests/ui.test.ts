import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

// These tests assume the Go server is running on :8080 with NEXT_DEV proxy enabled (NEXT_DEV=1)
// and Next.js dev server is running on :8081 (scripts: dev).

async function fetchText(path: string){
  const r = await fetch(`http://localhost:8080${path}`);
  return { status: r.status, text: await r.text() };
}

async function fetchJSON(path: string){
  const r = await fetch(`http://localhost:8080${path}`);
  return { status: r.status, json: await r.json() };
}

describe('UI basic pages', () => {
  it('serves / (root)', async () => {
    const { status, text } = await fetchText('/');
    expect(status).toBe(200);
    expect(text).toContain('KUARD UI');
  });
});

describe('API endpoints', () => {
  it('env api returns env map', async () => {
    const { status, json } = await fetchJSON('/env/api');
    expect(status).toBe(200);
    expect(json.env).toBeDefined();
  });
  it('mem api returns memStats', async () => {
    const { status, json } = await fetchJSON('/mem/api');
    expect(status).toBe(200);
    expect(json.memStats).toBeDefined();
  });
  it('liveness api returns status structure', async () => {
    const { status, json } = await fetchJSON('/healthy/api');
    expect(status).toBe(200);
    expect(json.history).toBeDefined();
  });
});
