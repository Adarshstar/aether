/**
 * Microsoft / Xbox / Minecraft Bedrock authentication
 * Full device-code + refresh-token flow with optional disk cache.
 * Builds ES384 JWT chain via JwtChain for BDS 1.26.52.3 login.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildOfflineChain, buildOnlineChain, generateBedrockKeyPair, type ChainResult } from "./JwtChain";

export interface AuthResult {
  offline: boolean;
  username: string;
  xuid?: string;
  uuid?: string;
  chain?: string[];
  multiplayerToken?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  keyPair?: ChainResult["keyPair"];
}

export interface XboxAuthOptions {
  username: string;
  offline?: boolean;
  clientId?: string;
  /** MSA refresh token (skips device code) */
  refreshToken?: string;
  /** Directory to cache tokens (default: .aether-auth) */
  cacheDir?: string;
  /** Persist refresh token to cacheDir */
  persistTokens?: boolean;
  /** If online fails, fall back to offline chain (default true) */
  fallbackOffline?: boolean;
}

const MSA_DEVICE_CODE = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const MSA_TOKEN = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const XBL_USER = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_LOGIN = "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_PROFILE = "https://api.minecraftservices.com/minecraft/profile";
/** Public Xbox app client id commonly used by Bedrock tooling */
const DEFAULT_CLIENT_ID = "00000000441cc96b";
const SCOPE = "XboxLive.signin offline_access";

export class XboxAuth {
  private options: Required<Pick<XboxAuthOptions, "offline" | "clientId" | "fallbackOffline" | "persistTokens">> & XboxAuthOptions;
  private cached: AuthResult | null = null;

  constructor(options: XboxAuthOptions) {
    this.options = {
      offline: options.offline ?? true,
      clientId: options.clientId ?? DEFAULT_CLIENT_ID,
      fallbackOffline: options.fallbackOffline ?? true,
      persistTokens: options.persistTokens ?? true,
      cacheDir: options.cacheDir ?? join(process.cwd(), ".aether-auth"),
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
    console.log(`[Auth] Offline chain for "${result.username}" (${result.chain?.length} JWT)`);
    return result;
  }

  private cachePath(): string {
    const dir = this.options.cacheDir!;
    return join(dir, `msa-${this.sanitize(this.options.username)}.json`);
  }

  private sanitize(s: string) {
    return s.replace(/[^a-zA-Z0-9._@-]/g, "_").slice(0, 64);
  }

  private loadCache(): { refreshToken?: string; accessToken?: string; expiresAt?: number; username?: string } | null {
    try {
      const p = this.cachePath();
      if (!existsSync(p)) return null;
      return JSON.parse(readFileSync(p, "utf8"));
    } catch {
      return null;
    }
  }

  private saveCache(data: {
    refreshToken?: string;
    accessToken?: string;
    expiresAt?: number;
    username?: string;
  }) {
    if (!this.options.persistTokens) return;
    try {
      const p = this.cachePath();
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, JSON.stringify({ ...data, savedAt: Date.now() }, null, 2));
      console.log(`[Auth] Token cache saved → ${p}`);
    } catch (e: any) {
      console.warn("[Auth] Could not save token cache:", e?.message ?? e);
    }
  }

