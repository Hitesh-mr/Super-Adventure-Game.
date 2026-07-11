/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedGameState, PlayerStats, TileMapConfig, GameItem, Projectile, LocalStats, GameSettings } from '../types';
import { audio } from './audio';
import { particles } from './particles';
import { physics, PhysicsEngine } from './physics';
import { LevelManager } from './level';
import { PlayerCharacter } from './player';
import { EnemyAI } from './enemy';

export class GameEngine {
  public canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Active Game State
  public state: 'menu' | 'playing' | 'paused' | 'gameover' | 'levelcomplete' | 'victory' = 'menu';
  public currentLevelIndex: number = 0;
  public level: TileMapConfig | null = null;
  public player: PlayerCharacter | null = null;
  public items: GameItem[] = [];
  public projectiles: Projectile[] = [];

  // Saved Data
  public maxUnlockedLevel: number = 1;
  public totalScore: number = 0;
  public totalCoins: number = 0;
  public settings: GameSettings = {
    musicVolume: 0.5,
    sfxVolume: 0.6,
    graphicsQuality: 'high',
    fullscreen: false,
    crtFilter: true,
    controls: {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      jump: 'Space',
      down: 'ArrowDown',
      sprint: 'ShiftLeft',
      attack: 'KeyX'
    }
  };
  public localStats: LocalStats = {
    highScore: 0,
    totalCoinsCollected: 0,
    totalEnemiesDefeated: 0,
    totalJumps: 0,
    totalDeaths: 0,
    speedrunTimes: {}
  };
  public unlockedSkins: string[] = ['default'];
  public activeSkin: string = 'default';

  public playerStats: PlayerStats = {
    score: 0,
    coins: 0,
    gems: 0,
    stars: 0,
    lives: 3,
    health: 5,
    maxHealth: 5,
    energy: 100,
    maxEnergy: 100,
    checkpointX: null,
    checkpointY: null,
    currentLevel: 1,
    isDead: false,
    isInvincible: false,
    invincibilityTimer: 0,
    powerups: {
      speedBoost: 0,
      doubleJump: 0,
      shield: 0,
      magnet: 0,
      fireAttack: 0,
      iceAttack: 0,
      invincibility: 0
    },
    unlockedSkins: ['default'],
    activeSkin: 'default'
  };

  // Viewport camera smooth-follow
  public cameraX: number = 0;
  public cameraY: number = 0;
  public targetCameraX: number = 0;
  public targetCameraY: number = 0;

  // Timers and counters
  public levelTime: number = 0; // Speedrun timer in ms
  private lastTime: number = 0;
  private animationFrameId: number | null = null;

  // React state link listeners
  private onStateChangeListeners: ((state: string) => void)[] = [];
  private onStatsUpdateListeners: ((stats: PlayerStats, levelIndex: number, speedrunTime: number) => void)[] = [];

  // Keyboard controls map
  public keysPressed: Record<string, boolean> = {
    left: false,
    right: false,
    jump: false,
    down: false,
    sprint: false,
    attack: false
  };

  constructor() {
    this.loadGame();
    this.initKeyboardListeners();
  }

  public registerStateListener(cb: (state: string) => void) {
    this.onStateChangeListeners.push(cb);
  }

  public registerStatsListener(cb: (stats: PlayerStats, levelIndex: number, speedrunTime: number) => void) {
    this.onStatsUpdateListeners.push(cb);
  }

  private notifyStateChange() {
    this.onStateChangeListeners.forEach(listener => listener(this.state));
  }

  private notifyStats() {
    this.onStatsUpdateListeners.forEach(listener =>
      listener({ ...this.playerStats }, this.currentLevelIndex, Math.floor(this.levelTime / 1000))
    );
  }

