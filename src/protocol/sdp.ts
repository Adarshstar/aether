/**
 * NetherNet SDP helpers — fingerprint + a=identity assertion
 *
 * Real Bedrock clients refuse answers that carry no a=identity.
 * Offers may include an ES384 JWT binding the multiplayer token to DTLS
 * fingerprints (same P-384 key as the login chain `cpk` claim).
 *
 * Signing here uses the existing JwtChain ES384 key. The JWT shape is
 * Aether's assertion (fingerprints + token). Live BDS may use a slightly
 * different IdP payload; parse/inject still apply.
 */

import { sign } from "crypto";

function b64url(data: Buffer | string): string {
  const b = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export interface SdpIdentityInfo {
  identity: string | null;
  fingerprints: string[];
  iceUfrag?: string;
  icePwd?: string;
}

export function parseSdpIdentity(sdp: string): SdpIdentityInfo {
  const identity = /(?:^|\r?\n)a=identity:([^\r\n]+)/.exec(sdp)?.[1]?.trim() ?? null;
  const fingerprints = [...sdp.matchAll(/(?:^|\r?\n)a=fingerprint:([^\r\n]+)/g)].map((m) => m[1].trim());
  const iceUfrag = /(?:^|\r?\n)a=ice-ufrag:([^\r\n]+)/.exec(sdp)?.[1]?.trim();
  const icePwd = /(?:^|\r?\n)a=ice-pwd:([^\r\n]+)/.exec(sdp)?.[1]?.trim();
  return { identity, fingerprints, iceUfrag, icePwd };
}

export function injectSdpIdentity(sdp: string, assertion: string): string {
  const line = `a=identity:${assertion}`;
  if (/(?:^|\r?\n)a=identity:/.test(sdp)) {
    return sdp.replace(/a=identity:[^\r\n]+/, line);
  }
  const nl = sdp.includes("\r\n") ? "\r\n" : "\n";
  if (/a=fingerprint:/.test(sdp)) {
    return sdp.replace(/(a=fingerprint:[^\r\n]+)(\r?\n)/, `$1$2${line}$2`);
  }
  const suffix = sdp.endsWith("\n") ? "" : nl;
  return `${sdp}${suffix}${line}${nl}`;
}

export function signIdentityAssertion(opts: {
  privateKeyPem: string;
  token: string;
  fingerprints: string[];
  domain?: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES384", typ: "JWT" };
  const payload = {
    nbf: now - 10,
    exp: now + 60 * 60,
    iat: now,
    token: opts.token,
    fingerprints: opts.fingerprints,
    domain: opts.domain ?? "",
  };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = sign("SHA384", Buffer.from(data), {
    key: opts.privateKeyPem,
    dsaEncoding: "ieee-p1363",
  });
  return `${data}.${b64url(sig)}`;
}

export function applyIdentityToOffer(
  sdp: string,
  opts: { privateKeyPem: string; token: string; domain?: string }
): string {
  const { fingerprints } = parseSdpIdentity(sdp);
  const assertion = signIdentityAssertion({ ...opts, fingerprints });
  return injectSdpIdentity(sdp, assertion);
}

export function decodeIdentityJwt(assertion: string): Record<string, unknown> | null {
  const parts = assertion.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}
