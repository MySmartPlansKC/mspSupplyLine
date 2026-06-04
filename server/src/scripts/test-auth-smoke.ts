/**
 * Auth + project-access smoke test (server must already be running).
 *
 *   npm run test:auth
 *
 * Env (optional):
 *   API_BASE_URL=http://localhost:3001
 *   DEV_SEED_PASSWORD=SupplyLine123!
 */
import 'dotenv/config';

const BASE = (process.env.API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const PASSWORD = process.env.DEV_SEED_PASSWORD ?? 'SupplyLine123!';
const PROJECT_ID = Number(process.env.DEV_PROJECT_ID ?? 1);

const MSPADMIN_EMAIL = process.env.DEV_MSPADMIN_EMAIL ?? 'mspadmin@supplyline.local';
const CLIENTADMIN_EMAIL = process.env.DEV_CLIENT_EMAIL ?? 'clientadmin@supplyline.local';

interface LoginResponse {
  token: string;
  expiresAt: string;
  user: { userId: string; email: string; role: string };
}

interface ContextResponse {
  projectId: number;
  userId: string;
  role: string;
  access: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE}${path}`, options);
  const body = (await res.json()) as T;
  return { status: res.status, body };
}

async function login(email: string): Promise<LoginResponse> {
  const { status, body } = await request<LoginResponse | { error: string }>(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    }
  );

  if (status !== 200) {
    throw new Error(`Login failed (${status}): ${JSON.stringify(body)}`);
  }

  return body as LoginResponse;
}

async function getContext(token: string, projectId: number): Promise<number> {
  const res = await fetch(`${BASE}/api/projects/${projectId}/context`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (res.status !== 200) {
    console.log(`   response: ${JSON.stringify(body)}`);
  }
  return res.status;
}

function pass(label: string): void {
  console.log(`✅ ${label}`);
}

function fail(label: string, detail: string): void {
  console.log(`❌ ${label} — ${detail}`);
}

async function main(): Promise<void> {
  console.log(`SupplyLine auth smoke test → ${BASE}\n`);

  let failures = 0;

  // Health
  try {
    const { status } = await request<{ status: string }>('/api/health');
    if (status === 200) pass('GET /api/health');
    else {
      fail('GET /api/health', `status ${status}`);
      failures++;
    }
  } catch (error) {
    fail('GET /api/health', `server unreachable (${(error as Error).message})`);
    console.log('\nStart the API first: npm run dev');
    process.exit(1);
  }

  // MspAdmin login + context
  try {
    const admin = await login(MSPADMIN_EMAIL);
    pass(`POST /api/auth/login (${MSPADMIN_EMAIL} → ${admin.user.role})`);

    const ctxStatus = await getContext(admin.token, PROJECT_ID);
    if (ctxStatus === 200) pass(`GET /api/projects/${PROJECT_ID}/context (MspAdmin)`);
    else {
      fail(`GET /api/projects/${PROJECT_ID}/context (MspAdmin)`, `status ${ctxStatus}`);
      failures++;
    }
  } catch (error) {
    fail('MspAdmin flow', (error as Error).message);
    failures++;
  }

  // ClientAdmin login + allowed project + denied project
  try {
    const client = await login(CLIENTADMIN_EMAIL);
    pass(`POST /api/auth/login (${CLIENTADMIN_EMAIL} → ${client.user.role})`);

    const allowed = await getContext(client.token, PROJECT_ID);
    if (allowed === 200) pass(`GET /api/projects/${PROJECT_ID}/context (ClientAdmin)`);
    else {
      fail(`GET /api/projects/${PROJECT_ID}/context (ClientAdmin)`, `status ${allowed}`);
      failures++;
    }

    const denied = await getContext(client.token, 999);
    if (denied === 403) pass('GET /api/projects/999/context (ClientAdmin → 403 expected)');
    else {
      fail('GET /api/projects/999/context (ClientAdmin)', `expected 403, got ${denied}`);
      failures++;
    }
  } catch (error) {
    fail('ClientAdmin flow', (error as Error).message);
    failures++;
  }

  console.log('');
  if (failures === 0) {
    console.log('All smoke tests passed.');
    process.exit(0);
  }

  console.log(`${failures} test(s) failed.`);
  process.exit(1);
}

main().catch((error: Error) => {
  console.error('Smoke test error:', error.message);
  process.exit(1);
});
