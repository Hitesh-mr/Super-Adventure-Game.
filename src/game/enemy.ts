/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EnemyConfig, TileMapConfig, Projectile } from '../types';
import { PhysicsEngine } from './physics';
import { particles } from './particles';
import { audio } from './audio';

export class EnemyAI {
  public static update(
    enemy: EnemyConfig,
    playerX: number,
    playerY: number,
    playerWidth: number,
    playerHeight: number,
    map: TileMapConfig,
    projectiles: Projectile[]
  ) {
    if (enemy.isDead) {
      enemy.deathTimer++;
      return;
    }

    const size = map.tileSize;

    // Proximity checking for Aggro
    const dx = playerX + playerWidth / 2 - (enemy.x + enemy.width / 2);
    const dy = playerY + playerHeight / 2 - (enemy.y + enemy.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // AI state change based on distance
    enemy.isAggro = distance < 180;

    switch (enemy.type) {
      case 'walker': {
        // Patrol back and forth
        enemy.vx = enemy.speed * enemy.direction;

        // Apply gravity
        enemy.vy += PhysicsEngine.GRAVITY;
        if (enemy.vy > PhysicsEngine.TERMINAL_VELOCITY) {
          enemy.vy = PhysicsEngine.TERMINAL_VELOCITY;
        }

        // Apply simple horizontal wall/ledge turning
        const nextX = enemy.x + enemy.vx;
        const colCheck = Math.floor((enemy.direction === 1 ? nextX + enemy.width : nextX) / size);
        const rowCheck = Math.floor((enemy.y + enemy.height + 4) / size);

        // Turn around on wall hit
        let hitWall = false;
        const sideRowStart = Math.floor(enemy.y / size);
        const sideRowEnd = Math.floor((enemy.y + enemy.height - 2) / size);

        for (let r = sideRowStart; r <= sideRowEnd; r++) {
          if (colCheck >= 0 && colCheck < map.width && r >= 0 && r < map.height) {
            if ([1, 2, 7, 8, 13].includes(map.grid[r][colCheck])) {
              hitWall = true;
            }
          }
        }

        // Turn around on ledge
        let isLedge = true;
        if (rowCheck >= 0 && rowCheck < map.height && colCheck >= 0 && colCheck < map.width) {
          if ([1, 2, 3, 4, 7, 8].includes(map.grid[rowCheck][colCheck])) {
            isLedge = false;
          }
        }

        if (hitWall || isLedge) {
          enemy.direction = enemy.direction === 1 ? -1 : 1;
          enemy.vx *= -1;
        }

        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        // Resolve Y ground collision
        const groundRow = Math.floor((enemy.y + enemy.height) / size);
        const leftCol = Math.floor(enemy.x / size);
        const rightCol = Math.floor((enemy.x + enemy.width) / size);

        if (groundRow >= 0 && groundRow < map.height) {
          if (
            [1, 2, 3, 4, 7, 8].includes(map.grid[groundRow][leftCol]) ||
            [1, 2, 3, 4, 7, 8].includes(map.grid[groundRow][rightCol])
          ) {
            enemy.y = groundRow * size - enemy.height;
            enemy.vy = 0;
          }
        }
        break;
      }

      case 'flyer': {
        // Flyer hovers in sine wave or chases player slightly
        if (enemy.isAggro) {
          // Chase slowly
          enemy.vx = (dx > 0 ? 1 : -1) * enemy.speed;
          enemy.vy = (dy > 0 ? 1 : -1) * enemy.speed * 0.8;
          enemy.direction = dx > 0 ? 1 : -1;
        } else {
          // Idle hover patrol
          enemy.vx = enemy.speed * enemy.direction;
          enemy.vy = Math.sin(Date.now() * 0.004) * 0.6;

          // Turn back at patrol boundary
          const distFromStart = Math.abs(enemy.x - enemy.startX);
          if (distFromStart > enemy.patrolRange) {
            enemy.direction = enemy.x > enemy.startX ? -1 : 1;
          }
        }

        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        break;
      }

      case 'jumper': {
        // Slime jumps on timer
        enemy.vy += PhysicsEngine.GRAVITY;
        if (enemy.vy > PhysicsEngine.TERMINAL_VELOCITY) {
          enemy.vy = PhysicsEngine.TERMINAL_VELOCITY;
        }

        // Apply simple floor collision
        const gRow = Math.floor((enemy.y + enemy.height) / size);
        const lCol = Math.floor(enemy.x / size);
        const rCol = Math.floor((enemy.x + enemy.width) / size);
        let onG = false;

        if (gRow >= 0 && gRow < map.height) {
          if (
            [1, 2, 3, 4, 7, 8].includes(map.grid[gRow][lCol]) ||
            [1, 2, 3, 4, 7, 8].includes(map.grid[gRow][rCol])
          ) {
            enemy.y = gRow * size - enemy.height;
            enemy.vy = 0;
            onG = true;
          }
        }

        // Horizontal movement only when jumping or patrolling
        if (onG) {
          enemy.vx = 0;
          if (!enemy.attackTimer) enemy.attackTimer = 0;
          enemy.attackTimer++;

          // Jump every 90 frames
          if (enemy.attackTimer > 90) {
            enemy.vy = -6.5; // Jump up
            enemy.vx = (dx > 0 ? 1 : -1) * 1.8; // jump towards player
            enemy.direction = dx > 0 ? 1 : -1;
            enemy.attackTimer = 0;
            particles.emitDust(enemy.x + enemy.width / 2, enemy.y + enemy.height);
          }
        } else {
          // Carry jump velocity
          enemy.x += enemy.vx;
        }

        enemy.y += enemy.vy;
        break;
      }

      case 'charger': {
        // Charges if player aligns vertically, otherwise patrols
        enemy.vy += PhysicsEngine.GRAVITY;
        const gRow = Math.floor((enemy.y + enemy.height) / size);
        const lCol = Math.floor(enemy.x / size);
        const rCol = Math.floor((enemy.x + enemy.width) / size);

        if (gRow >= 0 && gRow < map.height) {
          if (
            [1, 2, 3, 4, 7, 8].includes(map.grid[gRow][lCol]) ||
            [1, 2, 3, 4, 7, 8].includes(map.grid[gRow][rCol])
          ) {
            enemy.y = gRow * size - enemy.height;
            enemy.vy = 0;
          }
        }

        if (Math.abs(dy) < 40 && distance < 250) {
          // CHARGE! Speed increases
          enemy.state = 'chase';
          enemy.vx = (dx > 0 ? 1 : -1) * enemy.speed * 1.8;
          enemy.direction = dx > 0 ? 1 : -1;

          // Emit slide/dust trails
          if (Math.random() > 0.6) {
            particles.emitDust(enemy.x + enemy.width / 2, enemy.y + enemy.height, -enemy.vx * 0.3);
          }
        } else {
          // Slow patrol
          enemy.state = 'patrol';
          enemy.vx = enemy.speed * 0.6 * enemy.direction;

          // Patrol range turning
          if (Math.abs(enemy.x - enemy.startX) > enemy.patrolRange) {
            enemy.direction = enemy.x > enemy.startX ? -1 : 1;
          }
        }

        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        break;
      }

      case 'fire': {
        // Stationary fire shooter
        enemy.vy += PhysicsEngine.GRAVITY;
        const gRow = Math.floor((enemy.y + enemy.height) / size);
        const lCol = Math.floor(enemy.x / size);
        const rCol = Math.floor((enemy.x + enemy.width) / size);

        if (gRow >= 0 && gRow < map.height) {
          if (
            [1, 2, 3, 4, 7, 8].includes(map.grid[gRow][lCol]) ||
            [1, 2, 3, 4, 7, 8].includes(map.grid[gRow][rCol])
          ) {
            enemy.y = gRow * size - enemy.height;
            enemy.vy = 0;
          }
        }
        enemy.y += enemy.vy;

        // Turn to face player
        enemy.direction = dx > 0 ? 1 : -1;

        if (!enemy.attackTimer) enemy.attackTimer = 0;
        enemy.attackTimer++;

        // Shoots high arc fireball every 120 frames
        if (enemy.attackTimer > 120 && distance < 300) {
          enemy.attackTimer = 0;
          audio.playSfx('laser');

          // Shoot projectile
          projectiles.push({
            x: enemy.x + (enemy.direction === 1 ? enemy.width : 0),
            y: enemy.y + 4,
            vx: enemy.direction * 3.5,
            vy: -4.5, // arc upward
            width: 8,
            height: 8,
            type: 'enemy_fire',
            duration: 180,
            color: '#ff5500'
          });

          // Spark particles
          particles.emitFire(enemy.x + enemy.width / 2, enemy.y + 4, enemy.direction * 2, -2, 5);
        }
        break;
      }

      case 'ghost': {
        // Can float through blocks. Chases player slowly but stops if player is facing them
        const playerFacingLeft = dx > 0; // player is to the right, looking right?
        const enemyOnLeft = enemy.x < playerX;

        // Simple look detection
        const playerDirectionIsTowardsEnemy = (enemyOnLeft && !playerFacingLeft) || (!enemyOnLeft && playerFacingLeft);

        if (playerDirectionIsTowardsEnemy && distance < 200) {
          // Hide / Freeze!
          enemy.vx = 0;
          enemy.vy = 0;
          enemy.state = 'cooldown'; // Shy ghost!
        } else {
          // Float towards player
          enemy.state = 'chase';
          enemy.vx = (dx > 0 ? 1 : -1) * enemy.speed;
          enemy.vy = (dy > 0 ? 1 : -1) * enemy.speed;
          enemy.direction = dx > 0 ? 1 : -1;
        }

        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        break;
      }

      case 'boss': {
        // BOSS AI: Multi-phase!
        if (!enemy.phase) enemy.phase = 1;
        if (!enemy.attackTimer) enemy.attackTimer = 0;

        enemy.attackTimer++;
        enemy.direction = dx > 0 ? 1 : -1;

        // Apply basic gravity and boundary clamp
        enemy.vy += PhysicsEngine.GRAVITY * 0.8;
        enemy.y += enemy.vy;

        const bossGRow = Math.floor((enemy.y + enemy.height) / size);
        if (bossGRow >= 0 && bossGRow < map.height) {
          const checkColL = Math.floor(enemy.x / size);
          const checkColR = Math.floor((enemy.x + enemy.width) / size);
          if (
            [1, 2, 7, 8].includes(map.grid[bossGRow][checkColL]) ||
            [1, 2, 7, 8].includes(map.grid[bossGRow][checkColR])
          ) {
            enemy.y = bossGRow * size - enemy.height;
            enemy.vy = 0;
          }
        }

        // BOSS Phase updates depending on current health threshold
        const hpPercent = enemy.health / enemy.maxHealth;
        if (hpPercent < 0.35) {
          enemy.phase = 3;
          enemy.speed = 1.8;
        } else if (hpPercent < 0.7) {
          enemy.phase = 2;
          enemy.speed = 1.4;
        } else {
          enemy.phase = 1;
          enemy.speed = 1.0;
        }

        // AI Attacks based on Phases
        if (enemy.phase === 1) {
          // Heavy walking patrol & stomping jumps
          enemy.vx = enemy.direction * enemy.speed;
          enemy.x += enemy.vx;

          // Stomp every 160 frames
          if (enemy.attackTimer > 160) {
            enemy.vy = -7.5; // Jump up
            enemy.attackTimer = 0;
            audio.playSfx('jump');
          }

          // Spawn ground shockwaves upon landing
          if (enemy.vy === 0 && Math.random() > 0.96) {
            particles.triggerScreenShake(8);
            audio.playSfx('hit');
            // Emit fire spark blasts left & right
            particles.emitFire(enemy.x, enemy.y + enemy.height, -3, 0, 4);
            particles.emitFire(enemy.x + enemy.width, enemy.y + enemy.height, 3, 0, 4);
          }
        } else if (enemy.phase === 2) {
          // Circular fire shoot patterns and medium chases
          enemy.vx = enemy.direction * enemy.speed * 1.2;
          enemy.x += enemy.vx;

          if (enemy.attackTimer > 110) {
            enemy.attackTimer = 0;
            audio.playSfx('laser');

            // Shoot 6 projectiles in a radial fan
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 5) * i - Math.PI / 2;
              projectiles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: Math.cos(angle) * 3.0,
                vy: Math.sin(angle) * 3.0,
                width: 10,
                height: 10,
                type: 'boss_energy',
                duration: 160,
                color: '#ff2200'
              });
            }

            // Fire sparks
            particles.emitFire(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 0, 0, 10);
          }
        } else if (enemy.phase === 3) {
          // Fast chases, screen shakes, aggressive multi-laser barrages
          // Float hover towards player (ignores collision slightly)
          enemy.vx = enemy.direction * enemy.speed;
          enemy.vy = (dy > 0 ? 0.8 : -0.8) * enemy.speed;
          enemy.x += enemy.vx;

          if (enemy.attackTimer > 80) {
            enemy.attackTimer = 0;
            audio.playSfx('laser');

            // Shoot 3 targeted high-speed energy blasts towards player
            const targetAngle = Math.atan2(dy, dx);
            for (let offset = -0.2; offset <= 0.2; offset += 0.2) {
              const finalAngle = targetAngle + offset;
              projectiles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: Math.cos(finalAngle) * 4.5,
                vy: Math.sin(finalAngle) * 4.5,
                width: 12,
                height: 12,
                type: 'boss_energy',
                duration: 140,
                color: '#aa00ff' // Purple energy
              });
            }

