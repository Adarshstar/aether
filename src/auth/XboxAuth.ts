/**
 * Microsoft / Xbox / Minecraft Bedrock authentication
 * + Bedrock JWT chain (ES384) via JwtChain
 */

import { buildOfflineChain, buildOnlineChain, generateBedrockKeyPair, type ChainResult } from "./JwtChain";

export interface AuthResult {
  offline: boolean;
  username: string;
  xuid?: string;
  uuid?: string;
  chain?: string[];
  multiplayerToken?: string;
  accessToken?: string;
  expiresAt?: number;
  keyPair?: ChainResult["keyPair"];
}

export interface XboxAuthOptions {
  username: string;
  offline?: boolean;
  clientId?: string;
  refreshToken?: string;
}

const MSA_DEVICE_CODE = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const MSA_TOKEN = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const XBL_USER = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_LOGIN = "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_PROFILE = "https://api.minecraftservices.com/minecraft/profile";
const DEFAULT_CLIENT_ID = "00000000441cc96b";

export class XboxAuth {
  private options: XboxAuthOptions & { offline: boolean; clientId: string };
  private cached: AuthResult | null = null;

  constructor(options: XboxAuthOptions) {
    this.options = {
      offline: options.offline ?? true,
      clientId: options.clientId ?? DEFAULT_CLIENT_ID,
      ...options,
    };
  }

  async authenticate(): Promise<AuthResult> {
    if (this.options.offline) return this.offlineAuth();
    return this.onlineAuth();
  }

  private offlineAuth(): AuthResult {
    const chain = buildOfflineChain(this.options.username);
    const result: AuthResult = {
      offline: true,
      username: chain.displayName,
      xuid: chain.xuid,
      uuid: chain.uuid,
      chain: chain.chain,
      multiplayerToken: chain.multiplayerToken,
      keyPair: chain.keyPair,
    };
    this.cached = result;
    console.log(`[Auth] Offline chain built for "${result.username}" (${result.chain?.length} JWT)`);
    return result;
  }

  private async onlineAuth(): Promise<AuthResult> {
    console.log("[Auth] Microsoft device-code → XBL → XSTS → MC → JWT chain");
    const keyPair = generateBedrockKeyPair();

    try {
      let accessToken: string;
      if (this.options.refreshToken) {
        const tok = await this.refreshMsa(this.options.refreshToken);
        accessToken = tok.access_token;
      } else {
        const device = await this.requestDeviceCode();
        console.log(`[Auth] Visit ${device.verification_uri}`);
        console.log(`[Auth] Code: ${device.user_code}`);
        const tok = await this.pollDeviceCode(device.device_code, device.interval ?? 5);
        accessToken = tok.access_token;
      }

      const xbl = await this.xboxLiveAuth(accessToken);
      const xsts = await this.xstsAuth(xbl.Token, "rp://api.minecraftservices.com/");
      const uhs = xsts.DisplayClaims?.xui?.[0]?.uhs;
      const mc = await this.minecraftLogin(uhs, xsts.Token);
      const profile = await this.minecraftProfile(mc.access_token).catch(() => null);

      // Services may return chain in different shapes; normalize
      const mojangChain: string[] = Array.isArray(mc.chain) ? mc.chain
        : typeof mc.access_token === "string" ? [] : [];

      const username = profile?.name ?? this.options.username;
      const xuid = profile?.id ?? "0";
      const built = buildOnlineChain(username, mojangChain, keyPair, xuid, profile?.id);

      const result: AuthResult = {
        offline: false,
        username: built.displayName,
        xuid: built.xuid,
        uuid: built.uuid,
        chain: built.chain,
        multiplayerToken: built.multiplayerToken,
        accessToken: mc.access_token,
        expiresAt: Date.now() + (mc.expires_in ?? 3600) * 1000,
        keyPair: built.keyPair,
      };
      this.cached = result;
      console.log(`[Auth] Online OK as ${result.username} chain=${result.chain?.length}`);
      return result;
    } catch (err: any) {
      console.error("[Auth] Online failed:", err?.message ?? err);
      console.error("[Auth] Falling back to offline ES384 chain");
      return this.offlineAuth();
    }
  }

  private async requestDeviceCode(): Promise<any> {
    const body = new URLSearchParams({
      client_id: this.options.clientId,
      scope: "XboxLive.signin offline_access",
    });
    const res = await fetch(MSA_DEVICE_CODE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`Device code: ${res.status}`);
    return res.json();
  }

  private async pollDeviceCode(deviceCode: string, intervalSec: number): Promise<any> {
    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, Math.max(3, intervalSec) * 1000));
      const body = new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: this.options.clientId,
        device_code: deviceCode,
      });
      const res = await fetch(MSA_TOKEN, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const data = await res.json();
      if (data.access_token) return data;
      if (data.error === "authorization_pending") continue;
      if (data.error === "slow_down") { intervalSec += 5; continue; }
      throw new Error(data.error_description || data.error || "poll failed");
    }
    throw new Error("Device code timed out");
  }

  private async refreshMsa(refreshToken: string): Promise<any> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.options.clientId,
      refresh_token: refreshToken,
      scope: "XboxLive.signin offline_access",
    });
    const res = await fetch(MSA_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`Refresh: ${res.status}`);
    return res.json();
  }

  private async xboxLiveAuth(rpsTicket: string): Promise<any> {
    const res = await fetch(XBL_USER, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: rpsTicket.startsWith("d=") ? rpsTicket : `d=${rpsTicket}`,
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT",
      }),
    });
    if (!res.ok) throw new Error(`XBL: ${res.status}`);
    return res.json();
  }

  private async xstsAuth(userToken: string, relyingParty: string): Promise<any> {
    const res = await fetch(XSTS, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        Properties: { SandboxId: "RETAIL", UserTokens: [userToken] },
        RelyingParty: relyingParty,
        TokenType: "JWT",
      }),
    });
    if (!res.ok) throw new Error(`XSTS: ${res.status}`);
    return res.json();
  }

  private async minecraftLogin(uhs: string, xstsToken: string): Promise<any> {
    const res = await fetch(MC_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityToken: `XBL3.0 x=${uhs};${xstsToken}` }),
    });
    if (!res.ok) throw new Error(`MC login: ${res.status}`);
    return res.json();
  }

  private async minecraftProfile(accessToken: string): Promise<any> {
    const res = await fetch(MC_PROFILE, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Profile: ${res.status}`);
    return res.json();
  }

  getCached() { return this.cached; }
}
