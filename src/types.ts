/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  fullscreen: boolean;
  crtFilter: boolean;
  controls: {
    left: string;
    right: string;
    jump: string;
    down: string; // duck / slide
    sprint: string; // sprint / climb / wall kick
    attack: string; // melee / fire shoot
  };
}

export interface PlayerStats {
  score: number;
  coins: number;
  gems: number;
  stars: number;
  lives: number;
  health: number;
  maxHealth: number;
  energy: number; // For attacks or sprints
  maxEnergy: number;
  checkpointX: number | null;
  checkpointY: number | null;
  currentLevel: number;
  isDead: boolean;
  isInvincible: boolean;
  invincibilityTimer: number;
  powerups: {
    speedBoost: number; // time remaining
    doubleJump: number; // time remaining
    shield: number; // time remaining
    magnet: number; // time remaining
    fireAttack: number; // time remaining
    iceAttack: number; // time remaining
    invincibility: number; // time remaining
  };
  unlockedSkins: string[];
  activeSkin: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  unlockedAt?: string;
}

export interface LocalStats {
  highScore: number;
  totalCoinsCollected: number;
  totalEnemiesDefeated: number;
  totalJumps: number;
  totalDeaths: number;
  speedrunTimes: Record<number, number>; // level index -> time in seconds
}

export interface SavedGameState {
  unlockedLevels: number; // max level unlocked (1-10)
  currentLevel: number;
  coins: number;
  highScore: number;
  achievements: { id: string; unlocked: boolean; progress: number }[];
  localStats: LocalStats;
  settings: GameSettings;
  unlockedSkins: string[];
  activeSkin: string;
}

export type EnemyType = 'walker' | 'flyer' | 'jumper' | 'charger' | 'fire' | 'ghost' | 'boss';

export interface EnemyConfig {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  speed: number;
  patrolRange: number;
  health: number;
  maxHealth: number;
  isDead: boolean;
  deathTimer: number;
  state: 'patrol' | 'chase' | 'attack' | 'cooldown';
  direction: 1 | -1;
  phase?: number; // for Boss
  attackTimer?: number;
  isAggro?: boolean;
}

export interface PlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  startX: number;
  startY: number;
  rangeX: number;
  rangeY: number;
  speed: number;
  type: 'horizontal' | 'vertical' | 'bounce' | 'sink';
  color?: string;
}

export interface TileMapConfig {
  id: number;
  name: string;
  theme: 'tutorial' | 'forest' | 'cave' | 'snow' | 'mountain' | 'castle' | 'underground' | 'lava' | 'sky' | 'finalboss';
  width: number; // in tiles
  height: number; // in tiles
  tileSize: number;
  grid: number[][]; // tile grid
  startX: number; // Player start position x (pixels)
  startY: number; // Player start position y (pixels)
  finishX: number; // Finish flag position x (pixels)
  finishY: number; // Finish flag position y (pixels)
  enemies: EnemyConfig[];
  platforms: PlatformConfig[];
  secrets: { x: number; y: number; width: number; height: number; type: 'coin' | 'gem' | 'star' | 'chest' }[];
  checkpoints: { x: number; y: number; activated: boolean }[];
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'ash' | 'clouds';
  ambientGlow?: string;
}

export interface GameItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'coin' | 'gem_blue' | 'gem_green' | 'star' | 'crystal' | 'heart' | 'energy' | 'extra_life' | 'power_speed' | 'power_jump' | 'power_shield' | 'power_magnet' | 'power_fire' | 'key' | 'door';
  collected: boolean;
  bobTimer: number;
  pulseTimer: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  type: 'fire' | 'ice' | 'enemy_fire' | 'boss_energy';
  duration: number; // remaining life time in frames/ms
  color: string;
}

export interface ComboSystem {
  multiplier: number;
  comboTimer: number; // countdown
  comboCount: number;
}
