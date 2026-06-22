import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { buildJwt } from './sheets-client.ts';

test('buildJwt produces a verifiable RS256 JWT with the right claims', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

  const jwt = buildJwt({ client_email: 'svc@proj.iam.gserviceaccount.com', private_key: pem }, 1_000_000);
  const [h, c, sig] = jwt.split('.');
  assert.ok(h && c && sig, 'jwt has three segments');

  const header = JSON.parse(Buffer.from(h, 'base64url').toString());
  const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
  assert.equal(header.alg, 'RS256');
  assert.equal(claims.iss, 'svc@proj.iam.gserviceaccount.com');
  assert.equal(claims.aud, 'https://oauth2.googleapis.com/token');
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/spreadsheets');
  assert.equal(claims.exp - claims.iat, 3600);

  const verified = createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, sig, 'base64url');
  assert.ok(verified, 'signature verifies against the public key');
});
