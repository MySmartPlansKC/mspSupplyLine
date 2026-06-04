/**
 * Auth + project-access smoke test (server must already be running).
 *
 *   npm run test:auth
 *
 * Env (optional):
 *   API_BASE_URL=http://localhost:3002
 *   DEV_SEED_PASSWORD=SupplyLine123!
 */
import 'dotenv/config';

const BASE = (
  process.env.API_BASE_URL ??
  `http://localhost:${process.env.PORT ?? '3002'}`
).replace(/\/$/, '');
const PASSWORD = process.env.DEV_SEED_PASSWORD ?? 'SupplyLine123!';
const PROJECT_ID = Number(process.env.DEV_PROJECT_ID ?? 1);

const MSPADMIN_EMAIL =
  process.env.DEV_MSPADMIN_EMAIL?.trim() || 'mspadmin@supplyline.local';

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