  // --- LOCALSTORAGE SAVE ENGINE ---
  private computeSaveHash(fields: { unlockedLevels: number; currentLevel: number; coins: number; highScore: number; localHighScore: number }): string {
    const salt = 'super_pixel_valiant_knight_secret_salt_2026';
    const stringToHash = `${fields.unlockedLevels}-${fields.currentLevel}-${fields.coins}-${fields.highScore}-${fields.localHighScore}-${salt}`;
    let hash = 0;
    for (let i = 0; i < stringToHash.length; i++) {
      const char = stringToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  public saveGame() {
    const signature = this.computeSaveHash({
      unlockedLevels: this.maxUnlockedLevel,
      currentLevel: this.currentLevelIndex + 1,
      coins: this.totalCoins,
      highScore: this.localStats.highScore,
      localHighScore: this.localStats.highScore
    });

    const data = {
      unlockedLevels: this.maxUnlockedLevel,
      currentLevel: this.currentLevelIndex + 1,
      coins: this.totalCoins,
      highScore: this.localStats.highScore,
      achievements: [],
      localStats: this.localStats,
      settings: this.settings,
      unlockedSkins: this.unlockedSkins,
      activeSkin: this.activeSkin,
      signature
    };
    localStorage.setItem('super_pixel_adventure_save', JSON.stringify(data));
  }

  public loadGame() {
    const raw = localStorage.getItem('super_pixel_adventure_save');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return;

        // 1. Validate core numeric fields and enforce limits/boundaries
        const validatedUnlockedLevels = Math.max(1, Math.min(10, parseInt(data.unlockedLevels) || 1));
        const validatedCurrentLevel = Math.max(1, Math.min(10, parseInt(data.currentLevel) || 1));
        const validatedCoins = Math.max(0, Math.min(1000000, parseInt(data.coins) || 0));
        const validatedHighScore = Math.max(0, Math.min(9999999, parseInt(data.highScore) || 0));

        // 2. Validate localStats properties
        const validatedLocalStats: LocalStats = {
          highScore: Math.max(0, Math.min(9999999, parseInt(data.localStats?.highScore) || validatedHighScore)),
          totalCoinsCollected: Math.max(0, Math.min(1000000, parseInt(data.localStats?.totalCoinsCollected) || 0)),
          totalEnemiesDefeated: Math.max(0, Math.min(100000, parseInt(data.localStats?.totalEnemiesDefeated) || 0)),
          totalJumps: Math.max(0, Math.min(1000000, parseInt(data.localStats?.totalJumps) || 0)),
          totalDeaths: Math.max(0, Math.min(10000, parseInt(data.localStats?.totalDeaths) || 0)),
          speedrunTimes: {}
        };

        if (data.localStats?.speedrunTimes && typeof data.localStats.speedrunTimes === 'object') {
          Object.entries(data.localStats.speedrunTimes).forEach(([lvl, seconds]) => {
            const lvlIdx = parseInt(lvl);
            const secs = parseFloat(seconds as any);
            if (!isNaN(lvlIdx) && lvlIdx >= 0 && lvlIdx < 10 && !isNaN(secs) && secs >= 0 && secs < 36000) {
              validatedLocalStats.speedrunTimes[lvlIdx] = secs;
            }
          });
        }

        // 3. Validate settings volumes, qualities, and controls
        const validatedSettings: GameSettings = {
          musicVolume: Math.max(0, Math.min(1, typeof data.settings?.musicVolume === 'number' ? data.settings.musicVolume : 0.5)),
          sfxVolume: Math.max(0, Math.min(1, typeof data.settings?.sfxVolume === 'number' ? data.settings.sfxVolume : 0.6)),
          graphicsQuality: (data.settings?.graphicsQuality === 'low' || data.settings?.graphicsQuality === 'medium' || data.settings?.graphicsQuality === 'high') ? data.settings.graphicsQuality : 'high',
          fullscreen: !!data.settings?.fullscreen,
          crtFilter: data.settings?.crtFilter !== undefined ? !!data.settings.crtFilter : true,
          controls: {
            left: typeof data.settings?.controls?.left === 'string' ? data.settings.controls.left.substring(0, 50) : 'ArrowLeft',
            right: typeof data.settings?.controls?.right === 'string' ? data.settings.controls.right.substring(0, 50) : 'ArrowRight',
            jump: typeof data.settings?.controls?.jump === 'string' ? data.settings.controls.jump.substring(0, 50) : 'Space',
            down: typeof data.settings?.controls?.down === 'string' ? data.settings.controls.down.substring(0, 50) : 'ArrowDown',
            sprint: typeof data.settings?.controls?.sprint === 'string' ? data.settings.controls.sprint.substring(0, 50) : 'ShiftLeft',
            attack: typeof data.settings?.controls?.attack === 'string' ? data.settings.controls.attack.substring(0, 50) : 'KeyX',
          }
        };

        // 4. Validate unlocked skins and active skin values
        const allowedSkins = ['default', 'frost_ninja', 'fire_knight', 'golden_hero', 'void_wanderer'];
        let validatedUnlockedSkins = ['default'];
        if (Array.isArray(data.unlockedSkins)) {
          validatedUnlockedSkins = data.unlockedSkins.filter((s: any) => typeof s === 'string' && allowedSkins.includes(s));
          if (!validatedUnlockedSkins.includes('default')) {
            validatedUnlockedSkins.unshift('default');
          }
        }

        const validatedActiveSkin = (typeof data.activeSkin === 'string' && allowedSkins.includes(data.activeSkin)) ? data.activeSkin : 'default';

        // 5. Verify integrity checksum signature
        const expectedSignature = this.computeSaveHash({
          unlockedLevels: validatedUnlockedLevels,
          currentLevel: validatedCurrentLevel,
          coins: validatedCoins,
          highScore: validatedLocalStats.highScore,
          localHighScore: validatedLocalStats.highScore
        });

        if (data.signature && data.signature !== expectedSignature) {
          console.warn('⚠️ SAVE FILE SIGNATURE TAMPER DETECTED! Sanitzed profile loaded under security alert.');
          // Prevent memory exploits or absurd high scores by capping value safely on mismatch
          validatedLocalStats.highScore = Math.min(validatedLocalStats.highScore, 500000);
        }

        // Apply clean and sanitized state values
        this.maxUnlockedLevel = validatedUnlockedLevels;
        this.currentLevelIndex = validatedCurrentLevel - 1;
        this.totalCoins = validatedCoins;
        this.localStats = validatedLocalStats;
        this.settings = validatedSettings;
        this.unlockedSkins = validatedUnlockedSkins;
        this.activeSkin = validatedActiveSkin;

        if (this.totalCoins >= 300 && !this.unlockedSkins.includes('void_wanderer')) {
          this.unlockedSkins.push('void_wanderer');
        }
        this.playerStats.activeSkin = this.activeSkin;
        this.playerStats.unlockedSkins = this.unlockedSkins;
      } catch (e) {
        console.error('Failed to parse and sanitize save game data', e);
      }
    }
  }

  public resetProgress() {
    localStorage.removeItem('super_pixel_adventure_save');
    this.maxUnlockedLevel = 1;
    this.currentLevelIndex = 0;
    this.totalCoins = 0;
    this.localStats = {
      highScore: 0,
      totalCoinsCollected: 0,
      totalEnemiesDefeated: 0,
      totalJumps: 0,
      totalDeaths: 0,
      speedrunTimes: {}
    };
    this.unlockedSkins = ['default'];
    this.activeSkin = 'default';
    this.saveGame();
    this.changeState('menu');
  }

