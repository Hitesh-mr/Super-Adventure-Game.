/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerStats, TileMapConfig, PlatformConfig } from '../types';

export class PhysicsEngine {
  // Global physics constants
  public static readonly GRAVITY = 0.45;
  public static readonly TERMINAL_VELOCITY = 12;
  public static readonly FRICTION_GROUND = 0.82;
  public static readonly FRICTION_ICE = 0.98; // Low friction
  public static readonly FRICTION_AIR = 0.96;
  public static readonly ACCELERATION = 0.45;
  public static readonly SPRINT_ACCELERATION = 0.7;
  public static readonly MAX_WALK_SPEED = 3.5;
  public static readonly MAX_RUN_SPEED = 5.5;
  public static readonly JUMP_FORCE = -8.2;
  public static readonly DOUBLE_JUMP_FORCE = -7.5;
  public static readonly WALL_JUMP_VX = 4.5;
  public static readonly WALL_JUMP_VY = -7.0;

  // Jump buffer & Coyote frames constants (tuned for feel)
  public static readonly COYOTE_MAX_FRAMES = 8;
  public static readonly JUMP_BUFFER_MAX_FRAMES = 6;

  // Input timing trackers
  public coyoteTimer: number = 0;
  public jumpBufferTimer: number = 0;

  // Track if player is on ground, sliding, on ladder, etc.
  public onGround: boolean = false;
  public onLadder: boolean = false;
  public wasOnGround: boolean = false;
  public onMovingPlatform: PlatformConfig | null = null;

  // Collision helper
  public static checkAABB(
    r1x: number, r1y: number, r1w: number, r1h: number,
    r2x: number, r2y: number, r2w: number, r2h: number
  ): boolean {
    return (
      r1x < r2x + r2w &&
      r1x + r1w > r2x &&
      r1y < r2y + r2h &&
      r1y + r1h > r2y
    );
  }

  public updateTimers() {
    if (this.coyoteTimer > 0) this.coyoteTimer--;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;
  }

  public handleTileCollisions(
    px: number,
    py: number,
    pw: number,
    ph: number,
    vx: number,
    vy: number,
    map: TileMapConfig,
    keys: { hasKey: boolean },
    onBrickHit?: (tx: number, ty: number, blockType: number) => void
  ): { x: number; y: number; vx: number; vy: number; hitLava: boolean; hitSpikes: boolean; onLadder: boolean; hitTrampoline: boolean } {
    const size = map.tileSize;
    let hitLava = false;
    let hitSpikes = false;
    let isLadder = false;
    let hitTrampoline = false;

    this.onGround = false;

    // Check broadphase tile bounds
    const startCol = Math.floor(Math.max(0, px - size) / size);
    const endCol = Math.ceil(Math.min(map.width * size, px + pw + size) / size);
    const startRow = Math.floor(Math.max(0, py - size) / size);
    const endRow = Math.ceil(Math.min(map.height * size, py + ph + size) / size);

    // 1. Resolve Y axis first to handle correct landing/ceilings
    let nextY = py + vy;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r < 0 || r >= map.height || c < 0 || c >= map.width) continue;
        const tile = map.grid[r][c];

        if (tile <= 0) continue;

        const tx = c * size;
        const ty = r * size;

