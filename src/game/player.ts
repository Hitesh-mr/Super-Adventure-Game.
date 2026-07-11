/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerStats, Projectile } from '../types';
import { PhysicsEngine } from './physics';
import { particles } from './particles';
import { audio } from './audio';

export class PlayerCharacter {
  public x: number = 0;
  public y: number = 0;
  public width: number = 20;
  public height: number = 32;
  public vx: number = 0;
  public vy: number = 0;

  // Active state trackers
  public state: 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'attack' | 'slide' | 'duck' | 'climb' | 'damage' | 'victory' | 'death' = 'idle';
  public direction: 1 | -1 = 1; // 1 = Right, -1 = Left
  public isAttacking: boolean = false;
  public attackCooldown: number = 0;
  public attackAnimTimer: number = 0;

  // Jump helpers
  public extraJumpsLeft: number = 1; // Double jump!
  public hasWallJumped: boolean = false;
  public wallTouchDirection: 1 | -1 | 0 = 0;

  // Render bobs
  private animationFrame: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public reset(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.state = 'idle';
    this.direction = 1;
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.attackAnimTimer = 0;
    this.height = 32; // Normal height
  }

  public update(
    stats: PlayerStats,
    keys: {
      left: boolean;
      right: boolean;
      jump: boolean;
      down: boolean;
      sprint: boolean;
      attack: boolean;
    },
    physics: PhysicsEngine,
    projectiles: Projectile[]
  ) {
    if (stats.isDead) {
      this.state = 'death';
      this.vy += PhysicsEngine.GRAVITY;
      this.y += this.vy;
      return;
    }

    // Tick timers
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer--;
      if (this.attackAnimTimer === 0) this.isAttacking = false;
    }

    // Handle Power-up decay
    Object.keys(stats.powerups).forEach(key => {
      const k = key as keyof typeof stats.powerups;
      if (stats.powerups[k] > 0) {
        stats.powerups[k]--;
        
        // Custom particles for some powerups
        if (stats.powerups[k] % 5 === 0) {
          if (k === 'speedBoost') {
            particles.emitDust(this.x + this.width / 2, this.y + this.height, 0, 0);
          } else if (k === 'invincibility') {
            particles.emitSparkle(this.x + Math.random() * this.width, this.y + Math.random() * this.height, '#ffd700', 1);
          } else if (k === 'shield') {
            particles.emitShieldRing(this.x + this.width / 2, this.y + this.height / 2, 16);
          }
        }
      }
    });

    this.animationFrame++;

    // 1. DETERMINE INPUTS & SPRINT SPEED modifiers
    const isSprinting = keys.sprint || stats.powerups.speedBoost > 0;
    const accel = isSprinting ? PhysicsEngine.SPRINT_ACCELERATION : PhysicsEngine.ACCELERATION;
    const maxSpeed = isSprinting ? PhysicsEngine.MAX_RUN_SPEED : PhysicsEngine.MAX_WALK_SPEED;

    // Adjust height for Ducking / Sliding
    const wantDuck = keys.down && physics.onGround;
    if (wantDuck) {
      if (this.height === 32) {
        // Shift position so player doesn't fall through ground
        this.y += 14;
        this.height = 18; // Duck size
      }

      if (Math.abs(this.vx) > 1.5) {
        this.state = 'slide';
        // Sliding slide friction (higher decay)
        this.vx *= 0.94;
        if (Math.random() > 0.4) {
          particles.emitDust(this.x + this.width / 2, this.y + this.height, -this.vx * 0.2);
        }
      } else {
        this.state = 'duck';
        this.vx *= 0.8; // Stop quickly
      }
    } else {
      // Restore normal height if clear
      if (this.height === 18) {
        // TODO: Check if ceiling block allows standing up! (In engine update)
        this.y -= 14;
        this.height = 32;
      }
    }

    // 2. HORIZONTAL MOVEMENT (Only if not fully locked in damage state)
    if (this.state !== 'damage') {
      if (!wantDuck) {
        if (keys.left) {
          this.vx -= accel;
          if (this.vx < -maxSpeed) this.vx = -maxSpeed;
          this.direction = -1;
          this.state = isSprinting ? 'run' : 'walk';

          // Emit footstep particles on ground
          if (physics.onGround && this.animationFrame % 12 === 0) {
            particles.emitDust(this.x + this.width, this.y + this.height, 1);
          }
        } else if (keys.right) {
          this.vx += accel;
          if (this.vx > maxSpeed) this.vx = maxSpeed;
          this.direction = 1;
          this.state = isSprinting ? 'run' : 'walk';

          // Emit footstep particles
          if (physics.onGround && this.animationFrame % 12 === 0) {
            particles.emitDust(this.x, this.y + this.height, -1);
          }
        } else {
          // Friction deceleration
          const friction = physics.onGround ? PhysicsEngine.FRICTION_GROUND : PhysicsEngine.FRICTION_AIR;
          this.vx *= friction;
          if (Math.abs(this.vx) < 0.15) {
            this.vx = 0;
            this.state = 'idle';
          }
        }
      }
    } else {
      // In damage state, lock controls briefly and decelerate
      this.vx *= 0.95;
    }

