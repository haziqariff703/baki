// Reset the dual test users' passwords via the Auth Admin API (service role).
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

const targets = [
  { email: env.BAKI_TEST_USER_A_EMAIL, password: env.BAKI_TEST_USER_A_PASSWORD, label: 'User A' },
  { email: env.BAKI_TEST_USER_B_EMAIL, password: env.BAKI_TEST_USER_B_PASSWORD, label: 'User B' },
];

async function main() {
  for (const t of targets) {
    // Look up the user id by email.
    const listRes = await fetch(
      `${url}/auth/v1/admin/users?per_page=200`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!listRes.ok) throw new Error(`list failed: ${listRes.status}`);
    const all = (await listRes.json()).users ?? [];
    const user = all.find((u) => u.email === t.email);
    if (!user) {
      console.log(`${t.label}: user not found (${t.email})`);
      continue;
    }
    const res = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: t.password, email_confirm: true }),
    });
    const body = await res.json().catch(() => ({}));
    console.log(
      res.ok
        ? `${t.label} (${t.email}): password reset OK`
        : `${t.label}: FAILED ${res.status} ${body.msg ?? JSON.stringify(body)}`,
    );
  }
}

main().catch((e) => {
  console.error('error:', e);
  process.exit(1);
});
