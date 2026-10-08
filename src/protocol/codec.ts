import { sign } from "node:crypto";
/**
 * Aether packet codec layer — protocol 2193
 * Every PacketId has encode/decode. Critical packets are high-fidelity.
 */

import { BinaryWriter, BinaryReader, encodePacket, decodePacketHeader } from "./binary";
import { PacketId, ProtocolVersion } from "./packets";
import { encodeBitset, decodeBitset, PLAYER_AUTH_INPUT_BITS } from "./authInput";
import { encodeLevelChunkBody, decodeLevelChunkBody } from "../world/levelChunk";
import { encodeNetworkItem, decodeNetworkItem, encodeItemList, decodeItemList } from "./itemStack";
import {
  encodeSubChunkRequest, decodeSubChunkRequest,
  encodeSubChunkPacket, decodeSubChunkPacket,
} from "./subchunk";

export type CodecFn = {
  encode: (data: any) => Buffer;
  decode: (buf: Buffer) => any;
};

const codecs = new Map<number, CodecFn>();
const specialized = new Set<number>();

export function registerCodec(id: number, codec: CodecFn, isSpecialized = false) {
  codecs.set(id, codec);
  if (isSpecialized) specialized.add(id);
}

export function hasCodec(id: number) {
  return codecs.has(id);
}

export function encodeGamePacket(id: number, data: any = {}): Buffer {
  const c = codecs.get(id);
  const payload = c ? c.encode(data ?? {}) : encodeGeneric(data);
  return encodePacket(id, payload);
}

export function decodeGamePacket(buf: Buffer): { id: number; data: any; bytesRead: number } {
  const { id, payload, bytesRead } = decodePacketHeader(buf);
  const c = codecs.get(id);
  const data = c ? c.decode(payload) : decodeGeneric(payload);
  return { id, data, bytesRead };
}

function encodeGeneric(data: any): Buffer {
  if (data == null || (typeof data === "object" && Object.keys(data).length === 0)) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(data)) return data;
  if (data.raw && Buffer.isBuffer(data.raw)) return data.raw;
  return Buffer.from(JSON.stringify(data), "utf8");
}

function decodeGeneric(buf: Buffer): any {
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return { raw: buf, length: buf.length };
  }
}

function emptyCodec(): CodecFn {
  return {
    encode: () => Buffer.alloc(0),
    decode: () => ({}),
  };
}

function stringCodec(field = "value"): CodecFn {
  return {
    encode(data) {
      const w = new BinaryWriter();
      w.writeString(data?.[field] ?? data?.message ?? "");
      return w.toBuffer();
    },
    decode(buf) {
      if (!buf.length) return { [field]: "" };
      return { [field]: new BinaryReader(buf).readString() };
    },
  };
}

function varIntCodec(field: string): CodecFn {
  return {
    encode(data) {
      const w = new BinaryWriter();
      w.writeVarInt(data?.[field] ?? 0);
      return w.toBuffer();
    },
    decode(buf) {
      return { [field]: buf.length ? new BinaryReader(buf).readVarInt() : 0 };
    },
  };
}

function varLongCodec(field: string): CodecFn {
  return {
    encode(data) {
      const w = new BinaryWriter();
      w.writeVarLong(BigInt(data?.[field] ?? 0));
      return w.toBuffer();
    },
    decode(buf) {
      return { [field]: buf.length ? Number(new BinaryReader(buf).readVarLong()) : 0 };
    },
  };
}

