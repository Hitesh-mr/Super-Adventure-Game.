/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, RotateCcw, Home, Award, Clock } from 'lucide-react';

interface LevelCompleteModalProps {
  levelNum: number;
  levelName: string;
  coinsCollected: number;
  scoreAchieved: number;
  speedrunSeconds: number;
  bestSeconds?: number;
  onNextLevel: () => void;
  onRestartLevel: () => void;
  onExit: () => void;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  levelNum,
  levelName,
  coinsCollected,
  scoreAchieved,
  speedrunSeconds,
  bestSeconds,
  onNextLevel,
  onRestartLevel,
  onExit
}) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Custom unlock announcements based on level completions
  const getUnlockNotification = () => {
    if (levelNum === 1) return '🏆 Genesis Plains Savior achievement unlocked!';
    if (levelNum === 3) return '🏆 Cave Explorer achievement unlocked!';
    if (levelNum === 4) return '❄️ Frost Ninja skin unlocked in wardrobe!';
    if (levelNum === 5) return '🏆 Icy Gladiator achievement unlocked!';
    if (levelNum === 8) return '🔥 Fire Knight skin unlocked in wardrobe!';
    return null;
  };

  const notification = getUnlockNotification();

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center font-mono p-4">
      <div className="w-full max-w-md game-panel-slate p-6 md:p-8 text-zinc-100 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Victory crest */}
        <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center text-2xl mb-4 animate-bounce game-badge border border-white/30">
          🏆
        </div>

        <span className="text-[10px] tracking-[0.25em] text-emerald-400 uppercase font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          Level Complete
        </span>
        <h2 className="text-2xl font-black text-white uppercase mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
          {levelName}
        </h2>

        {/* Unlock Announcement banner */}
        {notification && (
          <div className="mt-3 bg-white/10 border border-white/20 text-white text-[10px] py-1.5 px-3.5 rounded-full font-extrabold animate-pulse game-badge drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {notification}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3.5 w-full my-6 bg-black/35 p-4.5 rounded-xl border border-zinc-750 text-xs shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col items-center p-2 border-r border-zinc-700/20">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Level Score</span>
            <span className="text-base font-black text-white mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]">{scoreAchieved}</span>
          </div>

          <div className="flex flex-col items-center p-2">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Coins Gathered</span>
            <span className="text-base font-black text-yellow-300 mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]">+{coinsCollected}</span>
          </div>

          <div className="flex flex-col items-center p-2 border-r border-zinc-700/20 border-t border-zinc-700/20">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider mt-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Speedrun Time</span>
            <div className="flex items-center gap-1.5 text-white font-black text-xs mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formatTime(speedrunSeconds)}</span>
            </div>
          </div>

          <div className="flex flex-col items-center p-2 border-t border-zinc-700/20">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider mt-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Personal Best</span>
            <span className="text-xs font-black text-emerald-100 mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]">
              {bestSeconds ? formatTime(bestSeconds) : formatTime(speedrunSeconds)}
            </span>
          </div>
        </div>

        {/* Actions button cluster */}
        <div className="flex flex-col gap-2.5 w-full">
          {levelNum < 10 ? (
            <button
              onClick={onNextLevel}
              className="w-full py-3.5 game-btn game-btn-amber text-white font-extrabold text-xs uppercase tracking-wider flex justify-center items-center gap-2 cursor-pointer drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.4)]"
            >
              Next Biome <Play className="w-3.5 h-3.5" />
            </button>
          ) : null}

          <div className="flex gap-2.5 w-full">
            <button
              onClick={onRestartLevel}
              className="flex-1 py-2.5 game-btn game-btn-zinc text-zinc-100 text-xs font-extrabold flex justify-center items-center gap-1.5 cursor-pointer drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.4)]"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Replay
            </button>
            <button
              onClick={onExit}
              className="flex-1 py-2.5 game-btn game-btn-zinc text-zinc-100 text-xs font-extrabold flex justify-center items-center gap-1.5 cursor-pointer drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.4)]"
            >
              <Home className="w-3.5 h-3.5" /> Grid Select
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LevelCompleteModal;