        // Check if overlaps
        if (PhysicsEngine.checkAABB(px, nextY, pw, ph, tx, ty, size, size)) {
          // Spikes
          if (tile === 5) {
            hitSpikes = true;
            continue;
          }
          // Lava
          if (tile === 9) {
            hitLava = true;
            continue;
          }
          // Water (no hard collision, just buoyancy / slow down)
          if (tile === 10) {
            continue;
          }
          // Ladder
          if (tile === 11) {
            isLadder = true;
            continue;
          }

          // Locked door
          if (tile === 13 && keys.hasKey) {
            // Unlock! Remove block
            map.grid[r][c] = 0;
            if (onBrickHit) onBrickHit(c, r, 13);
            continue;
          }

          // Resolve collision for solid blocks (1, 2, 3, 4, 7, 8, 13)
          const isSolid = [1, 2, 3, 4, 6, 7, 8, 12, 13].includes(tile);
          if (isSolid) {
            // Check if it's a hidden block (tile === 6) and we were falling or moving sideways?
            // True hidden block is only solid from top or hit from bottom to reveal.
            if (tile === 6) {
              // Only solid if we were falling and player's bottom is above the tile's top
              if (vy > 0 && py + ph <= ty + 4) {
                // Landing on top
                nextY = ty - ph;
                vy = 0;
                this.onGround = true;
                this.coyoteTimer = PhysicsEngine.COYOTE_MAX_FRAMES;
              }
              continue;
            }

            if (tile === 12) {
              // Trampoline!
              if (vy > 0 && py + ph <= ty + 8) {
                nextY = ty - ph;
                vy = -10.5; // High jump bounce!
                hitTrampoline = true;
                this.onGround = true;
              }
              continue;
            }

            if (vy > 0) {
              // Landing
              nextY = ty - ph;
              vy = 0;
              this.onGround = true;
              this.coyoteTimer = PhysicsEngine.COYOTE_MAX_FRAMES;
            } else if (vy < 0) {
              // Hitting ceiling
              nextY = ty + size;
              vy = 0;

              // Breakable block (3) or Mystery block (4) hitting from below
              if (tile === 3 || tile === 4) {
                if (onBrickHit) {
                  onBrickHit(c, r, tile);
                }
              }
            }
          }
        }
      }
    }

    // 2. Resolve X axis
    let nextX = px + vx;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r < 0 || r >= map.height || c < 0 || c >= map.width) continue;
        const tile = map.grid[r][c];

        if (tile <= 0) continue;

        const tx = c * size;
        const ty = r * size;

        if (PhysicsEngine.checkAABB(nextX, nextY, pw, ph, tx, ty, size, size)) {
          if (tile === 5) hitSpikes = true;
          if (tile === 9) hitLava = true;
          if ([10, 11].includes(tile)) continue; // ignore water, ladders for X wall stop

          if (tile === 13 && keys.hasKey) {
            map.grid[r][c] = 0;
            if (onBrickHit) onBrickHit(c, r, 13);
            continue;
          }

          const isSolid = [1, 2, 3, 4, 7, 8, 13].includes(tile);
          if (isSolid) {
            if (vx > 0) {
              // Wall on right
              nextX = tx - pw;
              vx = 0;
            } else if (vx < 0) {
              // Wall on left
              nextX = tx + size;
              vx = 0;
            }
          }
        }
      }
    }

    return { x: nextX, y: nextY, vx, vy, hitLava, hitSpikes, onLadder: isLadder, hitTrampoline };
  }

  public handlePlatformCollisions(
    px: number,
    py: number,
    pw: number,
    ph: number,
    vx: number,
    vy: number,
    platforms: PlatformConfig[]
  ): { x: number; y: number; vx: number; vy: number; onPlatform: PlatformConfig | null } {
    let onPlatform: PlatformConfig | null = null;
    let nextY = py + vy;
    let nextX = px + vx;

    for (const plat of platforms) {
      // Platform collision box
      const pY = plat.y;
      const pX = plat.x;

      // standing on platform (only check if falling or moving down)
      if (vy >= 0 && py + ph <= pY + 6 && PhysicsEngine.checkAABB(nextX, nextY, pw, ph, pX, pY, plat.width, plat.height)) {
        nextY = pY - ph;
        vy = plat.vy; // match vertical speed
        nextX += plat.vx; // ride moving platform on X
        this.onGround = true;
        this.coyoteTimer = PhysicsEngine.COYOTE_MAX_FRAMES;
        onPlatform = plat;

        if (plat.type === 'bounce') {
          vy = -9.5; // Trampoline platform
          this.onGround = false;
        }
        break;
      }
    }

    return { x: nextX, y: nextY, vx, vy, onPlatform };
  }
}

export const physics = new PhysicsEngine();
export default physics;
