/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TileMapConfig, EnemyConfig, PlatformConfig } from '../types';

export class LevelManager {
  public static readonly TILE_SIZE = 32;

  public static getLevel(index: number): TileMapConfig {
    const levelIndex = Math.max(0, Math.min(9, index));
    const width = 100; // 100 tiles wide = 3200px
    const height = 15; // 15 tiles high = 480px
    const size = this.TILE_SIZE;

    // Default tilemap grid (all air = 0)
    const grid: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

    let theme: TileMapConfig['theme'] = 'forest';
    let weather: TileMapConfig['weather'] = 'clear';
    let name = 'Super Adventure';
    let startX = 64;
    let startY = 320;
    let finishX = (width - 4) * size;
    let finishY = 10 * size;
    let ambientGlow: string | undefined;

    const enemies: EnemyConfig[] = [];
    const platforms: PlatformConfig[] = [];
    const checkpoints: { x: number; y: number; activated: boolean }[] = [];
    const secrets: { x: number; y: number; width: number; height: number; type: 'coin' | 'gem' | 'star' | 'chest' }[] = [];

    // Helper to draw horizontal lines
    const drawLine = (x1: number, x2: number, y: number, tile: number) => {
      for (let x = x1; x <= x2; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          grid[y][x] = tile;
        }
      }
    };