    // 3. JUMP HANDLING (Buffer and Coyote timers)
    if (keys.jump) {
      physics.jumpBufferTimer = PhysicsEngine.JUMP_BUFFER_MAX_FRAMES;
    }

    const canJump = physics.coyoteTimer > 0;

    if (physics.jumpBufferTimer > 0 && (canJump || this.extraJumpsLeft > 0 || stats.powerups.doubleJump > 0)) {
      // Reset jump buffer
      physics.jumpBufferTimer = 0;

      if (canJump) {
        // Primary jump
        this.vy = PhysicsEngine.JUMP_FORCE;
        physics.coyoteTimer = 0;
        audio.playSfx('jump');
        particles.emitDust(this.x + this.width / 2, this.y + this.height, 0, 1);
      } else if (stats.powerups.doubleJump > 0 || this.extraJumpsLeft > 0) {
        // Double jump!
        this.vy = PhysicsEngine.DOUBLE_JUMP_FORCE;
        if (stats.powerups.doubleJump <= 0) {
          this.extraJumpsLeft--;
        }
        audio.playSfx('jump');
        // Sparkle double jump cloud
        particles.emitSparkle(this.x + this.width / 2, this.y + this.height, '#00e5ff', 8);
      }
    }

    // Reset extra jumps when touching the ground
    if (physics.onGround) {
      this.extraJumpsLeft = 1;
      this.hasWallJumped = false;
    }

    // 4. VERTICAL VELOCITY INTEGRATION (GRAVITY)
    if (!physics.onGround) {
      this.vy += PhysicsEngine.GRAVITY;
      if (this.vy > PhysicsEngine.TERMINAL_VELOCITY) {
        this.vy = PhysicsEngine.TERMINAL_VELOCITY;
      }
      this.state = this.vy < 0 ? 'jump' : 'fall';
    }

    // 5. ATTACK TRIGGER (Sword Slash or Fire attack!)
    if (keys.attack && this.attackCooldown === 0 && !wantDuck) {
      this.isAttacking = true;
      this.attackAnimTimer = 15; // 15 frames animation
      this.attackCooldown = 30; // 30 frames cooldown

      if (stats.powerups.fireAttack > 0) {
        // Shoot fireball!
        audio.playSfx('laser');
        projectiles.push({
          x: this.x + (this.direction === 1 ? this.width : -8),
          y: this.y + this.height / 3,
          vx: this.direction * 6,
          vy: -0.5,
          width: 8,
          height: 8,
          type: 'fire',
          duration: 120,
          color: '#ff5500'
        });
        particles.emitFire(this.x + this.width / 2, this.y + this.height / 3, this.direction * 3, 0, 4);
      } else if (stats.powerups.iceAttack > 0) {
        // Shoot ice blast!
        audio.playSfx('laser');
        projectiles.push({
          x: this.x + (this.direction === 1 ? this.width : -8),
          y: this.y + this.height / 3,
          vx: this.direction * 5.5,
          vy: -0.5,
          width: 8,
          height: 8,
          type: 'ice',
          duration: 120,
          color: '#00e5ff'
        });
        particles.emitSparkle(this.x + (this.direction === 1 ? this.width : -8), this.y + this.height / 3, '#00e5ff', 4);
      } else {
        // Standard sword slash
        audio.playSfx('slash');
        particles.emitSparkle(this.x + (this.direction === 1 ? this.width + 5 : -15), this.y + this.height / 2, '#ffffff', 3);
      }
    }