  private async onlineAuth(): Promise<AuthResult> {
    console.log("[Auth] Microsoft → Xbox Live → XSTS → Minecraft Services → JWT chain");
    const keyPair = generateBedrockKeyPair();

    try {
      let accessToken: string;
      let refreshToken: string | undefined = this.options.refreshToken;
      let msaExpiresIn = 3600;

      // 1) Try explicit refresh token, then disk cache, then device code
      if (!refreshToken) {
        const cached = this.loadCache();
        if (cached?.refreshToken) {
          refreshToken = cached.refreshToken;
          console.log("[Auth] Using cached refresh token");
        }
      }

      if (refreshToken) {
        try {
          const tok = await this.refreshMsa(refreshToken);
          accessToken = tok.access_token;
          refreshToken = tok.refresh_token ?? refreshToken;
          msaExpiresIn = tok.expires_in ?? 3600;
        } catch (e: any) {
          console.warn("[Auth] Refresh failed, falling back to device code:", e?.message ?? e);
          refreshToken = undefined;
          const device = await this.requestDeviceCode();
          console.log("");
          console.log("╔══════════════════════════════════════════════════╗");
          console.log("║  Microsoft device login                          ║");
          console.log(`║  Open: ${device.verification_uri}`);
          console.log(`║  Code: ${device.user_code}`);
          console.log("╚══════════════════════════════════════════════════╝");
          console.log("");
          const tok = await this.pollDeviceCode(device.device_code, device.interval ?? 5);
          accessToken = tok.access_token;
          refreshToken = tok.refresh_token;
          msaExpiresIn = tok.expires_in ?? 3600;
        }
      } else {
        const device = await this.requestDeviceCode();
        console.log("");
        console.log("╔══════════════════════════════════════════════════╗");
        console.log("║  Microsoft device login                          ║");
        console.log(`║  Open: ${device.verification_uri}`);
        console.log(`║  Code: ${device.user_code}`);
        console.log("╚══════════════════════════════════════════════════╝");
        console.log("");
        const tok = await this.pollDeviceCode(device.device_code, device.interval ?? 5);
        accessToken = tok.access_token;
        refreshToken = tok.refresh_token;
        msaExpiresIn = tok.expires_in ?? 3600;
      }

      this.saveCache({
        refreshToken,
        accessToken,
        expiresAt: Date.now() + msaExpiresIn * 1000,
        username: this.options.username,
      });

      // 2) Xbox Live user token
      const xbl = await this.xboxLiveAuth(accessToken);
      const xblToken = xbl.Token as string;

      // 3) XSTS for Minecraft Services
      const xstsMc = await this.xstsAuth(xblToken, "rp://api.minecraftservices.com/");
      const uhs = xstsMc.DisplayClaims?.xui?.[0]?.uhs as string;
      if (!uhs) throw new Error("XSTS missing user hash (uhs)");

      // Optional: XSTS for Xbox Live title (some flows use multiplayer session service)
      try {
        await this.xstsAuth(xblToken, "http://xboxlive.com");
      } catch {
        /* non-fatal for MC services login */
      }

      // 4) Minecraft services
      const mc = await this.minecraftLogin(uhs, xstsMc.Token);
      const profile = await this.minecraftProfile(mc.access_token).catch((e) => {
        console.warn("[Auth] Profile fetch failed:", e?.message ?? e);
        return null;
      });

      // Bedrock may obtain chain via playfab / other endpoints; keep flexible
      let mojangChain: string[] = [];
      if (Array.isArray(mc.chain)) mojangChain = mc.chain;
      else if (Array.isArray(mc.userChain)) mojangChain = mc.userChain;

      const username = profile?.name ?? this.options.username;
      const uuid = profile?.id ?? this.options.username;
      const xuid =
        xstsMc.DisplayClaims?.xui?.[0]?.xid ??
        xstsMc.DisplayClaims?.xui?.[0]?.gtg ??
        "0";

      const built = buildOnlineChain(username, mojangChain, keyPair, String(xuid), uuid);

      const result: AuthResult = {
        offline: false,
        username: built.displayName,
        xuid: built.xuid,
        uuid: built.uuid,
        chain: built.chain,
        multiplayerToken: built.multiplayerToken,
        accessToken: mc.access_token,
        refreshToken,
        expiresAt: Date.now() + (mc.expires_in ?? 3600) * 1000,
        keyPair: built.keyPair,
      };
      this.cached = result;
      console.log(`[Auth] Online OK as ${result.username} xuid=${result.xuid} chain=${result.chain?.length}`);
      return result;
    } catch (err: any) {
      console.error("[Auth] Online failed:", err?.message ?? err);
      if (this.options.fallbackOffline) {
        console.error("[Auth] Falling back to offline ES384 chain");
        return this.offlineAuth();
      }
      throw err;
    }
  }

  private async requestDeviceCode(): Promise<any> {
    const body = new URLSearchParams({
      client_id: this.options.clientId,
      scope: SCOPE,
    });
    const res = await fetch(MSA_DEVICE_CODE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Device code HTTP ${res.status}: ${t.slice(0, 200)}`);
    }
    return res.json();
  }

  private async pollDeviceCode(deviceCode: string, intervalSec: number): Promise<any> {
    const deadline = Date.now() + 15 * 60 * 1000;
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
      if (data.error === "slow_down") {
        intervalSec += 5;
        continue;
      }
      if (data.error === "expired_token") throw new Error("Device code expired — run again");
      throw new Error(data.error_description || data.error || "poll failed");
    }
    throw new Error("Device code timed out (15 min)");
  }

  private async refreshMsa(refreshToken: string): Promise<any> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.options.clientId,
      refresh_token: refreshToken,
      scope: SCOPE,
    });
    const res = await fetch(MSA_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    if (!data.access_token) {
      throw new Error(data.error_description || data.error || `Refresh HTTP ${res.status}`);
    }
    return data;
  }

  private async xboxLiveAuth(msaAccessToken: string): Promise<any> {
    const rpsTicket = msaAccessToken.startsWith("d=") ? msaAccessToken : `d=${msaAccessToken}`;
    const res = await fetch(XBL_USER, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: rpsTicket,
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT",
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`XBL HTTP ${res.status}: ${t.slice(0, 200)}`);
    }
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
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      // 2148916233 = no Xbox account, 2148916238 = child account
      throw new Error(`XSTS HTTP ${res.status}: ${t.slice(0, 300)}`);
    }
    return res.json();
  }

  private async minecraftLogin(uhs: string, xstsToken: string): Promise<any> {
    const res = await fetch(MC_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityToken: `XBL3.0 x=${uhs};${xstsToken}` }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`MC login HTTP ${res.status}: ${t.slice(0, 200)}`);
    }
    return res.json();
  }

  private async minecraftProfile(accessToken: string): Promise<any> {
    const res = await fetch(MC_PROFILE, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Profile HTTP ${res.status}`);
    return res.json();
  }

  getCached() {
    return this.cached;
  }

  /** Clear cached tokens for this username */
  clearCache() {
    try {
      const p = this.cachePath();
      if (existsSync(p)) {
        writeFileSync(p, "{}");
        console.log("[Auth] Cache cleared");
      }
    } catch { /* ignore */ }
  }
}