    // Helper to draw vertical lines
    const drawVLine = (x: number, y1: number, y2: number, tile: number) => {
      for (let y = y1; y <= y2; y++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          grid[y][x] = tile;
        }
      }
    };

    // Helper to fill rectangular areas
    const fillRect = (x1: number, y1: number, x2: number, y2: number, tile: number) => {
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            grid[y][x] = tile;
          }
        }
      }
    };

    // Helper to add enemies safely
    const addEnemy = (type: EnemyConfig['type'], tx: number, ty: number, patrolRange: number = 100, health: number = 1) => {
      enemies.push({
        id: `enemy_${index}_${enemies.length}`,
        type,
        x: tx * size,
        y: ty * size - 4, // offset slightly to sit on top of the tile
        startX: tx * size,
        startY: ty * size - 4,
        width: type === 'boss' ? 64 : 24,
        height: type === 'boss' ? 64 : 24,
        vx: 0,
        vy: 0,
        speed: type === 'charger' ? 2.5 : type === 'flyer' ? 1.2 : 0.8,
        patrolRange,
        health,
        maxHealth: health,
        isDead: false,
        deathTimer: 0,
        state: 'patrol',
        direction: -1,
        attackTimer: 0
      });
    };

    // Helper to add moving platforms
    const addPlatform = (
      tx: number, ty: number,
      w: number, h: number,
      rx: number, ry: number,
      speed: number,
      type: PlatformConfig['type']
    ) => {
      platforms.push({
        x: tx * size,
        y: ty * size,
        startX: tx * size,
        startY: ty * size,
        width: w * size,
        height: h,
        vx: 0,
        vy: 0,
        rangeX: rx * size,
        rangeY: ry * size,
        speed,
        type
      });
    };

    // Build theme-specific layouts
    switch (levelIndex) {
      case 0: // LEVEL 1: TUTORIAL
        theme = 'tutorial';
        name = 'Level 1: Genesis Plains';
        weather = 'clear';

        // Ground floor
        fillRect(0, 12, width - 1, 14, 1); // Dirt
        drawLine(0, width - 1, 11, 2); // Grass top

        // Tutorial walls & stairs
        fillRect(15, 8, 16, 11, 1);
        drawLine(15, 16, 7, 2);

        fillRect(25, 6, 27, 11, 1);
        drawLine(25, 27, 5, 2);

        // Breakable blocks tutorial
        grid[8][35] = 3;
        grid[8][36] = 4; // Mystery coin
        grid[8][37] = 3;

        // Spike pit tutorial
        fillRect(45, 11, 48, 11, 5); // Spikes
        fillRect(45, 12, 48, 14, 1); // Ground underneath

        // Higher floating platforms
        drawLine(55, 60, 7, 2);
        drawLine(63, 68, 6, 6); // Hidden platforms from top (bridges)

        // Trampoline introduction
        grid[11][74] = 12; // trampoline

        // Keys and locked doors
        grid[5][57] = 4; // mystery box with key inside
        fillRect(85, 8, 85, 11, 13); // Locked door blocking the end

        // Checkpoints
        checkpoints.push({ x: 40 * size, y: 10 * size, activated: false });
        checkpoints.push({ x: 70 * size, y: 10 * size, activated: false });

        // Simple Walker Enemies
        addEnemy('walker', 20, 11, 120, 1);
        addEnemy('walker', 58, 7, 80, 1);
        break;

      case 1: // LEVEL 2: FOREST
        theme = 'forest';
        name = 'Level 2: Whispering Woodlands';
        weather = 'clouds';

        // Ground layout with pits
        fillRect(0, 12, 18, 14, 1);
        drawLine(0, 18, 11, 2);

        // First Pit
        fillRect(22, 12, 38, 14, 1);
        drawLine(22, 38, 11, 2);

        // Add a vertical climb with ladders
        fillRect(44, 12, width - 1, 14, 1);
        drawLine(44, width - 1, 11, 2);

        fillRect(45, 6, 50, 11, 1);
        drawLine(45, 50, 5, 2);
        drawVLine(47, 6, 11, 11); // ladder on side of wall

        // Moving platforms inside the pits
        addPlatform(19, 11, 3, 12, 0, 100, 1.2, 'vertical');
        addPlatform(39, 10, 3, 12, 120, 0, 1.5, 'horizontal');

        // Trees / decorations represented as logs/branches (bridges)
        drawLine(10, 14, 5, 6);
        drawLine(25, 30, 7, 6);
        drawLine(32, 37, 5, 6);

        // Breakables and item drops
        grid[7][28] = 4;
        grid[7][29] = 3;
        grid[7][30] = 4;

        checkpoints.push({ x: 23 * size, y: 10 * size, activated: false });
        checkpoints.push({ x: 52 * size, y: 10 * size, activated: false });

        // Enemies
        addEnemy('walker', 12, 11, 150, 1);
        addEnemy('flyer', 28, 4, 160, 1);
        addEnemy('walker', 55, 11, 180, 1);
        addEnemy('jumper', 68, 11, 100, 1);
        break;

      case 2: // LEVEL 3: CAVE
        theme = 'cave';
        name = 'Level 3: Echoing Caverns';
        weather = 'fog';
        ambientGlow = 'rgba(0, 10, 30, 0.4)';

        // Cave has a ceiling
        fillRect(0, 0, width - 1, 2, 7); // ceiling

        // Low ground with spikes
        fillRect(0, 12, 12, 14, 7); // stone ground
        fillRect(16, 12, 40, 14, 7);
        fillRect(45, 12, 70, 14, 7);
        fillRect(75, 12, width - 1, 14, 7);

        // Spike zones
        fillRect(13, 11, 15, 11, 5); // spike pits
        fillRect(41, 11, 44, 11, 5);

        // Breakable tunnels
        fillRect(25, 6, 26, 11, 3); // tunnel blocked by breakable blocks!

        // Upper ledges
        fillRect(18, 7, 24, 7, 7);
        fillRect(32, 6, 38, 6, 7);
        fillRect(50, 5, 62, 5, 7);

        // Ladders and secret chambers
        drawVLine(55, 5, 11, 11);
        grid[4][57] = 4; // premium loot in ceiling

        // Checkpoints
        checkpoints.push({ x: 20 * size, y: 10 * size, activated: false });
        checkpoints.push({ x: 48 * size, y: 10 * size, activated: false });
        checkpoints.push({ x: 78 * size, y: 10 * size, activated: false });

        // Enemies
        addEnemy('walker', 8, 11, 100, 2);
        addEnemy('flyer', 22, 4, 120, 1);
        addEnemy('jumper', 35, 11, 80, 1);
        addEnemy('ghost', 58, 4, 100, 1);
        break;

      case 3: // LEVEL 4: SNOW
        theme = 'snow';
        name = 'Level 4: Frostbite Ridge';
        weather = 'snow';

        // Snow utilizes Slippery snow/ice tiles (8)
        fillRect(0, 12, 25, 14, 1);
        drawLine(0, 25, 11, 8); // Ice top

        fillRect(30, 12, 55, 14, 1);
        drawLine(30, 55, 11, 8);

        fillRect(60, 12, width - 1, 14, 1);
        drawLine(60, width - 1, 11, 8);

        // Slippery gaps, sliding jumps are necessary
        addPlatform(26, 11, 3, 12, 100, 0, 1.2, 'horizontal');
        addPlatform(56, 11, 3, 12, 100, 0, 1.2, 'horizontal');

        // Snowy pine branches (bridges)
        drawLine(8, 7, 14, 6);
        drawLine(35, 7, 42, 6);
        drawLine(65, 6, 72, 6);

        // Snow slides / small sloped step blocks
        grid[11][15] = 8;
        grid[10][16] = 8;
        grid[9][17] = 8;

        checkpoints.push({ x: 32 * size, y: 10 * size, activated: false });
        checkpoints.push({ x: 62 * size, y: 10 * size, activated: false });

        // Ice themed jumping and charging enemies
        addEnemy('jumper', 10, 11, 150, 2);
        addEnemy('charger', 38, 11, 200, 1);
        addEnemy('walker', 68, 11, 140, 2);
        addEnemy('flyer', 48, 4, 150, 1);
        break;

      case 4: // LEVEL 5: MOUNTAIN
        theme = 'mountain';
        name = 'Level 5: Peak of Trials';
        weather = 'clouds';

        // Mountain level has high height variations and climbing
        fillRect(0, 12, 12, 14, 1);
        drawLine(0, 12, 11, 2);

        // Huge cliff walls to scale
        fillRect(18, 5, 22, 14, 1);
        drawLine(18, 22, 4, 2);
        drawVLine(18, 5, 11, 11); // ladder to climb cliff

        fillRect(32, 3, 38, 14, 1);
        drawLine(32, 38, 2, 2);

        // Bouncy trampoline setups
        grid[11][15] = 12; // trampoline to bounce onto cliff 1
        grid[11][28] = 12; // trampoline to bounce onto cliff 2

        // High clouds as bridge steps
        drawLine(44, 49, 4, 6);
        drawLine(52, 57, 5, 6);
        drawLine(60, 65, 4, 6);

        // Long platform ride
        addPlatform(68, 11, 4, 12, 0, 200, 2.0, 'vertical');

        fillRect(76, 12, width - 1, 14, 1);
        drawLine(76, width - 1, 11, 2);

        checkpoints.push({ x: 20 * size, y: 3 * size, activated: false });
        checkpoints.push({ x: 50 * size, y: 3 * size, activated: false });
        checkpoints.push({ x: 78 * size, y: 10 * size, activated: false });

        addEnemy('flyer', 14, 3, 200, 1);
        addEnemy('charger', 35, 2, 100, 2);
        addEnemy('walker', 80, 11, 150, 2);
        addEnemy('jumper', 88, 11, 120, 2);
        break;

      case 5: // LEVEL 6: CASTLE
        theme = 'castle';
        name = 'Level 6: Obsidian Keep';
        weather = 'clear';
        ambientGlow = 'rgba(50, 0, 0, 0.2)';

        // Ceiling
        fillRect(0, 0, width - 1, 2, 7);

        // Ground blocks
        fillRect(0, 12, 20, 14, 7);
        fillRect(25, 12, 45, 14, 7);
        fillRect(52, 12, 75, 14, 7);
        fillRect(80, 12, width - 1, 14, 7);

        // Spikes and hot iron hazards
        fillRect(21, 11, 24, 11, 5);
        fillRect(46, 11, 51, 11, 5);
        fillRect(76, 11, 79, 11, 5);

        // Castle pillars and hanging blocks
        fillRect(10, 6, 12, 11, 7);
        fillRect(30, 5, 34, 8, 7);
        fillRect(58, 6, 62, 9, 7);

        // Keys and doors
        grid[4][11] = 4; // key inside mystery block
        fillRect(40, 8, 40, 11, 13); // locked door

        checkpoints.push({ x: 28 * size, y: 10 * size, activated: false });
        checkpoints.push({ x: 55 * size, y: 10 * size, activated: false });

        // Castle contains Fire enemies and ghostly apparitions
        addEnemy('ghost', 15, 8, 100, 2);
        addEnemy('fire', 32, 11, 120, 2);
        addEnemy('ghost', 60, 4, 150, 2);
        addEnemy('fire', 70, 11, 80, 2);
        break;

      case 6: // LEVEL 7: UNDERGROUND
        theme = 'underground';
        name = 'Level 7: Deep Crust Tunnels';
        weather = 'fog';
        ambientGlow = 'rgba(10, 25, 20, 0.3)';

        // Heavy ceilings and tight tunnels
        fillRect(0, 0, width - 1, 3, 7);
        fillRect(0, 12, width - 1, 14, 7);

        // Create underground corridors
        fillRect(15, 3, 40, 7, 7); // central divider block
        fillRect(50, 8, 70, 11, 7);

        // Ladders joining chambers
        drawVLine(12, 3, 11, 11);
        drawVLine(45, 3, 11, 11);
        drawVLine(72, 3, 11, 11);

        // Tight spikes in chambers
        grid[11][20] = 5;
        grid[11][21] = 5;
        grid[11][30] = 5;

        // Hidden passageways (tile 6 blocks blocking paths)
        grid[11][5] = 6;
        grid[10][5] = 6;

        checkpoints.push({ x: 14 * size, y: 10 * size, activated: false });
        checkpoints.push({ x: 46 * size, y: 10 * size, activated: false });

        addEnemy('walker', 18, 11, 150, 3);
        addEnemy('charger', 28, 11, 120, 2);
        addEnemy('jumper', 55, 7, 100, 2);
        addEnemy('ghost', 65, 5, 80, 2);
        break;

      case 7: // LEVEL 8: LAVA
        theme = 'lava';
        name = 'Level 8: Inferno Caldera';
        weather = 'ash';
        ambientGlow = 'rgba(255, 40, 0, 0.3)';

        // Giant pits filled with Lava (9)
        fillRect(0, 12, 15, 14, 7); // stone start

        fillRect(16, 12, 45, 14, 9); // giant lava pit!
        fillRect(46, 12, 60, 14, 7); // center stone island

        fillRect(61, 12, 85, 14, 9); // second lava lake!
        fillRect(86, 12, width - 1, 14, 7); // end stone

        // Small stone stepping stones inside lava
        fillRect(22, 11, 23, 11, 7);
        fillRect(30, 10, 31, 10, 7);
        fillRect(38, 11, 39, 11, 7);

        fillRect(67, 11, 68, 11, 7);
        fillRect(75, 10, 76, 10, 7);

        // Bouncing platform rides above lava
        addPlatform(18, 9, 3, 12, 100, 0, 1.5, 'horizontal');
        addPlatform(63, 9, 3, 12, 120, 0, 1.8, 'horizontal');

        checkpoints.push({ x: 12 * size, y: 10 * size, activated: false });
        checkpoints.push({ x: 48 * size, y: 10 * size, activated: false });

        // Fire enemies and ghost spirits
        addEnemy('fire', 8, 11, 100, 3);
        addEnemy('fire', 48, 11, 100, 3);
        addEnemy('ghost', 28, 4, 150, 2);
        addEnemy('jumper', 52, 11, 120, 2);
        addEnemy('fire', 90, 11, 150, 3);
        break;

      case 8: // LEVEL 9: SKY
        theme = 'sky';
        name = 'Level 9: Cloud Sanctuary';
        weather = 'clouds';

        // Sky level has almost no ground, mostly moving and floating platform jumps!
        fillRect(0, 12, 10, 14, 1);
        drawLine(0, 10, 11, 2);

        // Stepping stone clouds
        drawLine(14, 18, 9, 6);
        drawLine(22, 26, 7, 6);

        // Platform carousel
        addPlatform(28, 7, 3, 12, 120, 0, 1.6, 'horizontal');
        addPlatform(42, 6, 3, 12, 0, 120, 1.8, 'vertical');
        addPlatform(56, 7, 3, 12, 150, 0, 2.0, 'horizontal');

        // Bouncy trampolines high up on small cloud clusters
        grid[11][70] = 12;
        drawLine(69, 71, 12, 2);

        // Huge final cloud block
        fillRect(78, 12, width - 1, 14, 1);
        drawLine(78, width - 1, 11, 2);

        checkpoints.push({ x: 8 * size, y: 10 * size, activated: false });
        checkpoints.push({ x: 50 * size, y: 4 * size, activated: false });

        addEnemy('flyer', 16, 5, 200, 2);
        addEnemy('flyer', 35, 4, 180, 2);
        addEnemy('jumper', 82, 11, 100, 3);
        addEnemy('charger', 88, 11, 150, 3);
        break;

      case 9: // LEVEL 10: FINAL BOSS
        theme = 'finalboss';
        name = 'Level 10: Zenith Sanctuary';
        weather = 'ash';
        ambientGlow = 'rgba(100, 0, 150, 0.25)';

        // Enclosed Arena
        fillRect(0, 12, width - 1, 14, 7); // Castle ground

        // Castle pillars left and right
        fillRect(0, 0, 5, 14, 7);
        fillRect(width - 6, 0, width - 1, 14, 7);

        // Small defensive high platforms for jumping/escaping attacks
        fillRect(15, 8, 18, 8, 7);
        fillRect(40, 8, 43, 8, 7); // under boss
        fillRect(65, 8, 68, 8, 7);

        // Trampolines on the sides to jump high
        grid[11][10] = 12;
        grid[11][74] = 12;

        finishX = 75 * size;
        finishY = 11 * size;

        // BOSS spawn! Spawned at index 45, 12 (very center of the level)
        // Set health to 15 hits!
        enemies.push({
          id: 'final_boss',
          type: 'boss',
          x: 42 * size,
          y: 7 * size,
          startX: 42 * size,
          startY: 7 * size,
          width: 64,
          height: 64,
          vx: 0,
          vy: 0,
          speed: 1.5,
          patrolRange: 300,
          health: 15,
          maxHealth: 15,
          isDead: false,
          deathTimer: 0,
          state: 'patrol',
          direction: -1,
          phase: 1,
          attackTimer: 0
        });
        break;
    }

    // --- POPULATE COMMON ITEMS PROCEDURALLY ---
    // Place items logically depending on layout:
    // - Place coins in trails above platforms/ground
    // - Place gems inside hidden or breakable brick cells
    // - Place shields, double jump powerups, speed boosts
    // - Spawns a single checkpoint flag automatically if checkpoint exists
    const items: TileMapConfig['secrets'] = []; // we can return custom items
    return {
      id: levelIndex + 1,
      name,
      theme,
      width,
      height,
      tileSize: size,
      grid,
      startX,
      startY,
      finishX,
      finishY,
      enemies,
      platforms,
      secrets,
      checkpoints,
      weather,
      ambientGlow
    };
  }
}

export default LevelManager;
