'use strict';
const crypto = require('crypto');

const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60;

function createGuestAuth(options = {}) {
  const secret = String(options.secret || '');
  if (Buffer.byteLength(secret) < 32) throw new Error('Guest session secret must contain at least 32 bytes.');
  const ttlSeconds = Math.max(300, Math.min(90 * 24 * 60 * 60, Number(options.ttlSeconds) || DEFAULT_TTL_SECONDS));

  function sign(encodedPayload) {
    return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  }

  function issue(playerId, now = Date.now()) {
    const payload = {
      sub: String(playerId),
      exp: Math.floor(now / 1000) + ttlSeconds,
      nonce: crypto.randomBytes(12).toString('base64url'),
      v: 1
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encoded}.${sign(encoded)}`;
  }

  function verify(token, playerId, now = Date.now()) {
    if (typeof token !== 'string' || token.length > 2048) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [encoded, suppliedSignature] = parts;
    const expected = Buffer.from(sign(encoded));
    const supplied = Buffer.from(suppliedSignature);
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return false;
    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      return payload?.v === 1 && payload?.sub === String(playerId) && Number.isFinite(payload.exp) && payload.exp > Math.floor(now / 1000);
    } catch {
      return false;
    }
  }

  return Object.freeze({ issue, verify, ttlSeconds });
}

module.exports = { createGuestAuth, DEFAULT_TTL_SECONDS };