function registerAll() {
  for (const key of Object.keys(PacketId)) {
    const id = (PacketId as any)[key];
    if (typeof id === "number" && !codecs.has(id)) {
      registerCodec(id, { encode: encodeGeneric, decode: decodeGeneric });
    }
  }

  registerCodec(PacketId.RequestNetworkSettings, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeI32BE(data.clientNetworkVersion ?? ProtocolVersion);
      return w.toBuffer();
    },
    decode(buf) {
      return { clientNetworkVersion: new BinaryReader(buf).readI32BE() };
    },
  }, true);

  registerCodec(PacketId.NetworkSettings, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeU16(data.compressionThreshold ?? 1);
      w.writeU16(data.compressionAlgorithm ?? 0);
      w.writeU8(data.clientThrottle ?? 0);
      w.writeU8(data.clientThrottleThreshold ?? 0);
      w.writeF32(data.clientThrottleScalar ?? 0);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return {
        compressionThreshold: r.readU16(),
        compressionAlgorithm: r.readU16(),
        clientThrottle: r.remaining ? r.readU8() : 0,
        clientThrottleThreshold: r.remaining ? r.readU8() : 0,
        clientThrottleScalar: r.remaining ? r.readF32() : 0,
      };
    },
  }, true);

  registerCodec(PacketId.Login, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeI32BE(data.protocol ?? ProtocolVersion);
      // 1.21.90+ / protocol ~818+: identity envelope with Certificate + AuthenticationType + Token
      const chainArr = data.chain ?? [];
      // Prefer 1.21.90+ envelope; fall back to legacy {chain} when explicitly requested
      const useEnvelope = data.legacyIdentity !== true;
      const chainStr = useEnvelope
        ? JSON.stringify({
            Certificate: JSON.stringify({ chain: chainArr }),
            AuthenticationType: data.offline ? 2 : 0,
            Token: data.multiplayerToken ?? data.token ?? "",
          })
        : JSON.stringify({ chain: chainArr });

      // Client data MUST be an ES384 JWT (not raw JSON). Plain JSON is rejected by BDS.
      let clientJwt: string;
      if (typeof data.clientJwt === "string" && data.clientJwt.includes(".")) {
        clientJwt = data.clientJwt;
      } else {
        const solid = Buffer.alloc(32 * 64 * 4, 0);
        for (let i = 3; i < solid.length; i += 4) solid[i] = 255; // opaque black
        const skinDataB64 = solid.toString("base64");
        const geomVerB64 = Buffer.from("0.0.0").toString("base64");
        const payload: Record<string, unknown> = {
          AnimatedImageData: [],
          ArmSize: "wide",
          CapeData: "",
          CapeId: "",
          CapeImageHeight: 0,
          CapeImageWidth: 0,
          CapeOnClassicSkin: false,
          ClientRandomId: data.clientRandomId ?? Date.now(),
          CompatibleWithClientSideChunkGen: false,
          CurrentInputMode: 1,
          DefaultInputMode: 1,
          DeviceId: data.uuid ?? data.deviceId ?? "aether-device",
          DeviceModel: "Aether",
          DeviceOS: data.deviceOS ?? 1, // Android
          GameVersion: "1.26.52",
          GuiScale: 0,
          IsEditorMode: false,
          LanguageCode: "en_US",
          OverrideSkin: false,
          PersonaPieces: [],
          PersonaSkin: false,
          PieceTintColors: [],
          PlatformOfflineId: "",
          PlatformOnlineId: data.xuid ? String(data.xuid) : "",
          PlayFabId: (data.uuid ?? "0000000000000000").replace(/-/g, "").slice(0, 16).toLowerCase(),
          PremiumSkin: false,
          SelfSignedId: data.uuid ?? "",
          ServerAddress: data.serverAddress ?? "",
          SkinAnimationData: "",
          SkinColor: "#0",
          SkinData: skinDataB64,
          SkinGeometryData: "",
          SkinGeometryDataEngineVersion: geomVerB64,
          SkinId: data.uuid ?? "Standard_Custom",
          SkinImageHeight: 32,
          SkinImageWidth: 64,
          SkinResourcePatch: Buffer.from(
            JSON.stringify({ geometry: { default: "geometry.humanoid.custom" } })
          ).toString("base64"),
          ThirdPartyName: data.username ?? "",
          TrustedSkin: false,
          UIProfile: 0,
        };
        if (data.privateKeyPem) {
          const b64url = (buf: Buffer | string) =>
            Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
          const header = { alg: "ES384", x5u: data.identityPublicKey ?? data.x509 ?? "" };
          const h = b64url(JSON.stringify(header));
          const p = b64url(JSON.stringify(payload));
          const signingInput = `${h}.${p}`;
          const sig = sign("SHA384", Buffer.from(signingInput), {
            key: data.privateKeyPem,
            dsaEncoding: "ieee-p1363",
          });
          clientJwt = `${signingInput}.${b64url(sig)}`;
        } else {
          // Offline fallback: unsigned JSON (may still be rejected by online BDS)
          clientJwt = JSON.stringify(payload);
        }
      }

      const inner = new BinaryWriter();
      const chainBuf = Buffer.from(chainStr, "utf8");
      inner.writeU32(chainBuf.length);
      inner.writeRaw(chainBuf);
      const jwtBuf = Buffer.from(clientJwt, "utf8");
      inner.writeU32(jwtBuf.length);
      inner.writeRaw(jwtBuf);
      const body = inner.toBuffer();
      if (typeof console !== "undefined") {
        console.log(`[Login] authInfoLen=${chainBuf.length} clientJwtLen=${jwtBuf.length} authHead=${chainStr.slice(0, 120)}`);
      }
      w.writeVarInt(body.length);
      return Buffer.concat([w.toBuffer(), body]);
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      const protocol = r.readI32BE();
      return { protocol, rawLength: buf.length };
    },
  }, true);

  registerCodec(PacketId.PlayStatus, {
    encode(data) {
      const w = new BinaryWriter();
      const map: Record<string, number> = {
        login_success: 0,
        failed_client: 1,
        failed_spawn: 2,
        player_spawn: 3,
        failed_invalid_tenant: 4,
        failed_vanilla_edu: 5,
        failed_edu_vanilla: 6,
        failed_server_full: 7,
      };
      const status = typeof data.status === "string" ? (map[data.status] ?? 0) : (data.status ?? 0);
      w.writeI32BE(status);
      return w.toBuffer();
    },
    decode(buf) {
      const status = new BinaryReader(buf).readI32BE();
      const names = ["login_success", "failed_client", "failed_spawn", "player_spawn"];
      return { status, statusName: names[status] ?? String(status) };
    },
  }, true);

  registerCodec(PacketId.ServerToClientHandshake, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeString(data.jwt ?? data.token ?? "");
      return w.toBuffer();
    },
    decode(buf) {
      if (!buf.length) return {};
      try { return { jwt: new BinaryReader(buf).readString() }; }
      catch { return { raw: buf }; }
    },
  }, true);
  registerCodec(PacketId.ClientToServerHandshake, emptyCodec(), true);

  registerCodec(PacketId.Disconnect, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeVarInt(data.reason ?? 0);
      const msg = data.message ?? "";
      w.writeU8(msg ? 1 : 0);
      if (msg) w.writeString(msg);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      const reason = r.readVarInt();
      const has = r.remaining ? r.readU8() : 0;
      return { reason, message: has ? r.readString() : "" };
    },
  }, true);

  registerCodec(PacketId.ResourcePacksInfo, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeU8(data.mustAccept ? 1 : 0);
      w.writeU8(data.hasScripts ? 1 : 0);
      w.writeU8(data.forceDisableVibrantVisuals ? 1 : 0);
      w.writeU16(0);
      w.writeU16(0);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return {
        mustAccept: !!r.readU8(),
        hasScripts: r.remaining ? !!r.readU8() : false,
      };
    },
  }, true);

  registerCodec(PacketId.ResourcePackStack, {
    encode() {
      const w = new BinaryWriter();
      w.writeU8(0);
      w.writeVarInt(0);
      w.writeVarInt(0);
      w.writeString("");
      return w.toBuffer();
    },
    decode: decodeGeneric,
  });

  registerCodec(PacketId.ResourcePackClientResponse, {
    encode(data) {
      const w = new BinaryWriter();
      // 1.26+ (gophertunnel): Varuint32 response + string name [+ pack list if downloading]
      // 0 cancel, 1 downloading, 2 downloadingfinished, 3 resourcepackstackfinished
      const map: Record<string, number> = {
        refused: 0, cancel: 0,
        send_packs: 1, downloading: 1,
        have_all_packs: 2, downloadingfinished: 2,
        completed: 3, resourcepackstackfinished: 3,
      };
      const names = ["cancel", "downloading", "downloadingfinished", "resourcepackstackfinished"];
      let st = typeof data.responseStatus === "string"
        ? (map[data.responseStatus] ?? 2)
        : (data.responseStatus ?? 2);
      if (st > 3) st = 3;
      w.writeVarInt(st);
      w.writeString(names[st] ?? "downloadingfinished");
      if (st === 1) {
        const ids: string[] = data.resourcePackIds ?? [];
        w.writeVarInt(ids.length);
        for (const id of ids) w.writeString(id);
      }
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      const responseStatus = r.readVarInt();
      const name = r.remaining ? r.readString() : "";
      return { responseStatus, name };
    },
  }, true);

  registerCodec(PacketId.Text, {
    encode(data) {
      const w = new BinaryWriter();
      const type = data.type ?? 1;
      w.writeU8(data.needsTranslation ? 1 : 0);
      let category = 0;
      if (type === 1 || type === 7 || type === 8) category = 1;
      else if (type === 2 || type === 3 || type === 4) category = 2;
      w.writeU8(category);
      w.writeU8(type);
      if (type === 1 || type === 7 || type === 8) {
        w.writeString(data.sourceName ?? "");
        w.writeString(data.message ?? " ");
      } else if (type === 2 || type === 3 || type === 4) {
        w.writeString(data.message ?? " ");
        const params = data.parameters ?? [];
        w.writeVarInt(params.length);
        for (const p of params) w.writeString(p);
      } else {
        w.writeString(data.message ?? " ");
      }
      w.writeString(data.xuid ?? data.xboxUserId ?? "");
      w.writeString(data.platformChatId ?? "");
      if (data.filteredMessage != null && data.filteredMessage !== "") {
        w.writeU8(1);
        w.writeString(data.filteredMessage);
      } else {
        w.writeU8(0);
      }
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      const needsTranslation = !!r.readU8();
      const category = r.readU8();
      const type = r.readU8();
      let sourceName = "", message = "";
      const parameters: string[] = [];
      if (type === 1 || type === 7 || type === 8) {
        sourceName = r.readString();
        message = r.readString();
      } else if (type === 2 || type === 3 || type === 4) {
        message = r.readString();
        const n = r.readVarInt();
        for (let i = 0; i < n; i++) parameters.push(r.readString());
      } else {
        message = r.readString();
      }
      const xuid = r.remaining ? r.readString() : "";
      const platformChatId = r.remaining ? r.readString() : "";
      let filteredMessage: string | undefined;
      if (r.remaining && r.readU8()) filteredMessage = r.readString();
      return { type, needsTranslation, category, sourceName, message, parameters, xuid, platformChatId, filteredMessage };
    },
  }, true);

  registerCodec(PacketId.SetTime, varIntCodec("time"), true);

  registerCodec(PacketId.StartGame, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeZigZag64(BigInt(data.entityId ?? 1));
      w.writeVarLong(BigInt(data.runtimeEntityId ?? 1));
      w.writeZigZag32(data.gamemode ?? 0);
      w.writeF32(data.spawn?.x ?? 0);
      w.writeF32(data.spawn?.y ?? 65);
      w.writeF32(data.spawn?.z ?? 0);
      w.writeF32(data.yaw ?? 0);
      w.writeF32(data.pitch ?? 0);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      if (buf.length < 16) return { gamemode: 0, spawn: { x: 0, y: 65, z: 0 } };
      try {
        const entityId = Number(r.readZigZag64());
        const runtimeEntityId = Number(r.readVarLong());
        const gamemode = r.readZigZag32();
        const x = r.readF32(), y = r.readF32(), z = r.readF32();
        return {
          entityId, runtimeEntityId, gamemode,
          spawn: { x, y, z },
          yaw: r.remaining >= 4 ? r.readF32() : 0,
          pitch: r.remaining >= 4 ? r.readF32() : 0,
        };
      } catch {
        return { gamemode: 0, spawn: { x: 0, y: 65, z: 0 } };
      }
    },
  }, true);

  registerCodec(PacketId.MovePlayer, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeVarLong(BigInt(data.runtimeEntityId ?? 1));
      w.writeF32(data.position?.x ?? 0);
      w.writeF32(data.position?.y ?? 0);
      w.writeF32(data.position?.z ?? 0);
      w.writeF32(data.pitch ?? 0);
      w.writeF32(data.yaw ?? 0);
      w.writeF32(data.headYaw ?? data.yaw ?? 0);
      w.writeU8(data.mode ?? 0);
      w.writeU8(data.onGround ? 1 : 0);
      w.writeVarLong(BigInt(data.riddenRuntimeEntityId ?? 0));
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return {
        runtimeEntityId: Number(r.readVarLong()),
        position: { x: r.readF32(), y: r.readF32(), z: r.readF32() },
        pitch: r.readF32(),
        yaw: r.readF32(),
        headYaw: r.readF32(),
        mode: r.readU8(),
        onGround: !!r.readU8(),
      };
    },
  }, true);

  registerCodec(PacketId.PlayerAuthInput, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeF32(data.pitch ?? 0);
      w.writeF32(data.yaw ?? 0);
      w.writeF32(data.position?.x ?? 0);
      w.writeF32(data.position?.y ?? 0);
      w.writeF32(data.position?.z ?? 0);
      w.writeF32(data.moveVecX ?? 0);
      w.writeF32(data.moveVecZ ?? 0);
      w.writeF32(data.headYaw ?? data.yaw ?? 0);
      const bits = typeof data.inputData === "bigint"
        ? data.inputData
        : BigInt(data.inputData ?? 0);
      w.writeRaw(encodeBitset(bits, PLAYER_AUTH_INPUT_BITS));
      w.writeVarInt(data.inputMode ?? 1);
      w.writeVarInt(data.playMode ?? 0);
      w.writeVarInt(data.interactionModel ?? 2);
      w.writeF32(data.interactPitch ?? data.pitch ?? 0);
      w.writeF32(data.interactYaw ?? data.yaw ?? 0);
      w.writeVarLong(BigInt(data.tick ?? 0));
      w.writeF32(data.delta?.x ?? 0);
      w.writeF32(data.delta?.y ?? 0);
      w.writeF32(data.delta?.z ?? 0);
      w.writeF32(data.analogueMoveX ?? data.moveVecX ?? 0);
      w.writeF32(data.analogueMoveZ ?? data.moveVecZ ?? 0);
      w.writeF32(data.cameraOrientation?.x ?? 0);
      w.writeF32(data.cameraOrientation?.y ?? 1);
      w.writeF32(data.cameraOrientation?.z ?? 0);
      w.writeF32(data.rawMoveX ?? data.moveVecX ?? 0);
      w.writeF32(data.rawMoveZ ?? data.moveVecZ ?? 0);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      const pitch = r.readF32(), yaw = r.readF32();
      const position = { x: r.readF32(), y: r.readF32(), z: r.readF32() };
      const moveVecX = r.readF32(), moveVecZ = r.readF32();
      const headYaw = r.readF32();
      const rest = buf.subarray(r.offsetPos);
      const { value: inputData, bytesRead } = decodeBitset(rest, 0, PLAYER_AUTH_INPUT_BITS);
      const r2 = new BinaryReader(buf.subarray(r.offsetPos + bytesRead));
      return {
        pitch, yaw, position, moveVecX, moveVecZ, headYaw,
        inputData,
        inputDataNum: Number(inputData & 0xffffffffn),
        inputMode: r2.remaining ? r2.readVarInt() : 1,
        playMode: r2.remaining ? r2.readVarInt() : 0,
        interactionModel: r2.remaining ? r2.readVarInt() : 2,
        interactPitch: r2.remaining >= 4 ? r2.readF32() : pitch,
        interactYaw: r2.remaining >= 4 ? r2.readF32() : yaw,
        tick: r2.remaining ? Number(r2.readVarLong()) : 0,
        delta: r2.remaining >= 12
          ? { x: r2.readF32(), y: r2.readF32(), z: r2.readF32() }
          : { x: 0, y: 0, z: 0 },
      };
    },
  }, true);

  registerCodec(PacketId.SetLocalPlayerAsInitialized, varLongCodec("runtimeEntityId"), true);
  registerCodec(PacketId.RequestChunkRadius, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeZigZag32(data.chunkRadius ?? 8);
      w.writeU8(data.maxRadius ?? 20);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return { chunkRadius: r.readZigZag32() };
    },
  }, true);
  registerCodec(PacketId.ChunkRadiusUpdate, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeZigZag32(data.chunkRadius ?? 8);
      return w.toBuffer();
    },
    decode(buf) {
      return { chunkRadius: new BinaryReader(buf).readZigZag32() };
    },
  }, true);

  registerCodec(PacketId.SetHealth, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeVarInt(data.health ?? 20);
      return w.toBuffer();
    },
    decode(buf) {
      return { health: new BinaryReader(buf).readVarInt() };
    },
  }, true);

  registerCodec(PacketId.Animate, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeZigZag32(data.actionId ?? 1);
      w.writeVarLong(BigInt(data.runtimeEntityId ?? 1));
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return { actionId: r.readZigZag32(), runtimeEntityId: Number(r.readVarLong()) };
    },
  }, true);

  registerCodec(PacketId.Interact, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeU8(data.actionId ?? 2);
      w.writeVarLong(BigInt(data.targetRuntimeEntityId ?? 0));
      if (data.position) {
        w.writeF32(data.position.x); w.writeF32(data.position.y); w.writeF32(data.position.z);
      }
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return {
        actionId: r.readU8(),
        targetRuntimeEntityId: Number(r.readVarLong()),
      };
    },
  }, true);

  registerCodec(PacketId.PlayerAction, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeVarLong(BigInt(data.runtimeEntityId ?? 1));
      w.writeZigZag32(data.action ?? 0);
      w.writeZigZag32(data.position?.x ?? 0);
      w.writeZigZag32(data.position?.y ?? 0);
      w.writeZigZag32(data.position?.z ?? 0);
      w.writeZigZag32(data.resultPosition?.x ?? data.position?.x ?? 0);
      w.writeZigZag32(data.resultPosition?.y ?? data.position?.y ?? 0);
      w.writeZigZag32(data.resultPosition?.z ?? data.position?.z ?? 0);
      w.writeZigZag32(data.face ?? 0);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return {
        runtimeEntityId: Number(r.readVarLong()),
        action: r.readZigZag32(),
        position: { x: r.readZigZag32(), y: r.readZigZag32(), z: r.readZigZag32() },
      };
    },
  }, true);

  registerCodec(PacketId.MobEquipment, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeVarLong(BigInt(data.runtimeEntityId ?? 1));
      w.writeRaw(encodeNetworkItem(data.item));
      w.writeU8(data.slot ?? 0);
      w.writeU8(data.selectedSlot ?? 0);
      w.writeU8(data.windowId ?? 0);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      const runtimeEntityId = Number(r.readVarLong());
      const item = decodeNetworkItem(r);
      return {
        runtimeEntityId,
        item,
        slot: r.remaining ? r.readU8() : 0,
        selectedSlot: r.remaining ? r.readU8() : 0,
        windowId: r.remaining ? r.readU8() : 0,
      };
    },
  }, true);

  registerCodec(PacketId.InventoryContent, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeVarInt(data.windowId ?? 0);
      const items: any[] = data.items ?? data.slots ?? [];
      w.writeRaw(encodeItemList(items));
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      const windowId = r.readVarInt();
      const items = decodeItemList(r);
      return { windowId, items };
    },
  }, true);

  registerCodec(PacketId.InventorySlot, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeVarInt(data.windowId ?? 0);
      w.writeVarInt(data.slot ?? 0);
      w.writeRaw(encodeNetworkItem(data.item));
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return {
        windowId: r.readVarInt(),
        slot: r.readVarInt(),
        item: decodeNetworkItem(r),
      };
    },
  }, true);

  registerCodec(PacketId.PlayerHotbar, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeVarInt(data.selectedSlot ?? 0);
      w.writeU8(data.windowId ?? 0);
      w.writeU8(data.selectHotbarSlot === false ? 0 : 1);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return {
        selectedSlot: r.readVarInt(),
        windowId: r.remaining ? r.readU8() : 0,
        selectHotbarSlot: r.remaining ? !!r.readU8() : true,
      };
    },
  }, true);

  registerCodec(PacketId.ContainerClose, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeU8(data.windowId ?? 0);
      w.writeU8(data.server ? 1 : 0);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return { windowId: r.readU8(), server: r.remaining ? !!r.readU8() : false };
    },
  }, true);

  registerCodec(PacketId.Respawn, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeF32(data.position?.x ?? 0);
      w.writeF32(data.position?.y ?? 0);
      w.writeF32(data.position?.z ?? 0);
      w.writeU8(data.state ?? 0);
      w.writeVarLong(BigInt(data.runtimeEntityId ?? 1));
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return {
        position: { x: r.readF32(), y: r.readF32(), z: r.readF32() },
        state: r.readU8(),
        runtimeEntityId: Number(r.readVarLong()),
      };
    },
  }, true);

  registerCodec(PacketId.CommandRequest, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeString(data.command ?? "");
      w.writeVarInt(0);
      w.writeU8(data.internal ? 1 : 0);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return { command: r.readString() };
    },
  }, true);

  registerCodec(PacketId.UpdateBlock, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeZigZag32(data.position?.x ?? 0);
      w.writeVarInt(data.position?.y ?? 0);
      w.writeZigZag32(data.position?.z ?? 0);
      w.writeVarInt(data.blockRuntimeId ?? 0);
      w.writeVarInt(data.flags ?? 0);
      w.writeVarInt(data.layer ?? 0);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return {
        position: { x: r.readZigZag32(), y: r.readVarInt(), z: r.readZigZag32() },
        blockRuntimeId: r.readVarInt(),
        flags: r.remaining ? r.readVarInt() : 0,
        layer: r.remaining ? r.readVarInt() : 0,
      };
    },
  }, true);

  registerCodec(PacketId.LevelChunk, {
    encode(data) {
      if (Buffer.isBuffer(data.raw) && data.skipWrap) return data.raw;
      return encodeLevelChunkBody({
        x: data.x ?? 0,
        z: data.z ?? 0,
        dimension: data.dimension ?? 0,
        subChunkCount: data.subChunkCount ?? 0,
        cacheEnabled: !!data.cacheEnabled,
        payload: data.payload,
        highestSubChunk: data.highestSubChunk,
      });
    },
    decode(buf) {
      try {
        return decodeLevelChunkBody(buf);
      } catch {
        return { raw: buf };
      }
    },
  }, true);

  registerCodec(PacketId.SubChunkRequest, {
    encode(data) {
      return encodeSubChunkRequest({
        dimension: data.dimension ?? 0,
        origin: data.origin ?? data.position ?? { x: 0, y: 0, z: 0 },
        offsets: data.offsets ?? [],
      });
    },
    decode(buf) {
      return decodeSubChunkRequest(buf);
    },
  }, true);

  registerCodec(PacketId.SubChunk, {
    encode(data) {
      return encodeSubChunkPacket({
        cacheEnabled: !!data.cacheEnabled,
        dimension: data.dimension ?? 0,
        origin: data.origin ?? data.position ?? { x: 0, y: 0, z: 0 },
        entries: data.entries ?? [],
      });
    },
    decode(buf) {
      return decodeSubChunkPacket(buf);
    },
  }, true);

  registerCodec(PacketId.ClientCacheStatus, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeBool(!!data.enabled);
      return w.toBuffer();
    },
    decode(buf) {
      return { enabled: buf.length ? new BinaryReader(buf).readBool() : false };
    },
  }, true);

  registerCodec(PacketId.NetworkChunkPublisherUpdate, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeZigZag32(data.position?.x ?? 0);
      w.writeVarInt(data.position?.y ?? 0);
      w.writeZigZag32(data.position?.z ?? 0);
      w.writeU32(data.radius ?? 0);
      const saved = data.savedChunks ?? [];
      w.writeVarInt(saved.length);
      for (const c of saved) {
        w.writeZigZag32(c.x ?? 0);
        w.writeZigZag32(c.z ?? 0);
      }
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      const position = {
        x: r.readZigZag32(),
        y: r.readVarInt(),
        z: r.readZigZag32(),
      };
      const radius = r.remaining >= 4 ? r.readU32() : 0;
      const n = r.remaining ? r.readVarInt() : 0;
      const savedChunks: Array<{ x: number; z: number }> = [];
      for (let i = 0; i < n && r.remaining > 0; i++) {
        savedChunks.push({ x: r.readZigZag32(), z: r.readZigZag32() });
      }
      return { position, radius, savedChunks };
    },
  }, true);

  registerCodec(PacketId.RemoveEntity, varLongCodec("entityId"), true);
  registerCodec(PacketId.SetEntityMotion, {
    encode(data) {
      const w = new BinaryWriter();
      w.writeVarLong(BigInt(data.runtimeEntityId ?? 0));
      w.writeF32(data.velocity?.x ?? 0);
      w.writeF32(data.velocity?.y ?? 0);
      w.writeF32(data.velocity?.z ?? 0);
      return w.toBuffer();
    },
    decode(buf) {
      const r = new BinaryReader(buf);
      return {
        runtimeEntityId: Number(r.readVarLong()),
        velocity: { x: r.readF32(), y: r.readF32(), z: r.readF32() },
      };
    },
  }, true);
}

registerAll();

export function encodeBatch(packets: Buffer[]): Buffer {
  const parts: Buffer[] = [];
  for (const p of packets) {
    const lw = new BinaryWriter();
    lw.writeVarInt(p.length);
    parts.push(lw.toBuffer(), p);
  }
  return Buffer.concat(parts);
}

export function decodeBatch(buf: Buffer): Buffer[] {
  const out: Buffer[] = [];
  const r = new BinaryReader(buf);
  while (r.remaining > 0) {
    try {
      const len = r.readVarInt();
      if (len <= 0 || len > r.remaining) break;
      out.push(r.readBuffer(len));
    } catch { break; }
  }
  return out;
}

export function getRegisteredCodecIds(): number[] {
  return [...codecs.keys()];
}

export function getCodecCoverage(): { total: number; specialized: number } {
  return { total: codecs.size, specialized: specialized.size };
}
