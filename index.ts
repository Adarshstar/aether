export { AETHER_VERSION, AETHER_NAME, TARGET_BDS, TARGET_PROTOCOL, TARGET_TRANSPORT } from "./src/core/version";
export { Bot } from "./src/core/Bot";
export { createBot, createAetherBot } from "./src/core/createBot";
export type { BotOptions, Vec3, GameState, Plugin, Entity } from "./src/types";

export { Vec3 as Vec3Class } from "./src/math/Vec3";

export { World } from "./src/world/World";
export { Chunk } from "./src/world/Chunk";
export { Block } from "./src/block/Block";
export {
  decodeLevelChunkBody,
  encodeLevelChunkBody,
  decodeSubChunk,
  encodeSubChunk,
  applyLevelChunkToWorld,
  makeFlatChunk,
  decodePalettedStorage,
  encodePalettedStorage,
} from "./src/world/levelChunk";
export type { DecodedLevelChunk, DecodedSubChunk } from "./src/world/levelChunk";

export { Pathfinder } from "./src/pathfinding/Pathfinder";
export { PathFollower } from "./src/pathfinding/PathFollower";
export { MinHeap } from "./src/pathfinding/Heap";
export type { GoalInput } from "./src/pathfinding/Pathfinder";
export {
  Goal, GoalBlock, GoalNear, GoalXZ, GoalNearXZ, GoalY,
  GoalCompositeAny, GoalCompositeAll, GoalInvert, GoalFollow,
} from "./src/goals";

export { Item } from "./src/item/Item";
export { Window, WindowManager } from "./src/windows/Window";
export type { WindowType } from "./src/windows/Window";

export { BlockRegistry, EntityRegistry, ItemRegistry } from "./src/registry";
export type { BlockDef, EntityDef, EntityCategory, ItemDef } from "./src/registry";
export { BiomeRegistry } from "./src/biome/Biome";
export type { BiomeDef } from "./src/biome/Biome";
export { RecipeRegistry } from "./src/recipe/Recipe";
export type { Recipe } from "./src/recipe/Recipe";

export { PhysicsEngine } from "./src/physics/Physics";

export { NBT } from "./src/nbt/NBT";
export { chatToString, parseChatPacket } from "./src/chat/Chat";

export { EntityModel } from "./src/entity/EntityModel";

export { Agent } from "./src/ai/Agent";
export type { AgentAction, AgentObservation, PlannerFn } from "./src/ai/Agent";

export { Inventory } from "./src/inventory/Inventory";
export { Combat } from "./src/combat/Combat";

export { NetherNetTransport } from "./src/transport/nethernet";
export { XboxAuth } from "./src/auth/XboxAuth";
export type { AuthResult } from "./src/auth/XboxAuth";
export { PacketId, ProtocolVersion } from "./src/protocol/packets";

export { PvP } from "./src/pvp/PvP";
export { AutoEat } from "./src/autoeat/AutoEat";
export { CollectBlock } from "./src/collect/CollectBlock";
export { ToolManager } from "./src/tool/Tool";
export { StateMachine, BehaviorState } from "./src/statemachine/StateMachine";
export type { StateTransition } from "./src/statemachine/StateMachine";

export { loadDefaultPlugins, loggerPlugin } from "./src/plugins";

export { encodeGamePacket, decodeGamePacket, getRegisteredCodecIds } from "./src/protocol/codec";
export { buildOfflineChain, buildOnlineChain, generateBedrockKeyPair } from "./src/auth/JwtChain";

export { ProtocolClient } from "./src/protocol/ProtocolClient";
export { hasCodec, getCodecCoverage, encodeBatch, decodeBatch } from "./src/protocol/codec";

export { LLMClient } from "./src/ai/LLMClient";
export type { LLMMessage, LLMClientOptions, LLMResponse } from "./src/ai/LLMClient";
export { createLLMPlanner } from "./src/ai/LLMPlanner";
export type { LLMPlannerOptions } from "./src/ai/LLMPlanner";
export { createAIBot } from "./src/ai/AIBot";
export type { AIBotOptions, AIBot } from "./src/ai/AIBot";

export { BDSSession } from "./src/protocol/BDSSession";

export {
  InputFlag, encodeBitset, decodeBitset, flagsFromControls, moveVectorFromControls,
  PLAYER_AUTH_INPUT_BITS, InputMode, PlayMode, InteractionModel,
} from "./src/protocol/authInput";
export {
  wrapFragment, FragmentReassembler, compressBatch, decompressBatch,
  NETHERNET_RELIABLE_CHANNEL, NETHERNET_UNRELIABLE_CHANNEL, CompressionAlgorithm,
} from "./src/protocol/framing";
export { encodeNetworkItem, decodeNetworkItem, ContainerId } from "./src/protocol/itemStack";
export type { NetworkItem } from "./src/protocol/itemStack";
export { snappyCompress, snappyDecompress } from "./src/protocol/snappy";
export {
  encodeSubChunkRequest, decodeSubChunkRequest,
  encodeSubChunkPacket, decodeSubChunkPacket,
  buildColumnRequest, columnOffsets, applySubChunkPacketToWorld,
  SubChunkRequestMode, SubChunkResult, HeightMapType,
} from "./src/protocol/subchunk";
export type { SubChunkRequestBody, SubChunkBody, SubChunkEntry, SubChunkOffset } from "./src/protocol/subchunk";
export {
  parseSdpIdentity, injectSdpIdentity, signIdentityAssertion, applyIdentityToOffer, decodeIdentityJwt,
} from "./src/protocol/sdp";
export { createMockPeerConnection, MOCK_OFFER_SDP, MOCK_ANSWER_SDP } from "./src/transport/mockRtc";

export { Survival, createSurvival } from "./src/survival/Survival";
export type { SurvivalOptions } from "./src/survival/Survival";
export { createWeriftPeerConnectionFactory, hasNativeRTC, tryNativePeerConnection, WERIFT_SETUP_DOCS } from "./src/transport/webrtcHelper";
export type { PeerConnectionFactory } from "./src/transport/webrtcHelper";

export {
  encodeInventoryTransaction,
  buildAttackEntityPacket,
  buildUseItemPacket,
  buildReleaseItemPacket,
  InventoryTransactionType,
  UseItemAction,
} from "./src/protocol/inventory_tx";
export type { ItemStack, InventoryAction } from "./src/protocol/inventory_tx";

