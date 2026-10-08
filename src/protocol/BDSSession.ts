/**
 * Full BDS 1.26.52.3 session: login → packs → start_game → spawn → input loop
 */

import { EventEmitter } from "events";
import type { NetherNetTransport } from "../transport/nethernet";
import { ProtocolClient } from "./ProtocolClient";
import { PacketId, ProtocolVersion } from "./packets";
import type { AuthResult } from "../auth/XboxAuth";
import type { World } from "../world/World";
import type { Vec3 } from "../types";
import {
  encodeInventoryTransaction,
  buildAttackEntityPacket,
  buildUseItemPacket,
  buildReleaseItemPacket,
  InventoryTransactionType,
  type ItemStack,
} from "./inventory_tx";
import { encodeGamePacket } from "./codec";
import { applyLevelChunkToWorld, type DecodedLevelChunk } from "../world/levelChunk";
import {
  flagsFromControls,
  moveVectorFromControls,
  InputMode,
  PlayMode,
  InteractionModel,
  type MovementControls,
} from "./authInput";
import { CompressionAlgorithm } from "./framing";
import type { Inventory } from "../inventory/Inventory";
import { ContainerId, type NetworkItem } from "./itemStack";
import {
  buildColumnRequest,
  applySubChunkPacketToWorld,
  type SubChunkBody,
} from "./subchunk";
import { applyStartGameData } from "../registry/applyStartGame";
import { encodeItemStackRequest, buildTransferRequest } from "./itemStackRequest";
import { RecipeRegistry } from "../recipe/Recipe";

export interface BDSSessionOptions {
  transport: NetherNetTransport;
  username: string;
  offline: boolean;
  auth: AuthResult | null;
  viewDistance?: number;
  world: World;
  inventory?: Inventory;
}

