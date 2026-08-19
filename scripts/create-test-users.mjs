// Create the dual test users in Supabase Auth via the Admin API (service role).
// Idempotent: lists existing users first and only creates missing ones.
// No external deps. Reads .env manually.
import { readFileSync } from 'node:fs';

function loadEnv() {
  const out = {};
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const users = [
  { email: env.BAKI_TEST_USER_A_EMAIL, password: env.BAKI_TEST_USER_A_PASSWORD },
  { email: env.BAKI_TEST_USER_B_EMAIL, password: env.BAKI_TEST_USER_B_PASSWORD },
];

async function main() {
  // List existing users.
  const listRes = await fetch(`${url}/auth/v1/admin/users?per_page=200`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!listRes.ok) throw new Error(`list failed: ${listRes.status}`);
  const existing = new Set(
    ((await listRes.json()).users ?? []).map((u) => u.email),
  );

  for (const u of users) {
    if (!u.email || !u.password) {
      console.log(`SKIP ${u.email ?? '(missing email)'}: env not fully set`);
      continue;
    }
    if (existing.has(u.email)) {
      console.log(`SKIP ${u.email}: already exists`);
      continue;
    }
    const res = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: u.email,
        password: u.password,
        email_confirm: true,
      }),
    });
    const body = await res.json().catch(() => ({}));
    console.log(
      res.ok
        ? `CREATED ${u.email} (id=${body.id})`
        : `FAILED ${u.email}: ${res.status} ${body.msg ?? JSON.stringify(body)}`,
    );
  }
}

main().catch((e) => {
  console.error('error:', e);
  process.exit(1);
});
