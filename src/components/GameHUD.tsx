/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, Coins, Award, Clock, Pause, Play, RotateCcw, Volume2, Maximize2 } from 'lucide-react';
import { PlayerStats } from '../types';

interface GameHUDProps {
  stats: PlayerStats;
  levelName: string;
  speedrunTime: number;
  isPaused: boolean;
  onPauseToggle: () => void;
  onRestart: () => void;
  onExit: () => void;
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  // Tactile button handles for mobile support
  onTouchStart: (key: string) => void;
  onTouchEnd: (key: string) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  levelName,
  speedrunTime,
  isPaused,
  onPauseToggle,
  onRestart,
  onExit,
  onToggleFullscreen,
  onToggleMute,
  isMuted,
  onTouchStart,
  onTouchEnd
}) => {
  // Format speedrun timer (MM:SS)
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Hearts generator
  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < stats.maxHealth; i++) {
      hearts.push(
        <Heart
          key={i}
          className={`w-6 h-6 mr-1 transition-transform duration-200 ${
            i < stats.health
              ? 'fill-red-500 text-red-600 scale-100 animate-pulse'
              : 'text-zinc-600 fill-zinc-800 scale-90'
          }`}
        />
      );
    }
    return hearts;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none font-mono flex flex-col justify-between p-4">
      {/* --- TOP ROW HUD --- */}
      <div className="w-full flex justify-between items-start pointer-events-auto">
        {/* Left Side: Health and Lives */}
        <div className="flex flex-col gap-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-3.5 rounded-xl text-white shadow-[0_6px_16px_rgba(0,0,0,0.5)]">
          <div className="flex items-center text-xs text-zinc-300 font-bold uppercase tracking-wider mb-0.5">
            <span>Lives: {stats.lives}</span>
          </div>
          <div className="flex">{renderHearts()}</div>

          {/* Active Powerups tracker */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {stats.powerups.speedBoost > 0 && (
              <span className="text-[9px] bg-amber-500 border border-amber-400/50 px-2 py-0.5 rounded-full text-black font-extrabold animate-pulse game-badge">
                ⚡ SPRINT ({Math.ceil(stats.powerups.speedBoost / 60)}s)
              </span>
            )}
            {stats.powerups.doubleJump > 0 && (
              <span className="text-[9px] bg-cyan-500 border border-cyan-400/50 px-2 py-0.5 rounded-full text-black font-extrabold animate-pulse game-badge">
                👟 AIR JUMP ({Math.ceil(stats.powerups.doubleJump / 60)}s)
              </span>
            )}
            {stats.powerups.shield > 0 && (
              <span className="text-[9px] bg-teal-500 border border-teal-400/50 px-2 py-0.5 rounded-full text-white font-extrabold animate-pulse game-badge">
                🛡️ SHIELD ({Math.ceil(stats.powerups.shield / 60)}s)
              </span>
            )}
            {stats.powerups.magnet > 0 && (
              <span className="text-[9px] bg-red-500 border border-red-400/50 px-2 py-0.5 rounded-full text-white font-extrabold animate-pulse game-badge">
                🧲 MAGNET ({Math.ceil(stats.powerups.magnet / 60)}s)
              </span>
            )}
            {stats.powerups.fireAttack > 0 && (
              <span className="text-[9px] bg-orange-500 border border-orange-400/50 px-2 py-0.5 rounded-full text-black font-extrabold animate-pulse game-badge">
                🔥 FIREBALL ({Math.ceil(stats.powerups.fireAttack / 60)}s)
              </span>
            )}
          </div>
        </div>

        {/* Center: Level details and Speedrun clock */}
        <div className="flex flex-col items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 py-2 px-6 rounded-full text-white text-center shadow-[0_6px_16px_rgba(0,0,0,0.5)]">
          <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">{levelName}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-bold text-white">{formatTime(speedrunTime)}</span>
          </div>
        </div>

        {/* Right Side: Score, Coins & Actions */}
        <div className="flex gap-3">
          <div className="flex flex-col items-end bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-3.5 rounded-xl text-white shadow-[0_6px_16px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-sm">
              <Coins className="w-4 h-4" />
              <span>{stats.coins.toString().padStart(3, '0')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs mt-1">
              <Award className="w-3.5 h-3.5" />
              <span>SCORE: {stats.score.toString().padStart(6, '0')}</span>
            </div>
          </div>

          {/* Quick HUD controls */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={onPauseToggle}
              className="p-2.5 game-btn game-btn-zinc text-white cursor-pointer"
              title="Pause Game"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={onToggleMute}
              className="p-2.5 game-btn game-btn-zinc text-white cursor-pointer"
              title="Mute Audio"
            >
              <Volume2 className={`w-4 h-4 ${isMuted ? 'text-zinc-500 line-through' : 'text-emerald-400'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* --- MIDDLE PAUSE POPUP OVERLAY --- */}
      {isPaused && (
        <div className="self-center flex flex-col items-center game-panel-slate p-8 pointer-events-auto max-w-sm w-full animate-in fade-in zoom-in duration-200">
          <span className="text-2xl font-bold text-yellow-400 tracking-wider mb-2 uppercase">Game Paused</span>
          <span className="text-xs text-zinc-400 mb-6 text-center leading-relaxed">Take a breather, Knight! Your speedrun timer is suspended.</span>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={onPauseToggle}
              className="w-full flex justify-center items-center gap-2 py-3 game-btn game-btn-emerald text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              <Play className="w-4 h-4" /> Resume Mission
            </button>
            <button
              onClick={onRestart}
              className="w-full flex justify-center items-center gap-2 py-2.5 game-btn game-btn-zinc text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Restart Level
            </button>
            <button
              onClick={onExit}
              className="w-full py-2.5 game-btn game-btn-red text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Exit to Menu
            </button>
          </div>

          {/* Quick instructions hint */}
          <div className="mt-6 border-t border-zinc-800/80 pt-4 w-full text-center">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold block mb-1">Keyboard Shortcuts</span>
            <div className="text-[9px] text-zinc-400">
              <p>Arrows: Move & Duck | Space: Jump</p>
              <p>Shift: Sprint | X: Sword Slash / Fireball</p>
            </div>
          </div>
        </div>
      )}

      {/* --- BOTTOM MOBILE TACTILE OVERLAYS (ONLY SHOWN ON TOUCH-ENABLED VIEWPORTS) --- */}
      {/* We will implement the touch controls container here so it renders flawlessly. */}
      {/* We set pointer-events-auto on buttons so touch works. */}
      <div className="w-full flex justify-between items-end pointer-events-none mt-auto">
        {/* Left Side: D-Pad */}
        <div className="flex gap-2.5 pointer-events-auto sm:hidden mb-2">
          <button
            onTouchStart={() => onTouchStart('left')}
            onTouchEnd={() => onTouchEnd('left')}
            onMouseDown={() => onTouchStart('left')}
            onMouseUp={() => onTouchEnd('left')}
            className="w-16 h-16 game-btn game-btn-zinc text-white font-black text-xl flex items-center justify-center cursor-pointer"
          >
            ◀
          </button>
          <div className="flex flex-col gap-2">
            <button
              onTouchStart={() => onTouchStart('jump')}
              onTouchEnd={() => onTouchEnd('jump')}
              onMouseDown={() => onTouchStart('jump')}
              onMouseUp={() => onTouchEnd('jump')}
              className="w-16 h-12 game-btn game-btn-zinc text-white font-black text-lg flex items-center justify-center cursor-pointer"
            >
              ▲
            </button>
            <button
              onTouchStart={() => onTouchStart('down')}
              onTouchEnd={() => onTouchEnd('down')}
              onMouseDown={() => onTouchStart('down')}
              onMouseUp={() => onTouchEnd('down')}
              className="w-16 h-12 game-btn game-btn-zinc text-white font-black text-lg flex items-center justify-center cursor-pointer"
            >
              ▼
            </button>
          </div>
          <button
            onTouchStart={() => onTouchStart('right')}
            onTouchEnd={() => onTouchEnd('right')}
            onMouseDown={() => onTouchStart('right')}
            onMouseUp={() => onTouchEnd('right')}
            className="w-16 h-16 game-btn game-btn-zinc text-white font-black text-xl flex items-center justify-center cursor-pointer"
          >
            ▶
          </button>
        </div>

        {/* Right Side: Action Keys */}
        <div className="flex gap-3 pointer-events-auto sm:hidden mb-2">
          {/* Sprint Action */}
          <button
            onTouchStart={() => onTouchStart('sprint')}
            onTouchEnd={() => onTouchEnd('sprint')}
            onMouseDown={() => onTouchStart('sprint')}
            onMouseUp={() => onTouchEnd('sprint')}
            className="w-14 h-14 game-btn game-btn-amber text-white font-extrabold text-xs flex items-center justify-center rounded-full cursor-pointer"
          >
            RUN
          </button>
          {/* Attack Action */}
          <button
            onTouchStart={() => onTouchStart('attack')}
            onTouchEnd={() => onTouchEnd('attack')}
            onMouseDown={() => onTouchStart('attack')}
            onMouseUp={() => onTouchEnd('attack')}
            className="w-16 h-16 game-btn game-btn-red text-white font-black text-xs flex items-center justify-center rounded-full cursor-pointer"
          >
            ATTACK
          </button>
          {/* Jump Action */}
          <button
            onTouchStart={() => onTouchStart('jump')}
            onTouchEnd={() => onTouchEnd('jump')}
            onMouseDown={() => onTouchStart('jump')}
            onMouseUp={() => onTouchEnd('jump')}
            className="w-18 h-18 game-btn game-btn-emerald text-white font-black text-sm flex items-center justify-center rounded-full cursor-pointer"
          >
            JUMP
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