export class BDSSession extends EventEmitter {
  private client: ProtocolClient;
  private opts: BDSSessionOptions;
  private entityId = 1;
  private runtimeEntityId = 1;
  private tick = 0;
  private inputTimer: ReturnType<typeof setInterval> | null = null;
  private spawned = false;
  private position: Vec3 = { x: 0, y: 65, z: 0 };
  private yaw = 0;
  private pitch = 0;
  private lastPosition: Vec3 = { x: 0, y: 65, z: 0 };
  private moveVecX = 0;
  private moveVecZ = 0;
  private inputFlags = 0n;
  private compressionReady = false;
  private controls: MovementControls = {};
  private prevControls: MovementControls = {};
  private publisher = { x: 0, y: 64, z: 0, radius: 8 };
  private requestedColumns = new Set<string>();
  /** Columns waiting for SubChunk response — retried once after timeout */
  private pendingSubChunks = new Map<string, { cx: number; cz: number; dimension: number; highest?: number; at: number }>();
  private subChunkRetryTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: BDSSessionOptions) {
    super();
    this.opts = opts;
    this.client = new ProtocolClient(opts.transport);
    this.wireHandlers();
  }

  get protocol() { return this.client; }
  get isSpawned() { return this.spawned; }
  get pos() { return { ...this.position }; }

  private wireHandlers() {
    this.client.onPacket(PacketId.NetworkSettings, (data) => {
      if (typeof data.compressionThreshold === "number") {
        const alg = data.compressionAlgorithm === 1
          ? CompressionAlgorithm.Snappy
          : CompressionAlgorithm.Deflate;
        this.client.setCompressionThreshold(data.compressionThreshold, alg);
        this.compressionReady = true;
      }
      console.log("[BDSSession] NetworkSettings", data);
      this.emit("network_settings", data);
      // ClientCacheStatus is optional; some BDS builds parse-fail on unexpected pre-login packets.
      // this.client.send(PacketId.ClientCacheStatus, { enabled: false });
      this.sendLogin();
    });

    this.client.onPacket(PacketId.PlayStatus, (data) => {
      this.emit("play_status", data);
      if (data.status === 3 || data.statusName === "player_spawn") {
        this.onPlayerSpawnStatus();
      }
    });

    this.client.onPacket(PacketId.ServerToClientHandshake, (data) => {
      this.emit("server_handshake", data);
      this.client.send(PacketId.ClientToServerHandshake, {});
    });

    this.client.onPacket(PacketId.PacketViolationWarning, (data) => {
      console.log("[BDSSession] PacketViolationWarning", data);
    });

    this.client.onPacket(PacketId.ResourcePacksInfo, () => {
      this.client.send(PacketId.ResourcePackClientResponse, {
        responseStatus: "have_all_packs",
        resourcePackIds: [],
      });
    });

    this.client.onPacket(PacketId.ResourcePackStack, () => {
      this.client.send(PacketId.ResourcePackClientResponse, {
        responseStatus: "completed",
        resourcePackIds: [],
      });
    });

    this.client.onPacket(PacketId.StartGame, (data) => {
      if (data.runtimeEntityId) this.runtimeEntityId = data.runtimeEntityId;
      if (data.entityId) this.entityId = data.entityId;
      if (data.spawn) this.position = { ...data.spawn };
      this.lastPosition = { ...this.position };
      try { applyStartGameData(data); } catch { /* palette optional */ }
      this.emit("start_game", data);
    });

    this.client.onPacket(PacketId.AddEntity, (data) => {
      this.emit("entity_add", {
        id: data.runtimeEntityId ?? data.entityRuntimeId ?? data.id,
        type: data.type ?? data.entityType ?? "unknown",
        position: data.position ?? data.pos ?? { x: 0, y: 0, z: 0 },
        yaw: data.yaw ?? 0,
        pitch: data.pitch ?? 0,
      });
    });

    this.client.onPacket(PacketId.AddPlayer, (data) => {
      this.emit("player_add", {
        id: data.runtimeEntityId ?? data.id,
        username: data.username ?? data.name ?? "player",
        position: data.position ?? { x: 0, y: 0, z: 0 },
      });
    });

    this.client.onPacket(PacketId.RemoveEntity, (data) => {
      this.emit("entity_remove", data.entityRuntimeId ?? data.runtimeEntityId ?? data.id);
    });

    this.client.onPacket(PacketId.ContainerOpen, (data) => {
      this.emit("container_open", {
        windowId: data.windowId,
        type: data.type ?? data.windowType,
        position: data.position,
      });
    });

    this.client.onPacket(PacketId.ContainerClose, (data) => {
      this.emit("container_close", data.windowId);
    });

    this.client.onPacket(PacketId.CraftingData, (data) => {
      // Register shapeless/shaped recipes if server sent a list
      const list = data.recipes ?? data.craftingRecipes ?? [];
      if (Array.isArray(list)) {
        for (const r of list) {
          try {
            if (r.id && r.result) RecipeRegistry.register(r);
          } catch { /* ignore malformed */ }
        }
        this.emit("crafting_data", { count: list.length });
      }
    });

    this.client.onPacket(PacketId.LevelChunk, (data) => {
      if (typeof data.x === "number" && typeof data.z === "number") {
        if (data.requestMode) {
          this.requestColumnSubChunks(data.x, data.z, data.dimension ?? 0, data.highestSubChunk);
        } else {
          try {
            applyLevelChunkToWorld(this.opts.world, data as DecodedLevelChunk);
          } catch {
            this.opts.world.getOrCreateColumn(data.x, data.z);
          }
        }
        this.emit("chunk", data);
      }
    });

    this.client.onPacket(PacketId.SubChunk, (data) => {
      try {
        applySubChunkPacketToWorld(this.opts.world, data as SubChunkBody);
        // Clear pending retry for this column if we can identify origin
        const body = data as SubChunkBody;
        if (body?.origin) {
          const key = `${body.dimension ?? 0}:${body.origin.x}:${body.origin.z}`;
          this.pendingSubChunks.delete(key);
        }
      } catch { /* ignore */ }
      this.emit("subchunk", data);
    });

    this.client.onPacket(PacketId.NetworkChunkPublisherUpdate, (data) => {
      if (data.position) {
        this.publisher = {
          x: data.position.x,
          y: data.position.y,
          z: data.position.z,
          radius: data.radius ?? this.publisher.radius,
        };
      }
      this.emit("publisher", data);
    });

    this.client.onPacket(PacketId.UpdateBlock, (data) => {
      if (data.position && data.blockRuntimeId != null) {
        this.opts.world.setBlock(
          data.position.x,
          data.position.y,
          data.position.z,
          data.blockRuntimeId
        );
        this.emit("block_update", data);
      }
    });

    this.client.onPacket(PacketId.InventoryContent, (data) => {
      this.applyInventoryContent(data.windowId, data.items ?? []);
      this.emit("inventory", data);
    });

    this.client.onPacket(PacketId.InventorySlot, (data) => {
      this.applyInventorySlot(data.windowId, data.slot, data.item);
      this.emit("inventory_slot", data);
    });

    this.client.onPacket(PacketId.PlayerHotbar, (data) => {
      this.opts.inventory?.selectHotbar(data.selectedSlot ?? 0);
      this.emit("hotbar", data);
    });

    this.client.onPacket(PacketId.Text, (data) => {
      this.emit("chat", data);
    });

    this.client.onPacket(PacketId.Disconnect, (data) => {
      this.stopInputLoop();
      this.emit("disconnect", data.message ?? "disconnected");
    });

    this.client.onPacket(PacketId.SetHealth, (data) => {
      this.emit("health", data);
    });

    this.client.onPacket(PacketId.MovePlayer, (data) => {
      if (data.position && data.runtimeEntityId === this.runtimeEntityId) {
        this.position = { ...data.position };
      }
    });

    this.client.onPacket(PacketId.CorrectPlayerMovePrediction, (data) => {
      if (data.position) this.position = { ...data.position };
      this.emit("move_correction", data);
    });

    this.client.on("packet", (id, data) => {
      this.emit("packet", id, data);
    });
  }

  private applyInventoryContent(windowId: number, items: Array<NetworkItem | null>) {
    const inv = this.opts.inventory;
    if (!inv) return;
    if (windowId === ContainerId.Inventory || windowId === 0) {
      items.forEach((it, slot) => {
        if (!it) inv.setSlot(slot, null);
        else inv.setSlot(slot, { networkId: it.networkId, count: it.count, metadata: it.metadata, slot });
      });
    }
  }

  private applyInventorySlot(windowId: number, slot: number, item: NetworkItem | null) {
    const inv = this.opts.inventory;
    if (!inv) return;
    if (windowId === ContainerId.Inventory || windowId === 0) {
      inv.setSlot(slot, item ? { networkId: item.networkId, count: item.count, metadata: item.metadata, slot } : null);
    }
  }

  async startLogin(): Promise<void> {
    console.log(`[BDSSession] RequestNetworkSettings protocol=${ProtocolVersion}`);
    this.client.send(PacketId.RequestNetworkSettings, {
      clientNetworkVersion: ProtocolVersion,
    });

    setTimeout(() => {
      if (!this.compressionReady && !this.spawned) {
        console.log("[BDSSession] No NetworkSettings yet — offline simulated spawn path");
        this.emit("start_game", {
          gamemode: 0,
          dimension: 0,
          spawn: { x: 0.5, y: 65, z: 0.5 },
          time: 1000,
          runtimeEntityId: 1,
          entityId: 1,
        });
        this.position = { x: 0.5, y: 65, z: 0.5 };
        this.lastPosition = { ...this.position };
        this.onPlayerSpawnStatus();
      }
    }, 2500);
  }

  private requestColumnSubChunks(cx: number, cz: number, dimension = 0, highest?: number) {
    const key = `${dimension}:${cx}:${cz}`;
    if (this.requestedColumns.has(key)) return;
    this.requestedColumns.add(key);
    const maxIndex = typeof highest === "number" ? Math.min(19, highest) : 19;
    const req = buildColumnRequest(cx, cz, { dimension, minIndex: -4, maxIndex });
    this.client.send(PacketId.SubChunkRequest, req);
    this.pendingSubChunks.set(key, { cx, cz, dimension, highest, at: Date.now() });
    this.ensureSubChunkRetryLoop();
  }

  private ensureSubChunkRetryLoop() {
    if (this.subChunkRetryTimer) return;
    this.subChunkRetryTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.pendingSubChunks) {
        if (now - entry.at < 4000) continue;
        // One retry then drop
        console.log(`[BDSSession] SubChunk retry for column ${key}`);
        const maxIndex = typeof entry.highest === "number" ? Math.min(19, entry.highest) : 19;
        const req = buildColumnRequest(entry.cx, entry.cz, { dimension: entry.dimension, minIndex: -4, maxIndex });
        this.client.send(PacketId.SubChunkRequest, req);
        this.pendingSubChunks.delete(key);
      }
      if (this.pendingSubChunks.size === 0 && this.subChunkRetryTimer) {
        clearInterval(this.subChunkRetryTimer);
        this.subChunkRetryTimer = null;
      }
    }, 2000);
  }

  private sendLogin() {
    const auth = this.opts.auth as any;
    console.log(`[BDSSession] Login chain=${auth?.chain?.length ?? 0} user=${this.opts.username} offline=${this.opts.offline} hasKey=${!!auth?.keyPair?.privateKeyPem}`);
    this.client.send(PacketId.Login, {
      protocol: ProtocolVersion,
      username: this.opts.username,
      offline: this.opts.offline,
      chain: auth?.chain ?? [],
      uuid: auth?.uuid,
      xuid: auth?.xuid,
      privateKeyPem: auth?.keyPair?.privateKeyPem,
      identityPublicKey: auth?.keyPair?.x509,
      x509: auth?.keyPair?.x509,
      serverAddress: `${(this.opts as any).host ?? ""}:${(this.opts as any).port ?? ""}`,
      multiplayerToken: auth?.multiplayerToken ?? "",
          });
  }

  private onPlayerSpawnStatus() {
    if (this.spawned) return;
    this.spawned = true;
    this.client.send(PacketId.RequestChunkRadius, {
      chunkRadius: this.opts.viewDistance ?? 8,
    });
    this.client.send(PacketId.SetLocalPlayerAsInitialized, {
      runtimeEntityId: this.runtimeEntityId,
    });
    this.startInputLoop();
    this.emit("spawn");
  }

  private startInputLoop() {
    this.stopInputLoop();
    this.inputTimer = setInterval(() => this.sendAuthInput(), 50);
  }

  private stopInputLoop() {
    if (this.inputTimer) {
      clearInterval(this.inputTimer);
      this.inputTimer = null;
    }
  }

  private sendAuthInput() {
    this.tick++;
    const delta = {
      x: this.position.x - this.lastPosition.x,
      y: this.position.y - this.lastPosition.y,
      z: this.position.z - this.lastPosition.z,
    };
    this.client.send(PacketId.PlayerAuthInput, {
      pitch: this.pitch,
      yaw: this.yaw,
      headYaw: this.yaw,
      position: this.position,
      moveVecX: this.moveVecX,
      moveVecZ: this.moveVecZ,
      inputData: this.inputFlags,
      inputMode: InputMode.Mouse,
      playMode: PlayMode.Normal,
      interactionModel: InteractionModel.Classic,
      interactPitch: this.pitch,
      interactYaw: this.yaw,
      tick: this.tick,
      delta,
      analogueMoveX: this.moveVecX,
      analogueMoveZ: this.moveVecZ,
      rawMoveX: this.moveVecX,
      rawMoveZ: this.moveVecZ,
      cameraOrientation: {
        x: -Math.cos(this.pitch) * Math.sin(this.yaw),
        y: -Math.sin(this.pitch),
        z: Math.cos(this.pitch) * Math.cos(this.yaw),
      },
    });
    this.lastPosition = { ...this.position };
    this.prevControls = { ...this.controls };
  }

  setMovement(moveX: number, moveZ: number, flags: number | bigint = 0n) {
    this.moveVecX = moveX;
    this.moveVecZ = moveZ;
    this.inputFlags = typeof flags === "bigint" ? flags : BigInt(flags >>> 0);
  }

  setControls(controls: MovementControls) {
    this.controls = { ...controls };
    const vec = moveVectorFromControls(controls);
    this.moveVecX = vec.x;
    this.moveVecZ = vec.z;
    this.inputFlags = flagsFromControls(controls, this.prevControls);
  }

  setLook(yaw: number, pitch: number) {
    this.yaw = yaw;
    this.pitch = pitch;
  }

  setPosition(pos: Vec3) {
    this.position = { ...pos };
  }

  digStart(pos: Vec3, face = 1) {
    this.client.send(PacketId.PlayerAction, {
      runtimeEntityId: this.runtimeEntityId,
      action: 0,
      position: { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) },
      face,
    });
  }

  digAbort(pos: Vec3) {
    this.client.send(PacketId.PlayerAction, {
      runtimeEntityId: this.runtimeEntityId,
      action: 2,
      position: { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) },
      face: 0,
    });
  }

  digFinish(pos: Vec3, face = 1) {
    this.client.send(PacketId.PlayerAction, {
      runtimeEntityId: this.runtimeEntityId,
      action: 1,
      position: { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) },
      face,
    });
  }

  placeBlock(blockPos: Vec3, face = 1, heldNetworkId = 1) {
    const body = encodeInventoryTransaction({
      transactionType: InventoryTransactionType.UseItem,
      actions: [],
      actionType: 0,
      blockPos: {
        x: Math.floor(blockPos.x),
        y: Math.floor(blockPos.y),
        z: Math.floor(blockPos.z),
      },
      face,
      hotbarSlot: 0,
      itemInHand: { networkId: heldNetworkId, count: 1 },
      playerPos: this.position,
      clickPos: {
        x: blockPos.x + 0.5,
        y: blockPos.y + 0.5,
        z: blockPos.z + 0.5,
      },
    });
    this.client.sendRaw(encodeGamePacket(PacketId.InventoryTransaction, { raw: body }));
  }

  attackEntity(targetRuntimeId: number) {
    const pkt = buildAttackEntityPacket({
      entityRuntimeId: BigInt(targetRuntimeId),
      hotbarSlot: 0,
      playerPos: this.position,
    });
    this.client.sendRaw(encodeGamePacket(pkt.id, { raw: pkt.payload }));
    this.client.send(PacketId.Animate, {
      actionId: 1,
      runtimeEntityId: this.runtimeEntityId,
    });
  }

  /**
   * Activate / consume held item (food, potion, etc.) via InventoryTransaction UseItem (click air).
   */
  useItem(opts: {
    hotbarSlot?: number;
    itemInHand: ItemStack;
    releaseAfterMs?: number;
  }) {
    const slot = opts.hotbarSlot ?? 0;
    const pkt = buildUseItemPacket({
      hotbarSlot: slot,
      itemInHand: opts.itemInHand,
      playerPos: this.position,
    });
    this.client.sendRaw(encodeGamePacket(pkt.id, { raw: pkt.payload }));

    // Many consumables also need ReleaseItem after hold duration
    const releaseMs = opts.releaseAfterMs ?? 1600;
    if (releaseMs > 0) {
      setTimeout(() => {
        try {
          const rel = buildReleaseItemPacket({
            hotbarSlot: slot,
            itemInHand: opts.itemInHand,
            playerPos: this.position,
          });
          this.client.sendRaw(encodeGamePacket(rel.id, { raw: rel.payload }));
        } catch { /* session may be gone */ }
      }, releaseMs);
    }
  }

  /** Immediate release of charged / consuming item */
  releaseItem(itemInHand: ItemStack, hotbarSlot = 0) {
    const rel = buildReleaseItemPacket({
      hotbarSlot,
      itemInHand,
      playerPos: this.position,
    });
    this.client.sendRaw(encodeGamePacket(rel.id, { raw: rel.payload }));
  }

  chat(message: string) {
    this.client.send(PacketId.Text, {
      message,
      sourceName: this.opts.username,
    });
  }

  /** Send ItemStackRequest for live inventory ops */
  sendItemStackRequest(actions: Parameters<typeof encodeItemStackRequest>[0]["actions"]) {
    const pkt = encodeItemStackRequest({ actions });
    this.client.sendRaw(encodeGamePacket(pkt.id, { raw: pkt.payload }));
    return pkt.requestId;
  }

  transferSlots(fromContainer: number, fromSlot: number, toContainer: number, toSlot: number, count: number) {
    const pkt = buildTransferRequest(
      { containerId: fromContainer, slot: fromSlot },
      { containerId: toContainer, slot: toSlot },
      count
    );
    this.client.sendRaw(encodeGamePacket(pkt.id, { raw: pkt.payload }));
    return pkt.requestId;
  }

  /** Notify server of hotbar selection / held item */
  sendMobEquipment(hotbarSlot: number, item: { networkId: number; count: number }) {
    this.client.send(PacketId.MobEquipment, {
      runtimeEntityId: this.runtimeEntityId,
      item,
      slot: hotbarSlot,
      selectedSlot: hotbarSlot,
      windowId: 0,
    });
  }

  closeContainer(windowId: number) {
    this.client.send(PacketId.ContainerClose, { windowId, server: false });
  }

  dispose() {
    this.stopInputLoop();
    if (this.subChunkRetryTimer) {
      clearInterval(this.subChunkRetryTimer);
      this.subChunkRetryTimer = null;
    }
  }
}
