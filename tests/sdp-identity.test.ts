import { describe, test, expect } from "bun:test";
import {
  parseSdpIdentity, injectSdpIdentity, applyIdentityToOffer, decodeIdentityJwt,
  generateBedrockKeyPair, buildOfflineChain, MOCK_OFFER_SDP, MOCK_ANSWER_SDP,
} from "../index";

describe("SDP identity", () => {
  test("parse fingerprints from mock offer", () => {
    const info = parseSdpIdentity(MOCK_OFFER_SDP);
    expect(info.identity).toBeNull();
    expect(info.fingerprints.length).toBe(1);
    expect(info.fingerprints[0].startsWith("sha-256")).toBe(true);
    expect(info.iceUfrag).toBe("aeth");
  });

  test("inject then parse a=identity", () => {
    const sdp = injectSdpIdentity(MOCK_OFFER_SDP, "header.payload.sig");
    const info = parseSdpIdentity(sdp);
    expect(info.identity).toBe("header.payload.sig");
    expect(sdp).toContain("a=fingerprint:");
  });

  test("sign ES384 assertion bound to fingerprints", () => {
    const kp = generateBedrockKeyPair();
    const chain = buildOfflineChain("Aether", kp);
    const sdp = applyIdentityToOffer(MOCK_OFFER_SDP, {
      privateKeyPem: kp.privateKeyPem,
      token: chain.multiplayerToken,
      domain: "aether.test",
    });
    const info = parseSdpIdentity(sdp);
    expect(info.identity?.split(".").length).toBe(3);
    const claims = decodeIdentityJwt(info.identity!);
    expect(claims?.domain).toBe("aether.test");
    expect(Array.isArray(claims?.fingerprints)).toBe(true);
    expect((claims?.fingerprints as string[])[0]).toContain("sha-256");
  });

  test("answer without identity is detectable", () => {
    expect(parseSdpIdentity(MOCK_ANSWER_SDP).identity).toBeNull();
  });
});
