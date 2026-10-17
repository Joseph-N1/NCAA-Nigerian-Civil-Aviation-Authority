import { createHmac, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const TOKEN_TTL_SECONDS = 8 * 60 * 60;
const MAX_REQUEST_BYTES = 1_000_000;
const ROLES = {
  DEV: { displayName: 'DEV', role: 'manager', isDeveloper: true },
  DCA: { displayName: 'DCA', role: 'manager', isReadOnly: true },
  LBMM: { displayName: 'LBMM', role: 'manager' },
  MCC: { displayName: 'MCC', role: 'manager' }
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

const base64UrlEncode = (value) => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8');

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function makeToken(user, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    sub: user.displayName,
    role: user.role,
    readOnly: !!user.isReadOnly,
    developer: !!user.isDeveloper,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  }));
  const signedValue = `${header}.${payload}`;
  return `${signedValue}.${sign(signedValue, secret)}`;
}

function verifyToken(token, secret) {
  const [header, payload, signature] = String(token || '').split('.');
  if (!header || !payload || !signature) return null;

  const signedValue = `${header}.${payload}`;
  const expected = sign(signedValue, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const claims = JSON.parse(base64UrlDecode(payload));
    if (!ROLES[claims.sub] || !Number.isFinite(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return { ...ROLES[claims.sub], ...claims };
  } catch {
    return null;
  }
}

function isSameSecret(expected, actual) {
  const expectedBuffer = Buffer.from(String(expected || ''));
  const actualBuffer = Buffer.from(String(actual || ''));
  return expectedBuffer.length > 0 && expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function validateRoom(roomCode) {
  return typeof roomCode === 'string' && /^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(roomCode);
}

function validatePayload(payload) {
  return payload && typeof payload === 'object' && payload.activeCheck && typeof payload.activeCheck === 'object'
    && Array.isArray(payload.tasks) && Array.isArray(payload.personnel) && Array.isArray(payload.audit);
}

async function readBody(request) {
  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > MAX_REQUEST_BYTES) throw new Error('Request is too large.');
  const text = await request.text();
  if (text.length > MAX_REQUEST_BYTES) throw new Error('Request is too large.');
  return JSON.parse(text);
}

export default async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const secret = process.env.CPCP_SYNC_JWT_SECRET;
  if (!secret || secret.length < 32) return json({ error: 'Cloud sync is not configured.' }, 503);

  let body;
  try {
    body = await readBody(request);
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  if (body.action === 'authenticate') {
    const username = String(body.username || '').toUpperCase();
    const user = ROLES[username];
    const configuredPin = process.env[`CPCP_PIN_${username}`];
    if (!user || !configuredPin || !isSameSecret(configuredPin, body.pin)) return json({ error: 'Invalid credentials.' }, 401);

    const token = makeToken(user, secret);
    return json({ token, expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString(), user });
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyToken(token, secret);
  if (!user) return json({ error: 'Your session has expired. Please sign in again.' }, 401);
  if (!validateRoom(body.roomCode)) return json({ error: 'Invalid sync room code.' }, 400);

  const store = getStore({ name: 'rano-air-cpcp-sync', consistency: 'strong' });
  const key = `rooms/${body.roomCode}.json`;
  const rawRecord = await store.get(key, { consistency: 'strong' });
  const record = rawRecord ? JSON.parse(rawRecord) : null;

  if (body.action === 'pull') return json({ record });

  if (body.action !== 'push') return json({ error: 'Unknown action.' }, 400);
  if (user.isReadOnly) return json({ error: 'This account has read-only cloud access.' }, 403);
  if (!validatePayload(body.payload)) return json({ error: 'Invalid sync payload.' }, 400);

  const currentRevision = record?.revision || 0;
  if (Number(body.baseRevision || 0) !== currentRevision) {
    return json({ error: 'Cloud data changed on another device.', code: 'REVISION_CONFLICT', record }, 409);
  }

  const nextRecord = {
    schemaVersion: 1,
    revision: currentRevision + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: user.displayName,
    payload: body.payload
  };
  await store.set(key, JSON.stringify(nextRecord));
  return json({ record: nextRecord });
};