    // Passive visual glow particles based on active skin
    if (this.animationFrame % 8 === 0 && this.state !== 'death') {
      const px = this.x + Math.random() * this.width;
      const py = this.y + Math.random() * this.height;
      if (stats.activeSkin === 'fire_knight') {
        particles.emitFire(px, py, (Math.random() - 0.5) * 0.5, -0.4, 1);
      } else if (stats.activeSkin === 'frost_ninja') {
        particles.emitSparkle(px, py, '#00e5ff', 1);
      } else if (stats.activeSkin === 'golden_hero') {
        particles.emitSparkle(px, py, '#ffea00', 1);
      } else if (stats.activeSkin === 'void_wanderer') {
        particles.emitSparkle(px, py, '#e040fb', 1);
      }
    }
  }

  // --- DRAWING THE HERO CHARACTER PROCEDURALLY ---
  public draw(ctx: CanvasRenderingContext2D, stats: PlayerStats, cameraX: number, cameraY: number) {
    ctx.save();
    const x = this.x - cameraX;
    const y = this.y - cameraY;

    // Handle damage flicker
    if (stats.invincibilityTimer > 0) {
      if (Math.floor(stats.invincibilityTimer / 4) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
    }

    // Direction flip
    ctx.translate(x + this.width / 2, y + this.height / 2);
    ctx.scale(this.direction, 1);

    const w = this.width;
    const h = this.height;

    // Draw active Shield bubble around player if active
    if (stats.powerups.shield > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(Date.now() * 0.01) * 0.15;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Render character body layers procedurally to mimic cute pixel art
    // Layer 1: Boots
    ctx.fillStyle = '#4e342e'; // dark brown
    const legWiggle = (this.state === 'walk' || this.state === 'run') ? Math.sin(Date.now() * 0.015) * 4 : 0;
    ctx.fillRect(-w / 2, h / 2 - 4, 6, 4 + Math.min(0, legWiggle));
    ctx.fillRect(w / 2 - 6, h / 2 - 4, 6, 4 - Math.min(0, legWiggle));

    // Layer 2: Cloak/Body
    // Different skins support!
    const cloakColor = stats.activeSkin === 'fire_knight' ? '#ff3d00' :
                       stats.activeSkin === 'frost_ninja' ? '#00e5ff' :
                       stats.activeSkin === 'golden_hero' ? '#ffea00' :
                       stats.activeSkin === 'void_wanderer' ? '#4a148c' : '#1565c0'; // default blue
    ctx.fillStyle = cloakColor;
    
    if (this.state === 'slide') {
      ctx.fillRect(-w / 2 - 4, -h / 2, w + 4, h);
    } else {
      ctx.fillRect(-w / 2, -h / 3, w, h * 0.7);
    }

    // Layer 3: Head / Knight Helmet (Customized per skin!)
    let helmColor = '#b0bec5'; // silver metal
    let visorColor = '#263238'; // black visor
    let featherColor = '#d50000'; // red feather

    if (stats.activeSkin === 'fire_knight') {
      helmColor = '#424242'; // charcoal metal
      visorColor = '#ff3d00'; // glowing orange-red
      featherColor = '#ffb300'; // burning gold
    } else if (stats.activeSkin === 'frost_ninja') {
      helmColor = '#006064'; // deep teal
      visorColor = '#00e5ff'; // glowing cyan
      featherColor = '#eceff1'; // white snow
    } else if (stats.activeSkin === 'golden_hero') {
      helmColor = '#ffd700'; // royal gold
      visorColor = '#1de9b6'; // emerald teal visor
      featherColor = '#ffffff'; // pristine white
    } else if (stats.activeSkin === 'void_wanderer') {
      helmColor = '#212121'; // void black obsidian
      visorColor = '#e040fb'; // glowing neon purple
      featherColor = '#311b92'; // deep violet
    }

    ctx.fillStyle = helmColor;
    const headBob = this.state === 'idle' ? Math.sin(Date.now() * 0.005) * 1 : 0;
    const faceY = -h / 2 + headBob;
    ctx.fillRect(-w / 2.2, faceY, w / 1.1, h * 0.3);

    // Helmet visor
    ctx.fillStyle = visorColor;
    ctx.fillRect(-w / 4, faceY + 3, w / 2, 4);

    // Helmet plume/crest (feather on top)
    ctx.fillStyle = featherColor;
    ctx.beginPath();
    ctx.moveTo(-2, faceY);
    ctx.lineTo(-6, faceY - 6);
    ctx.lineTo(2, faceY - 3);
    ctx.closePath();
    ctx.fill();

    // Layer 4: Hands / Weapons (Sword draw)
    if (this.isAttacking) {
      ctx.save();
      ctx.fillStyle = '#eceff1'; // silver steel sword
      ctx.translate(w / 4, 0);
      const attackSweep = (15 - this.attackAnimTimer) * 12; // rotate downward sweep
      ctx.rotate((Math.PI / 180) * (-30 + attackSweep));
      
      // Draw sword blade
      ctx.fillRect(0, -18, 4, 20); // blade
      ctx.fillStyle = '#ffb300'; // gold guard
      ctx.fillRect(-2, 0, 8, 3); // hilt
      ctx.restore();
    } else {
      // Idle/Running hand swinging
      ctx.fillStyle = '#b0bec5';
      const armSwing = (this.state === 'walk' || this.state === 'run') ? Math.sin(Date.now() * 0.015) * 5 : 0;
      ctx.fillRect(-w / 2 - 2, 0, 3, 6 + armSwing);
    }

    ctx.restore();
  }
}
export default PlayerCharacter;
