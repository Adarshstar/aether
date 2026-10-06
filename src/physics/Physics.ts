/**
 * Player physics – modern prismarine-physics inspired (Bedrock-tuned)
 * Fixed timestep, AABB support check via BlockRegistry
 */

import { Vec3 } from "../math/Vec3";
import { BlockRegistry } from "../registry/blocks";
import type { World } from "../world/World";

export interface PhysicsState {
  position: Vec3;
  velocity: Vec3;
  onGround: boolean;
  yaw: number;
  pitch: number;
}

export interface ControlState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  sneak: boolean;
}

export class PhysicsEngine {
  private world: World;
  readonly gravity = 0.08;
  readonly drag = 0.02;
  readonly airDrag = 0.01;
  readonly jumpVel = 0.42;
  readonly walkSpeed = 0.1;
  readonly sprintSpeed = 0.13;
  readonly sneakSpeed = 0.03;
  readonly stepHeight = 0.6;
  readonly playerWidth = 0.6;
  readonly playerHeight = 1.8;

  constructor(world: World) {
    this.world = world;
  }

  simulate(state: PhysicsState, controls: ControlState, dt = 0.05): PhysicsState {
    const pos = state.position.clone();
    const vel = state.velocity.clone();
    let onGround = state.onGround;

    // horizontal wish direction from yaw
    const speed = controls.sneak ? this.sneakSpeed : controls.sprint ? this.sprintSpeed : this.walkSpeed;
    let wx = 0, wz = 0;
    const sin = Math.sin(state.yaw);
    const cos = Math.cos(state.yaw);
    if (controls.forward) { wx -= sin; wz -= cos; }
    if (controls.back) { wx += sin; wz += cos; }
    if (controls.left) { wx += cos; wz -= sin; }
    if (controls.right) { wx -= cos; wz += sin; }
    const len = Math.hypot(wx, wz);
    if (len > 0) {
      wx = (wx / len) * speed * 2.5;
      wz = (wz / len) * speed * 2.5;
    }

    vel.x = wx;
    vel.z = wz;

    if (controls.jump && onGround) {
      vel.y = this.jumpVel;
      onGround = false;
    }

    // gravity
    if (!onGround) vel.y -= this.gravity;
    else if (vel.y < 0) vel.y = 0;

    // integrate with simple collision
    const next = pos.add(new Vec3(vel.x, vel.y, vel.z));

    // ground collision
    const feetY = Math.floor(next.y - 0.01);
    const bx = Math.floor(next.x);
    const bz = Math.floor(next.z);
    if (BlockRegistry.isSolid(this.world.getBlock(bx, feetY, bz)) && next.y <= feetY + 1) {
      next.y = feetY + 1;
      vel.y = 0;
      onGround = true;
    } else {
      onGround = false;
    }

    // ceiling
    const headY = Math.floor(next.y + this.playerHeight);
    if (BlockRegistry.isSolid(this.world.getBlock(bx, headY, bz)) && vel.y > 0) {
      vel.y = 0;
      next.y = headY - this.playerHeight;
    }

    // drag
    vel.x *= (1 - this.drag);
    vel.z *= (1 - this.drag);

    return { position: next, velocity: vel, onGround, yaw: state.yaw, pitch: state.pitch };
  }
}