  // --- GAME START & INITIALIZATION ---
  public attachCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
  }

  public startLevel(levelIndex: number) {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.currentLevelIndex = Math.max(0, Math.min(9, levelIndex));
    this.level = LevelManager.getLevel(this.currentLevelIndex);
    this.player = new PlayerCharacter(this.level.startX, this.level.startY);
    this.projectiles = [];
    particles.clearAll();

    // Setup player stats
    this.playerStats.currentLevel = this.currentLevelIndex + 1;
    this.playerStats.isDead = false;
    this.playerStats.health = this.playerStats.maxHealth;
    this.playerStats.checkpointX = null;
    this.playerStats.checkpointY = null;
    this.playerStats.coins = 0;
    this.playerStats.gems = 0;
    this.playerStats.stars = 0;

    // Reset temporary active powerups
    Object.keys(this.playerStats.powerups).forEach(key => {
      this.playerStats.powerups[key as keyof typeof this.playerStats.powerups] = 0;
    });

    // Spawn collectibles procedurally based on platforms & grids
    this.generateCollectibles();

    // Trigger theme music
    let track = 'forest';
    if (this.level.theme === 'cave' || this.level.theme === 'underground') track = 'cave';
    else if (this.level.theme === 'castle') track = 'castle';
    else if (this.level.theme === 'lava') track = 'castle';
    else if (this.level.theme === 'finalboss') track = 'boss';
    audio.playMusic(track);

    this.levelTime = 0;
    this.lastTime = performance.now();
    this.changeState('playing');
    this.gameLoop();
  }

  private generateCollectibles() {
    if (!this.level) return;
    this.items = [];

    const size = LevelManager.TILE_SIZE;

    // 1. Scan the level grid to place coins, gems, hearts, or powerups logically
    for (let r = 0; r < this.level.height; r++) {
      for (let c = 0; c < this.level.width; c++) {
        const tile = this.level.grid[r][c];

        // If it is a mystery block (4) or breakable block (3), we don't put items floating there,
        // but we spawn floating coins above normal ground tiles
        if (tile === 2) { // Grass top
          // 40% chance of floating coin above
          if (Math.random() > 0.7 && r > 2 && this.level.grid[r - 2][c] === 0) {
            this.items.push({
              id: `item_${r}_${c}`,
              x: c * size + 8,
              y: (r - 2) * size + 8,
              width: 16,
              height: 16,
              type: 'coin',
              collected: false,
              bobTimer: Math.random() * 100,
              pulseTimer: 0
            });
          }
        }

        // Spawn keys inside levels if doors exist
        if (tile === 13) { // Locked door
          // Put a key somewhere on an upper floating block or platform
          // Let's place it at x = (door position - 15)
          const targetCol = Math.max(5, c - 20);
          this.items.push({
            id: `item_key_${r}_${c}`,
            x: targetCol * size + 8,
            y: 8 * size + 8,
            width: 16,
            height: 16,
            type: 'key',
            collected: false,
            bobTimer: 0,
            pulseTimer: 0
          });
        }
      }
    }

    // 2. Put special power crystals and extra lives on platforms
    this.level.platforms.forEach((plat, idx) => {
      this.items.push({
        id: `item_plat_${idx}`,
        x: plat.startX + plat.width / 2 - 8,
        y: plat.startY - 24,
        width: 16,
        height: 16,
        type: Math.random() > 0.7 ? 'gem_blue' : 'star',
        collected: false,
        bobTimer: Math.random() * 100,
        pulseTimer: 0
      });
    });

    // 3. Floating Power-ups inside Sky and Final Levels
    if (this.level.theme === 'sky' || this.level.theme === 'castle' || this.level.theme === 'finalboss') {
      this.items.push({
        id: 'power_shield_sky',
        x: 15 * size,
        y: 6 * size,
        width: 20,
        height: 20,
        type: 'power_shield',
        collected: false,
        bobTimer: 0,
        pulseTimer: 0
      });

      this.items.push({
        id: 'power_jump_sky',
        x: 45 * size,
        y: 3 * size,
        width: 20,
        height: 20,
        type: 'power_jump',
        collected: false,
        bobTimer: 50,
        pulseTimer: 0
      });
    }

    // Add extra lives
    this.items.push({
      id: 'extra_life_heart',
      x: 75 * size,
      y: 8 * size,
      width: 16,
      height: 16,
      type: 'extra_life',
      collected: false,
      bobTimer: 0,
      pulseTimer: 0
    });
  }

  // --- KEYBOARD CONTROLS LISTENERS ---
  private initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'Space', ' '].includes(e.key)) {
        e.preventDefault(); // Stop scrolling
      }

      const map = this.settings.controls;
      if (e.code === map.left || e.key === 'ArrowLeft') this.keysPressed.left = true;
      if (e.code === map.right || e.key === 'ArrowRight') this.keysPressed.right = true;
      if (e.code === map.jump || e.key === ' ' || e.code === 'Space') this.keysPressed.jump = true;
      if (e.code === map.down || e.key === 'ArrowDown') this.keysPressed.down = true;
      if (e.code === map.sprint || e.key === 'Shift') this.keysPressed.sprint = true;
      if (e.code === map.attack || e.key === 'x' || e.key === 'X') this.keysPressed.attack = true;
    });

    window.addEventListener('keyup', (e) => {
      const map = this.settings.controls;
      if (e.code === map.left || e.key === 'ArrowLeft') this.keysPressed.left = false;
      if (e.code === map.right || e.key === 'ArrowRight') this.keysPressed.right = false;
      if (e.code === map.jump || e.key === ' ' || e.code === 'Space') this.keysPressed.jump = false;
      if (e.code === map.down || e.key === 'ArrowDown') this.keysPressed.down = false;
      if (e.code === map.sprint || e.key === 'Shift') this.keysPressed.sprint = false;
      if (e.code === map.attack || e.key === 'x' || e.key === 'X') this.keysPressed.attack = false;
    });
  }

  // --- THE RUNTIME CORE UPDATE ---
  public gameLoop() {
    if (this.state !== 'playing') return;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const now = performance.now();
    let dt = now - this.lastTime;
    this.lastTime = now;

    // Guard against massive frame skips (e.g. background tab)
    if (dt > 100) dt = 16.66;

    this.levelTime += dt;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    if (!this.level || !this.player) return;

    physics.updateTimers();

    // 1. Update active player character
    const playerKeys = {
      left: this.keysPressed.left,
      right: this.keysPressed.right,
      jump: this.keysPressed.jump,
      down: this.keysPressed.down,
      sprint: this.keysPressed.sprint,
      attack: this.keysPressed.attack
    };

    this.player.update(this.playerStats, playerKeys, physics, this.projectiles);

    // Decollect Key tracker
    const hasKey = this.items.some(item => item.type === 'key' && item.collected);

    // 2. Perform tile collision resolving
    const colResult = physics.handleTileCollisions(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
      this.player.vx,
      this.player.vy,
      this.level,
      { hasKey },
      (tx, ty, blockType) => {
        // Hitting block from below
        if (blockType === 3) {
          // Break block! Set grid to 0
          if (this.level) this.level.grid[ty][tx] = 0;
          audio.playSfx('explosion');
          particles.triggerScreenShake(3);
          // Emit debris particle
          particles.emitSmoke(tx * 32 + 16, ty * 32 + 16, 5);
          this.playerStats.score += 50;
        } else if (blockType === 4) {
          // Mystery block. Spawn coin
          if (this.level) this.level.grid[ty][tx] = 6; // solid empty block now
          audio.playSfx('coin');
          this.playerStats.coins++;
          this.playerStats.score += 100;
          particles.emitSparkle(tx * 32 + 16, ty * 32, '#ffd700', 6);

          // 20% spawn random power-up instead of a coin
          if (Math.random() > 0.8) {
            const powerupsList: Array<GameItem['type']> = ['power_speed', 'power_jump', 'power_shield', 'power_magnet', 'power_fire'];
            const randPower = powerupsList[Math.floor(Math.random() * powerupsList.length)];
            this.items.push({
              id: `mystery_spawn_${tx}_${ty}`,
              x: tx * 32 + 8,
              y: (ty - 1) * 32 + 8,
              width: 16,
              height: 16,
              type: randPower,
              collected: false,
              bobTimer: 0,
              pulseTimer: 0
            });
          }
        }
      }
    );

    // Write back collision outcomes
    this.player.x = colResult.x;
    this.player.y = colResult.y;
    this.player.vx = colResult.vx;
    this.player.vy = colResult.vy;

    // Check deadly hazards (lava/spikes)
    if (colResult.hitLava || colResult.hitSpikes) {
      this.handlePlayerDamage(1);
    }

    // 3. Platform integrations
    const platResult = physics.handlePlatformCollisions(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
      this.player.vx,
      this.player.vy,
      this.level.platforms
    );
    this.player.x = platResult.x;
    this.player.y = platResult.y;
    this.player.vx = platResult.vx;
    this.player.vy = platResult.vy;

    // 4. Fall below map limits = instant death
    if (this.player.y > this.level.height * 32 + 60) {
      this.handlePlayerDamage(5); // Instant kill
    }

    // 5. Update items collectibility & magnets
    this.items.forEach(item => {
      if (item.collected) return;

      item.bobTimer += 0.05;

      // Magnet power-up logic: pulls coins and gems towards player
      if (this.playerStats.powerups.magnet > 0 && (item.type === 'coin' || item.type.startsWith('gem'))) {
        const dx = this.player!.x + this.player!.width / 2 - item.x;
        const dy = this.player!.y + this.player!.height / 2 - item.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          // pull
          const force = 3.5;
          item.x += (dx / dist) * force;
          item.y += (dy / dist) * force;
        }
      }

      // Check collision
      if (
        PhysicsEngine.checkAABB(
          this.player!.x, this.player!.y, this.player!.width, this.player!.height,
          item.x, item.y, item.width, item.height
        )
      ) {
        item.collected = true;

        if (item.type === 'coin') {
          this.playerStats.coins++;
          this.playerStats.score += 10;
          this.totalCoins++;
          this.localStats.totalCoinsCollected++;
          if (this.totalCoins >= 300) {
            this.unlockSkin('void_wanderer');
          }
          audio.playSfx('coin');
          particles.emitSparkle(item.x + 8, item.y + 8, '#ffeb3b', 4);
        } else if (item.type === 'key') {
          audio.playSfx('powerup');
          particles.emitSparkle(item.x + 8, item.y + 8, '#eceff1', 6);
        } else if (item.type === 'gem_blue' || item.type === 'gem_green') {
          this.playerStats.gems++;
          this.playerStats.score += 500;
          audio.playSfx('powerup');
          particles.emitSparkle(item.x + 8, item.y + 8, '#00e5ff', 8);
        } else if (item.type === 'star') {
          this.playerStats.stars++;
          this.playerStats.score += 1000;
          audio.playSfx('powerup');
          particles.emitSparkle(item.x + 8, item.y + 8, '#ffff00', 10);
        } else if (item.type === 'extra_life') {
          this.playerStats.lives++;
          audio.playSfx('powerup');
          particles.emitSparkle(item.x + 8, item.y + 8, '#ff3366', 10);
        } else if (item.type.startsWith('power_')) {
          audio.playSfx('powerup');
          particles.emitSparkle(item.x + 8, item.y + 8, '#ffd700', 12);
          
          if (item.type === 'power_speed') {
            this.playerStats.powerups.speedBoost = 480; // 8 seconds
          } else if (item.type === 'power_jump') {
            this.playerStats.powerups.doubleJump = 480;
          } else if (item.type === 'power_shield') {
            this.playerStats.powerups.shield = 480;
          } else if (item.type === 'power_magnet') {
            this.playerStats.powerups.magnet = 480;
          } else if (item.type === 'power_fire') {
            this.playerStats.powerups.fireAttack = 480;
          }
        }
      }
    });

    // 6. Update moving platforms
    this.level.platforms.forEach(plat => {
      if (plat.type === 'horizontal') {
        plat.vx = plat.speed;
        plat.x += plat.vx;
        if (Math.abs(plat.x - plat.startX) > plat.rangeX) {
          plat.speed *= -1;
        }
      } else if (plat.type === 'vertical') {
        plat.vy = plat.speed;
        plat.y += plat.vy;
        if (Math.abs(plat.y - plat.startY) > plat.rangeY) {
          plat.speed *= -1;
        }
      }
    });

    // 7. Update active projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.duration--;
      proj.x += proj.vx;
      proj.y += proj.vy;

      if (proj.duration <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check hits against solid blocks
      const colCol = Math.floor(proj.x / 32);
      const colRow = Math.floor(proj.y / 32);
      if (colCol >= 0 && colCol < this.level.width && colRow >= 0 && colRow < this.level.height) {
        if ([1, 2, 7, 8].includes(this.level.grid[colRow][colCol])) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // If it is an enemy projectile, check hit against player
      if (proj.type === 'enemy_fire' || proj.type === 'boss_energy') {
        if (
          PhysicsEngine.checkAABB(
            this.player.x, this.player.y, this.player.width, this.player.height,
            proj.x, proj.y, proj.width, proj.height
          )
        ) {
          this.handlePlayerDamage(1);
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // Player's projectile, check hits against enemies!
        for (const enemy of this.level.enemies) {
          if (enemy.isDead) continue;
          if (
            PhysicsEngine.checkAABB(
              enemy.x, enemy.y, enemy.width, enemy.height,
              proj.x, proj.y, proj.width, proj.height
            )
          ) {
            this.damageEnemy(enemy, 1);
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }

    // 8. Update check points activation
    this.level.checkpoints.forEach(cp => {
      if (cp.activated) return;
      if (
        PhysicsEngine.checkAABB(
          this.player!.x, this.player!.y, this.player!.width, this.player!.height,
          cp.x - 16, cp.y - 32, 48, 64
        )
      ) {
        cp.activated = true;
        this.playerStats.checkpointX = cp.x;
        this.playerStats.checkpointY = cp.y;
        audio.playSfx('checkpoint');
        particles.emitSparkle(cp.x, cp.y, '#00e5ff', 15);
      }
    });

    // 9. Update enemy entities AI & combat
    this.level.enemies.forEach(enemy => {
      EnemyAI.update(enemy, this.player!.x, this.player!.y, this.player!.width, this.player!.height, this.level!, this.projectiles);

      if (enemy.isDead) return;

      // Check collision with player
      if (
        PhysicsEngine.checkAABB(
          this.player!.x, this.player!.y, this.player!.width, this.player!.height,
          enemy.x, enemy.y, enemy.width, enemy.height
        )
      ) {
        // If player is falling/descending onto the enemy's head, defeat them!
        const playerBottom = this.player!.y + this.player!.height;
        if (this.player!.vy > 0 && playerBottom <= enemy.y + 12 && enemy.type !== 'boss') {
          // Jump Bounce Kill!
          this.player!.vy = -6.5; // Bounce up
          this.damageEnemy(enemy, 1);
          audio.playSfx('hit');
        } else {
          // Take damage from touch
          this.handlePlayerDamage(1);
        }
      }
    });

    // 10. Check level finish Flag reaching
    if (
      PhysicsEngine.checkAABB(
        this.player.x, this.player.y, this.player.width, this.player.height,
        this.level.finishX, this.level.finishY, 32, 64
      )
    ) {
      this.completeLevel();
    }

    // Timers
    if (this.playerStats.invincibilityTimer > 0) {
      this.playerStats.invincibilityTimer--;
    }

    // Weather emissions
    particles.emitWeather(this.canvas!.width, this.canvas!.height, this.level.weather);

    // Update active visual particles
    particles.update(this.settings.graphicsQuality);

    // Notify updates
    this.notifyStats();
  }

  // --- PLAYER & ENEMIES HEALTH MANAGERS ---
  public damageEnemy(enemy: any, amount: number) {
    enemy.health -= amount;
    particles.emitFire(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 0, -2, 6);
    particles.triggerScreenShake(4);

    if (enemy.health <= 0) {
      enemy.isDead = true;
      enemy.deathTimer = 0;
      audio.playSfx('explosion');
      particles.emitSmoke(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 8);
      this.playerStats.score += 250;
      this.localStats.totalEnemiesDefeated++;

      // Unlock skin if defeated boss!
      if (enemy.type === 'boss') {
        this.unlockSkin('golden_hero');
        this.saveGame();
      }
    }
  }

  public handlePlayerDamage(amount: number) {
    if (this.playerStats.isDead || this.playerStats.invincibilityTimer > 0) return;

    // Shield powerup blocks damage!
    if (this.playerStats.powerups.shield > 0) {
      this.playerStats.powerups.shield = 0;
      this.playerStats.invincibilityTimer = 60; // short invincibility
      audio.playSfx('shield_break');
      particles.emitSparkle(this.player!.x + this.player!.width / 2, this.player!.y + this.player!.height / 2, '#00e5ff', 12);
      return;
    }

    this.playerStats.health -= amount;
    this.playerStats.invincibilityTimer = 90; // 1.5 seconds flash
    particles.triggerScreenShake(12);
    particles.triggerScreenFlash('rgba(255, 0, 0, 0.4)', 0.4);
    audio.playSfx('hit');

    // Knockback physics
    this.player!.vy = -4.5;
    this.player!.vx = -this.player!.direction * 4;
    this.player!.state = 'damage';

    if (this.playerStats.health <= 0) {
      this.handlePlayerDeath();
    }
  }

  private handlePlayerDeath() {
    this.playerStats.isDead = true;
    this.localStats.totalDeaths++;
    this.playerStats.lives--;
    audio.playSfx('gameover');

    setTimeout(() => {
      if (this.playerStats.lives > 0) {
        // Respawn at checkpoint or start of level
        const rx = this.playerStats.checkpointX !== null ? this.playerStats.checkpointX : this.level!.startX;
        const ry = this.playerStats.checkpointY !== null ? this.playerStats.checkpointY : this.level!.startY;
        this.player!.reset(rx, ry);
        this.playerStats.health = this.playerStats.maxHealth;
        this.playerStats.isDead = false;
        this.playerStats.invincibilityTimer = 90;
      } else {
        // Fully game over! Go to game over scene
        this.changeState('gameover');
      }
    }, 1500);
  }

  // --- SCENE / PROGRESS CHANGERS ---
  private completeLevel() {
    audio.playSfx('victory');
    particles.triggerScreenFlash('rgba(255, 215, 0, 0.5)', 0.6);
    particles.emitSparkle(this.level!.finishX, this.level!.finishY, '#ffea00', 30);

    // Save records
    const finalSeconds = Math.floor(this.levelTime / 1000);
    const prevBest = this.localStats.speedrunTimes[this.currentLevelIndex] || 999999;
    if (finalSeconds < prevBest) {
      this.localStats.speedrunTimes[this.currentLevelIndex] = finalSeconds;
    }

    if (this.playerStats.score > this.localStats.highScore) {
      this.localStats.highScore = this.playerStats.score;
    }

    // Unlock next level
    if (this.currentLevelIndex + 1 === this.maxUnlockedLevel && this.maxUnlockedLevel < 10) {
      this.maxUnlockedLevel++;
    }

    // Check unlocks depending on finished level index
    if (this.currentLevelIndex === 3) this.unlockSkin('frost_ninja'); // Level 4 Snow
    if (this.currentLevelIndex === 7) this.unlockSkin('fire_knight'); // Level 8 Lava

    this.saveGame();

    if (this.currentLevelIndex === 9) { // Final Boss Level 10 complete!
      this.changeState('victory');
    } else {
      this.changeState('levelcomplete');
    }
  }

  public unlockSkin(skinId: string) {
    if (!this.unlockedSkins.includes(skinId)) {
      this.unlockedSkins.push(skinId);
      this.playerStats.unlockedSkins = this.unlockedSkins;
    }
  }

  public selectSkin(skinId: string) {
    if (this.unlockedSkins.includes(skinId)) {
      this.activeSkin = skinId;
      this.playerStats.activeSkin = skinId;
      if (this.player) {
        this.player.reset(this.player.x, this.player.y);
      }
      this.saveGame();
    }
  }

  public changeState(newState: typeof this.state) {
    this.state = newState;
    if (this.state === 'menu') {
      audio.playMusic('menu');
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
    this.notifyStateChange();
  }

  // --- RENDERING PIPELINE ---
  private render() {
    if (!this.ctx || !this.canvas || !this.level || !this.player) return;

    const ctx = this.ctx;
    const size = LevelManager.TILE_SIZE;

    // Responsive scaling
    const scale = window.devicePixelRatio || 1;
    if (this.canvas.width !== this.canvas.clientWidth * scale || this.canvas.height !== this.canvas.clientHeight * scale) {
      this.canvas.width = this.canvas.clientWidth * scale;
      this.canvas.height = this.canvas.clientHeight * scale;
      ctx.scale(scale, scale);
    }

    const viewW = this.canvas.width / scale;
    const viewH = this.canvas.height / scale;

    // --- 1. CAMERA SYSTEM SMOOTH INTERPOLATION ---
    // Camera centers around the player
    this.targetCameraX = this.player.x - viewW / 2 + this.player.width / 2;
    this.targetCameraY = this.player.y - viewH / 1.7 + this.player.height / 2;

    // Smooth lerp follow
    this.cameraX += (this.targetCameraX - this.cameraX) * 0.1;
    this.cameraY += (this.targetCameraY - this.cameraY) * 0.1;

    // Restrict camera to map boundaries
    const maxCamX = this.level.width * size - viewW;
    const maxCamY = this.level.height * size - viewH;
    this.cameraX = Math.max(0, Math.min(maxCamX, this.cameraX));
    this.cameraY = Math.max(0, Math.min(maxCamY, this.cameraY));

    // Apply Screen Shake
    const shake = particles.getShakeOffsets();
    const activeCameraX = this.cameraX + shake.x;
    const activeCameraY = this.cameraY + shake.y;

    // --- 2. PARALLAX BACKGROUNDS DRAWING ---
    this.drawParallaxBackground(ctx, viewW, viewH, activeCameraX, activeCameraY);

    // --- 3. DRAW TILE GRID ---
    // Optimize: only draw tiles currently inside viewport (Culling)
    const startCol = Math.floor(activeCameraX / size);
    const endCol = Math.ceil((activeCameraX + viewW) / size);
    const startRow = Math.floor(activeCameraY / size);
    const endRow = Math.ceil((activeCameraY + viewH) / size);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r < 0 || r >= this.level.height || c < 0 || c >= this.level.width) continue;
        const tile = this.level.grid[r][c];
        if (tile <= 0) continue;

        const tx = c * size - activeCameraX;
        const ty = r * size - activeCameraY;

        this.drawTile(ctx, tile, tx, ty, size);
      }
    }

    // --- 4. DRAW CHECKPOINTS & DECORATIONS ---
    this.level.checkpoints.forEach(cp => {
      const cx = cp.x - activeCameraX;
      const cy = cp.y - activeCameraY;
      ctx.save();
      // Pole
      ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(cx, cy - 32, 4, 32);
      // Flag
      ctx.fillStyle = cp.activated ? '#00e5ff' : '#d50000'; // cyan active, red inactive
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy - 32);
      ctx.lineTo(cx + 20, cy - 24);
      ctx.lineTo(cx + 4, cy - 16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Draw level finish Flag
    const fx = this.level.finishX - activeCameraX;
    const fy = this.level.finishY - activeCameraY;
    ctx.save();
    // Pole
    ctx.fillStyle = '#78909c';
    ctx.fillRect(fx + 14, fy - 48, 6, 48);
    // Gold crown top
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(fx + 12, fy - 52, 10, 4);
    // Huge banner flag
    const flagWiggle = Math.sin(Date.now() * 0.01) * 4;
    ctx.fillStyle = '#ffea00'; // Golden finish flag
    ctx.beginPath();
    ctx.moveTo(fx + 20, fy - 44);
    ctx.lineTo(fx + 40 + flagWiggle, fy - 34);
    ctx.lineTo(fx + 20, fy - 24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- 5. DRAW COLLECTIBLES ---
    this.items.forEach(item => {
      if (item.collected) return;
      const ix = item.x - activeCameraX;
      const iy = item.y - activeCameraY + Math.sin(item.bobTimer) * 3; // bobbing

      this.drawItem(ctx, item, ix, iy);
    });

    // --- 6. DRAW MOVING PLATFORMS ---
    this.level.platforms.forEach(plat => {
      const px = plat.x - activeCameraX;
      const py = plat.y - activeCameraY;

      ctx.save();
      ctx.fillStyle = plat.type === 'bounce' ? '#00e676' : '#78909c'; // green trampoline platform, grey metal platform
      ctx.fillRect(px, py, plat.width, plat.height);
      // Details
      ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(px, py, plat.width, 2); // top edge highlight
      ctx.restore();
    });

    // --- 7. DRAW PROJECTILES ---
    this.projectiles.forEach(proj => {
      const px = proj.x - activeCameraX;
      const py = proj.y - activeCameraY;
      ctx.save();
      ctx.fillStyle = proj.color;
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px + proj.width / 2, py + proj.height / 2, proj.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // --- 8. DRAW ENEMIES ---
    this.level.enemies.forEach(enemy => {
      EnemyAI.draw(ctx, enemy, activeCameraX, activeCameraY);
    });

    // --- 9. DRAW PLAYER ---
    this.player.draw(ctx, this.playerStats, activeCameraX, activeCameraY);

    // --- 10. DRAW VFX PARTICLES ---
    particles.draw(ctx, activeCameraX, activeCameraY);

    // --- 11. DRAW HUD BOSS BAR OVERLAY (If fighting final boss) ---
    if (this.level.theme === 'finalboss') {
      const boss = this.level.enemies.find(e => e.type === 'boss');
      if (boss && !boss.isDead) {
        this.drawBossHealthBar(ctx, boss, viewW, viewH);
      }
    }
  }

  private drawParallaxBackground(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, cameraX: number, cameraY: number) {
    ctx.save();

    // Set theme gradient backgrounds
    let bgGrad = ctx.createLinearGradient(0, 0, 0, viewH);
    if (this.level!.theme === 'forest' || this.level!.theme === 'tutorial') {
      bgGrad.addColorStop(0, '#81d4fa'); // sky blue
      bgGrad.addColorStop(1, '#e0f7fa'); // soft teal
    } else if (this.level!.theme === 'cave' || this.level!.theme === 'underground') {
      bgGrad.addColorStop(0, '#1a237e'); // deep purple night
      bgGrad.addColorStop(1, '#000a12'); // black slate
    } else if (this.level!.theme === 'snow') {
      bgGrad.addColorStop(0, '#b2ebf2'); // icy cyan
      bgGrad.addColorStop(1, '#ffffff'); // white snowy bottom
    } else if (this.level!.theme === 'mountain') {
      bgGrad.addColorStop(0, '#311b92'); // twilight dark blue
      bgGrad.addColorStop(1, '#b39ddb'); // lavender mountains
    } else if (this.level!.theme === 'castle') {
      bgGrad.addColorStop(0, '#212121'); // charcoal grey
      bgGrad.addColorStop(1, '#4e342e'); // lava orange-brown glow
    } else if (this.level!.theme === 'lava') {
      bgGrad.addColorStop(0, '#3e2723'); // deep brown ash
      bgGrad.addColorStop(1, '#d84315'); // burning red-orange
    } else if (this.level!.theme === 'sky') {
      bgGrad.addColorStop(0, '#00b0ff'); // cyan sky
      bgGrad.addColorStop(1, '#ff80ab'); // sunset pink gradient
    } else if (this.level!.theme === 'finalboss') {
      bgGrad.addColorStop(0, '#0a0015'); // cosmic black purple
      bgGrad.addColorStop(1, '#4a0e4e'); // vibrant magenta abyss
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, viewW, viewH);

    // Apply ambient screen glow overlay if active
    if (this.level!.ambientGlow) {
      ctx.fillStyle = this.level!.ambientGlow;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    // Parallax Mountain/Cloud vector hills
    // Layer 1 (Far ranges, scrolls at 10% rate)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    if (this.level!.theme === 'forest' || this.level!.theme === 'tutorial') {
      ctx.fillStyle = 'rgba(76, 175, 80, 0.08)'; // Green hills
    } else if (this.level!.theme === 'snow') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'; // Snowy caps
    } else if (this.level!.theme === 'lava') {
      ctx.fillStyle = 'rgba(255, 60, 0, 0.08)'; // Burning volcanoes
    }

    const farScroll = -(cameraX * 0.1) % viewW;
    ctx.beginPath();
    ctx.moveTo(farScroll - 100, viewH);
    ctx.lineTo(farScroll + viewW * 0.2, viewH * 0.4);
    ctx.lineTo(farScroll + viewW * 0.5, viewH);
    ctx.lineTo(farScroll + viewW * 0.8, viewH * 0.5);
    ctx.lineTo(farScroll + viewW + 100, viewH);
    ctx.closePath();
    ctx.fill();

    // Draw wrap-around for far scroll
    ctx.beginPath();
    ctx.moveTo(farScroll + viewW - 100, viewH);
    ctx.lineTo(farScroll + viewW * 1.2, viewH * 0.4);
    ctx.lineTo(farScroll + viewW * 1.5, viewH);
    ctx.lineTo(farScroll + viewW * 1.8, viewH * 0.5);
    ctx.lineTo(farScroll + viewW * 2 + 100, viewH);
    ctx.closePath();
    ctx.fill();

    // Layer 2 (Medium distance trees/cliffs, scrolls at 25% rate)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    if (this.level!.theme === 'forest' || this.level!.theme === 'tutorial') {
      ctx.fillStyle = 'rgba(56, 142, 60, 0.15)'; // Closer green hills
    } else if (this.level!.theme === 'snow') {
      ctx.fillStyle = 'rgba(224, 242, 241, 0.25)';
    } else if (this.level!.theme === 'lava') {
      ctx.fillStyle = 'rgba(230, 81, 0, 0.12)';
    }

    const midScroll = -(cameraX * 0.25) % viewW;
    ctx.beginPath();
    ctx.moveTo(midScroll - 100, viewH);
    ctx.lineTo(midScroll + viewW * 0.3, viewH * 0.6);
    ctx.lineTo(midScroll + viewW * 0.6, viewH);
    ctx.lineTo(midScroll + viewW * 0.9, viewH * 0.7);
    ctx.lineTo(midScroll + viewW + 100, viewH);
    ctx.closePath();
    ctx.fill();

    // Wrap around
    ctx.beginPath();
    ctx.moveTo(midScroll + viewW - 100, viewH);
    ctx.lineTo(midScroll + viewW * 1.3, viewH * 0.6);
    ctx.lineTo(midScroll + viewW * 1.6, viewH);
    ctx.lineTo(midScroll + viewW * 1.9, viewH * 0.7);
    ctx.lineTo(midScroll + viewW * 2 + 100, viewH);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawTile(ctx: CanvasRenderingContext2D, tile: number, tx: number, ty: number, size: number) {
    ctx.save();

    // Set colors according to tile codes & theme contexts
    switch (tile) {
      case 1: // Normal Dirt block
        ctx.fillStyle = this.level!.theme === 'castle' ? '#37474f' : '#5d4037';
        ctx.fillRect(tx, ty, size, size);
        // Draw inner dirt grain
        ctx.fillStyle = this.level!.theme === 'castle' ? '#263238' : '#4e342e';
        ctx.fillRect(tx + 4, ty + 4, size - 8, size - 8);
        break;

      case 2: // Grass Top Block
        ctx.fillStyle = '#8d6e63'; // Brown dirt base
        ctx.fillRect(tx, ty + 6, size, size - 6);

        // Grass cap
        ctx.fillStyle = '#4caf50'; // Bright green
        ctx.fillRect(tx, ty, size, 6);
        // Grass fringe detail
        ctx.fillStyle = '#388e3c';
        ctx.fillRect(tx + 4, ty + 6, 4, 4);
        ctx.fillRect(tx + 16, ty + 6, 6, 3);
        ctx.fillRect(tx + 26, ty + 6, 4, 5);
        break;

      case 3: // Breakable Brick Block
        ctx.fillStyle = '#a1887f';
        ctx.fillRect(tx, ty, size, size);
        ctx.strokeStyle = '#4e342e';
        ctx.lineWidth = 2;
        ctx.strokeRect(tx + 1, ty + 1, size - 2, size - 2);
        // Brick cracks lines
        ctx.beginPath();
        ctx.moveTo(tx + 1, ty + size / 2);
        ctx.lineTo(tx + size - 1, ty + size / 2);
        ctx.moveTo(tx + size / 2, ty + 1);
        ctx.lineTo(tx + size / 2, ty + size / 2);
        ctx.moveTo(tx + size / 3, ty + size / 2);
        ctx.lineTo(tx + size / 3, ty + size - 1);
        ctx.stroke();
        break;

      case 4: // Mystery Block
        ctx.fillStyle = '#ffb300'; // Amber gold
        ctx.fillRect(tx, ty, size, size);
        ctx.strokeStyle = '#ff6f00';
        ctx.lineWidth = 2;
        ctx.strokeRect(tx + 1, ty + 1, size - 2, size - 2);
        // Question mark glyph
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#ff6f00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', tx + size / 2, ty + size / 2 + 1);
        break;

      case 5: // Spike Hazard
        ctx.fillStyle = '#cfd8dc'; // Steel grey
        ctx.beginPath();
        ctx.moveTo(tx, ty + size);
        ctx.lineTo(tx + size / 2, ty);
        ctx.lineTo(tx + size, ty + size);
        ctx.closePath();
        ctx.fill();
        // Spike highlights
        ctx.strokeStyle = '#90a4ae';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, ty + size - 2, size, 2);
        break;

      case 6: // Revealed Empty / Solid top block
        ctx.fillStyle = '#37474f'; // Grey slate block
        ctx.fillRect(tx, ty, size, size);
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 2;
        ctx.strokeRect(tx + 1, ty + 1, size - 2, size - 2);
        break;

      case 7: // Castle Stone Block
        ctx.fillStyle = '#455a64'; // Blue slate
        ctx.fillRect(tx, ty, size, size);
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 1, ty + 1, size - 2, size - 2);
        // Mortar lines
        ctx.fillStyle = '#37474f';
        ctx.fillRect(tx + 2, ty + 2, 4, 4);
        ctx.fillRect(tx + size - 8, ty + size - 8, 4, 4);
        break;

      case 8: // Ice Block
        ctx.fillStyle = '#e0f7fa'; // Clear cyan ice
        ctx.fillRect(tx, ty, size, size);
        ctx.strokeStyle = '#4dd0e1';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tx + 1, ty + 1, size - 2, size - 2);
        // Ice reflections
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tx + 4, ty + 4, size - 8, 3);
        ctx.fillRect(tx + 4, ty + 12, 6, 2);
        break;

      case 9: // Deadly Lava Block
        const bubble = Math.sin(Date.now() * 0.01 + tx) * 4;
        ctx.fillStyle = '#ff3d00'; // Burning red-orange
        ctx.fillRect(tx, ty + bubble, size, size - bubble);
        // Lava crest glow
        ctx.fillStyle = '#ffea00'; // Yellow sparks
        ctx.fillRect(tx, ty + bubble, size, 4);
        break;

      case 10: // Water Block
        const wave = Math.sin(Date.now() * 0.005 + tx) * 3;
        ctx.fillStyle = 'rgba(0, 180, 255, 0.4)';
        ctx.fillRect(tx, ty + wave, size, size - wave);
        break;

      case 11: // Ladder block
        ctx.fillStyle = '#8d6e63'; // wood brown
        ctx.fillRect(tx + 4, ty, 4, size); // left rail
        ctx.fillRect(tx + size - 8, ty, 4, size); // right rail
        // Rungs
        ctx.fillRect(tx + 4, ty + 6, size - 8, 3);
        ctx.fillRect(tx + 4, ty + 16, size - 8, 3);
        ctx.fillRect(tx + 4, ty + 26, size - 8, 3);
        break;

      case 12: // Trampoline top block
        ctx.fillStyle = '#d50000'; // Red base
        ctx.fillRect(tx, ty + 12, size, size - 12);
        ctx.fillStyle = '#212121'; // Black trampoline pad
        ctx.fillRect(tx + 4, ty, size - 8, 12);
        break;

      case 13: // Locked Door block
        ctx.fillStyle = '#795548'; // Oak brown
        ctx.fillRect(tx, ty, size, size);
        // Iron bands
        ctx.fillStyle = '#37474f';
        ctx.fillRect(tx + 2, ty + 4, size - 4, 3);
        ctx.fillRect(tx + 2, ty + size - 8, size - 4, 3);
        // Gold keyhole lock
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(tx + size / 2 - 4, ty + size / 2 - 4, 8, 8);
        ctx.fillStyle = '#000000';
        ctx.fillRect(tx + size / 2 - 2, ty + size / 2, 4, 4);
        break;
    }

    ctx.restore();
  }

  private drawItem(ctx: CanvasRenderingContext2D, item: GameItem, ix: number, iy: number) {
    ctx.save();

    const w = item.width;
    const h = item.height;

    switch (item.type) {
      case 'coin':
        // Shiny gold rotating coin
        ctx.fillStyle = '#ffea00'; // outer gold
        ctx.beginPath();
        // simulate rotation using simple ellipse
        const rotateScale = Math.sin(Date.now() * 0.015) * 0.5 + 0.5;
        ctx.ellipse(ix + w / 2, iy + h / 2, (w / 2) * rotateScale + 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffb300'; // inner shadow
        ctx.beginPath();
        ctx.ellipse(ix + w / 2, iy + h / 2, (w / 4) * rotateScale + 1, h / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'key':
        // Gold shiny Key
        ctx.fillStyle = '#ffea00';
        // head loop
        ctx.beginPath();
        ctx.arc(ix + 6, iy + h / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(ix + 6, iy + h / 2, 2, 0, Math.PI * 2);
        ctx.fill();
        // stem and teeth
        ctx.fillStyle = '#ffea00';
        ctx.fillRect(ix + 11, iy + h / 2 - 1.5, 9, 3);
        ctx.fillRect(ix + 16, iy + h / 2, 2, 4);
        ctx.fillRect(ix + 18, iy + h / 2, 2, 4);
        break;

      case 'gem_blue':
      case 'gem_green':
        // Diamond cut gem
        ctx.fillStyle = item.type === 'gem_blue' ? '#00e5ff' : '#00e676';
        ctx.beginPath();
        ctx.moveTo(ix + w / 2, iy); // top point
        ctx.lineTo(ix + w, iy + h / 3);
        ctx.lineTo(ix + w / 2, iy + h); // bottom point
        ctx.lineTo(ix, iy + h / 3);
        ctx.closePath();
        ctx.fill();
        // reflection
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(ix + w / 2, iy);
        ctx.lineTo(ix + w * 0.7, iy + h / 3);
        ctx.lineTo(ix + w / 2, iy + h);
        ctx.closePath();
        ctx.fill();
        break;

      case 'star':
        // Ultimate Power Star
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        // Draw standard 5 point vector star
        const cx = ix + w / 2;
        const cy = iy + h / 2;
        const spikes = 5;
        const outerRadius = w / 2;
        const innerRadius = w / 4;
        let rot = (Math.PI / 2) * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
          x = cx + Math.cos(rot) * outerRadius;
          y = cy + Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;

          x = cx + Math.cos(rot) * innerRadius;
          y = cy + Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
        }
        ctx.closePath();
        ctx.fill();
        break;

      case 'extra_life':
        // Heart life symbol
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.moveTo(ix + w / 2, iy + h / 3);
        // left lobe
        ctx.bezierCurveTo(ix + w / 4, iy, ix, iy + h / 3, ix + w / 2, iy + h);
        // right lobe
        ctx.bezierCurveTo(ix + w, iy + h / 3, ix + (3 * w) / 4, iy, ix + w / 2, iy + h / 3);
        ctx.fill();
        break;

      case 'power_speed':
        // Speed Boot icon
        ctx.fillStyle = '#ffd700'; // gold wing
        ctx.fillRect(ix, iy + h / 3, w, h / 2);
        ctx.fillStyle = '#ff1744'; // red boot
        ctx.beginPath();
        ctx.moveTo(ix, iy + h / 2);
        ctx.lineTo(ix + w, iy + h / 2);
        ctx.lineTo(ix + w - 4, iy + h);
        ctx.lineTo(ix + 4, iy + h);
        ctx.closePath();
        ctx.fill();
        break;

      case 'power_jump':
        // Spring shoes
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(ix + 2, iy + h - 6, w - 4, 6);
        // coils
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix + 4, iy + h - 6);
        ctx.lineTo(ix + w - 4, iy + h - 12);
        ctx.lineTo(ix + 4, iy + h - 18);
        ctx.stroke();
        break;

      case 'power_shield':
        // Shield bubble pickup
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ix + w / 2, iy + h / 2, w / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
        ctx.fill();
        break;

      case 'power_magnet':
        // Magnet horseshoe
        ctx.strokeStyle = '#ff1744'; // red horseshoe
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(ix + w / 2, iy + h / 2, w / 3, Math.PI, 0, false);
        ctx.stroke();
        // white poles
        ctx.fillStyle = '#eceff1';
        ctx.fillRect(ix + w / 2 - w / 3 - 2, iy + h / 2, 4, 4);
        ctx.fillRect(ix + w / 2 + w / 3 - 2, iy + h / 2, 4, 4);
        break;

      case 'power_fire':
        // Fireball crystal
        ctx.fillStyle = '#ff3d00';
        ctx.beginPath();
        ctx.moveTo(ix + w / 2, iy);
        ctx.lineTo(ix + w, iy + h / 2);
        ctx.lineTo(ix + w / 2, iy + h);
        ctx.lineTo(ix, iy + h / 2);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  private drawBossHealthBar(ctx: CanvasRenderingContext2D, boss: any, viewW: number, viewH: number) {
    ctx.save();

    const barW = Math.min(400, viewW - 60);
    const barH = 14;
    const barX = (viewW - barW) / 2;
    const barY = 40; // Top middle of screen below HUD

    // Background border
    ctx.fillStyle = '#212121';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    // Empty red base
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(barX, barY, barW, barH);

    // Active health fill
    const healthRatio = Math.max(0, boss.health / boss.maxHealth);
    ctx.fillStyle = '#e040fb'; // Purple final boss color
    ctx.fillRect(barX, barY, barW * healthRatio, barH);

    // Glow overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(barX, barY, barW, barH / 2);

    // Boss Name Text
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('ZENITH ARCHANGEL - THE FINAL LICH', viewW / 2, barY - 6);

    ctx.restore();
  }
}

export const game = new GameEngine();
export default game;