            particles.emitSparkle(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#aa00ff', 8);
          }
        }
        break;
      }
    }
  }

  // --- DRAWING PROCEDURAL PIXEL-ART ENEMIES ---
  public static draw(ctx: CanvasRenderingContext2D, enemy: EnemyConfig, cameraX: number, cameraY: number) {
    if (enemy.isDead && enemy.deathTimer > 30) return;

    ctx.save();
    const x = enemy.x - cameraX;
    const y = enemy.y - cameraY;

    // Fade out dying enemies
    if (enemy.isDead) {
      ctx.globalAlpha = Math.max(0, 1 - enemy.deathTimer / 30);
      // Flash red
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(x, y, enemy.width, enemy.height);
      ctx.restore();
      return;
    }

    // Flash white/red if just hit or aggressive
    const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
    if (enemy.isAggro && enemy.type !== 'boss') {
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur = 8;
    }

    // Direction flip
    ctx.translate(x + enemy.width / 2, y + enemy.height / 2);
    ctx.scale(enemy.direction, 1);

    const w = enemy.width;
    const h = enemy.height;

    // Draw unique original pixel art styles procedurally
    switch (enemy.type) {
      case 'walker': {
        // Draw cute forest slime/mushroom hybrid
        // Base / stem
        ctx.fillStyle = '#fce4ec';
        ctx.fillRect(-w / 3, -h / 4, (w / 3) * 2, h / 2 + 2);

        // Cap (Shroom cap style)
        ctx.fillStyle = '#d81b60'; // hot pink
        ctx.beginPath();
        ctx.arc(0, -h / 6, w / 2, Math.PI, 0);
        ctx.fill();

        // Shroom spots
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w / 4, -h / 3, 3, 3);
        ctx.fillRect(w / 6, -h / 4, 3, 3);

        // Angry eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(-w / 4, 0, 2, 3);
        ctx.fillRect(w / 8, 0, 2, 3);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w / 3, -2);
        ctx.lineTo(-w / 6, 0);
        ctx.moveTo(w / 4, -2);
        ctx.lineTo(w / 12, 0);
        ctx.stroke();
        break;
      }

      case 'flyer': {
        // Draw spooky mechanical bat
        const wingFlap = Math.sin(Date.now() * 0.02) * (h / 2);

        // Body
        ctx.fillStyle = '#37474f'; // dark grey
        ctx.beginPath();
        ctx.arc(0, 0, w / 4, 0, Math.PI * 2);
        ctx.fill();

        // Glowing red eyes
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(-4, -2, 2, 2);
        ctx.fillRect(2, -2, 2, 2);

        // Wings
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.moveTo(-w / 4, 0);
        ctx.lineTo(-w / 1.5, wingFlap);
        ctx.lineTo(-w / 3, h / 4);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(w / 4, 0);
        ctx.lineTo(w / 1.5, wingFlap);
        ctx.lineTo(w / 3, h / 4);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'jumper': {
        // Draw bouncy slime monster
        const squash = Math.sin(Date.now() * 0.015) * 3;
        ctx.fillStyle = '#00e676'; // vibrant green

        ctx.beginPath();
        ctx.ellipse(0, squash / 2, w / 2, h / 2 - squash, 0, 0, Math.PI * 2);
        ctx.fill();

        // Slime face
        ctx.fillStyle = '#1b5e20';
        ctx.fillRect(-w / 4, -2, 3, 3);
        ctx.fillRect(w / 8, -2, 3, 3);
        ctx.fillRect(-w / 8, 2, w / 4, 2); // derpy smile
        break;
      }

      case 'charger': {
        // Draw charging horned boar / beetle
        ctx.fillStyle = '#b71c1c'; // crimson boar
        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Horns
        ctx.fillStyle = '#cfd8dc'; // silver horns
        ctx.beginPath();
        ctx.moveTo(w / 2, -h / 4);
        ctx.lineTo(w / 2 + 8, -h / 2);
        ctx.lineTo(w / 2, 0);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffeb3b'; // glowing yellow
        ctx.fillRect(w / 4, -h / 4, 3, 3);

        // Feet running animation
        const runCycle = Math.sin(Date.now() * 0.025) > 0;
        ctx.fillStyle = '#212121';
        ctx.fillRect(-w / 3, h / 2, 4, runCycle ? 3 : 1);
        ctx.fillRect(w / 4, h / 2, 4, runCycle ? 1 : 3);
        break;
      }

      case 'fire': {
        // Draw fire elemental lava blob
        ctx.fillStyle = '#ff3d00'; // red-orange
        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Inner glowing core
        ctx.fillStyle = '#ffea00'; // yellow
        ctx.fillRect(-w / 3, -h / 3, (w / 3) * 2, (h / 3) * 2);

        // Fire particle spikes
        const fireOffset = Math.sin(Date.now() * 0.03) * 4;
        ctx.fillStyle = '#ff9100';
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2);
        ctx.lineTo(0, -h / 2 - fireOffset);
        ctx.lineTo(w / 2, -h / 2);
        ctx.lineTo(w / 2 + fireOffset, 0);
        ctx.lineTo(w / 2, h / 2);
        ctx.lineTo(0, h / 2 + fireOffset);
        ctx.lineTo(-w / 2, h / 2);
        ctx.lineTo(-w / 2 - fireOffset, 0);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'ghost': {
        // Draw floating ghost (Boos)
        ctx.globalAlpha = enemy.state === 'cooldown' ? 0.4 : 0.8; // Translucent
        ctx.fillStyle = '#eceff1'; // white
        ctx.beginPath();
        ctx.arc(0, 0, w / 2, Math.PI, 0);
        ctx.lineTo(w / 2, h / 3);
        // ghost wiggly tails
        const wiggle = Math.sin(Date.now() * 0.01) * 3;
        ctx.lineTo(w / 3, h / 2 + wiggle);
        ctx.lineTo(0, h / 3);
        ctx.lineTo(-w / 3, h / 2 - wiggle);
        ctx.lineTo(-w / 2, h / 3);
        ctx.closePath();
        ctx.fill();

        // Shy face or spooky chase face
        ctx.fillStyle = '#263238';
        if (enemy.state === 'cooldown') {
          // shy closed eyes
          ctx.beginPath();
          ctx.moveTo(-w / 4, -2);
          ctx.lineTo(-w / 8, -2);
          ctx.moveTo(w / 8, -2);
          ctx.lineTo(w / 4, -2);
          ctx.stroke();
          // blushing red cheeks
          ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
          ctx.fillRect(-w / 3, 2, 4, 2);
          ctx.fillRect(w / 6, 2, 4, 2);
        } else {
          // angry chase eyes
          ctx.fillRect(-w / 4, -2, 3, 3);
          ctx.fillRect(w / 8, -2, 3, 3);
          // gaping open mouth
          ctx.fillStyle = '#d50000';
          ctx.fillRect(-w / 8, 2, w / 4, 4);
        }
        break;
      }

      case 'boss': {
        // DRAW THE GRAND ULTIMATE DEMONIC LICH BOSS!
        // Outer aura
        ctx.save();
        ctx.globalAlpha = 0.25 + pulse * 0.2;
        ctx.fillStyle = enemy.phase === 3 ? '#e040fb' : '#ff3d00';
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Body robe
        ctx.fillStyle = '#311b92'; // indigo cape
        ctx.fillRect(-w / 2.2, -h / 2.2, w / 1.1, h / 1.1);

        // Core skull face
        ctx.fillStyle = '#eceff1'; // bone white
        ctx.fillRect(-w / 3.5, -h / 3.5, (w / 3.5) * 2, h / 2);

        // Crown
        ctx.fillStyle = '#ffea00'; // gold crown
        ctx.beginPath();
        ctx.moveTo(-w / 3, -h / 3);
        ctx.lineTo(-w / 3, -h / 2);
        ctx.lineTo(-w / 6, -h / 2.5);
        ctx.lineTo(0, -h / 1.8);
        ctx.lineTo(w / 6, -h / 2.5);
        ctx.lineTo(w / 3, -h / 2);
        ctx.lineTo(w / 3, -h / 3);
        ctx.closePath();
        ctx.fill();

        // Spooky skull eyes
        ctx.fillStyle = enemy.phase === 3 ? '#00e5ff' : '#ff1744'; // Glowing blue or red eyes
        ctx.fillRect(-w / 6, -h / 6, 5, 5);
        ctx.fillRect(w / 12, -h / 6, 5, 5);

        // Ribs / robe details
        ctx.fillStyle = '#000000';
        ctx.fillRect(-w / 4, h / 6, w / 2, 2);
        ctx.fillRect(-w / 4, h / 4, w / 2, 2);
        break;
      }
    }

    ctx.restore();
  }
}
export default EnemyAI;
