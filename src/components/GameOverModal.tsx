/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw, Home, Skull } from 'lucide-react';

interface GameOverModalProps {
  levelName: string;
  coinsCollected: number;
  scoreAchieved: number;
  onRestartLevel: () => void;
  onExit: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  levelName,
  coinsCollected,
  scoreAchieved,
  onRestartLevel,
  onExit
}) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center font-mono p-4">
      <div className="w-full max-w-sm game-panel-slate p-6 md:p-8 text-zinc-100 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Death skull crest */}
        <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center text-2xl mb-4 animate-pulse game-badge border border-white/20">
          <Skull className="w-7 h-7 text-red-400" />
        </div>

        <span className="text-[10px] tracking-[0.25em] text-red-400 uppercase font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          Mission Failed
        </span>
        <h2 className="text-2xl font-black text-white uppercase mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
          Game Over
        </h2>
        <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest mt-1 block drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
          {levelName}
        </span>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3.5 w-full my-6 bg-black/35 p-4.5 rounded-xl border border-zinc-750 text-xs shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col items-center p-1.5 border-r border-zinc-700/20">
            <span className="text-[9px] text-red-400 font-extrabold uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Final Score</span>
            <span className="text-base font-black text-white mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]">{scoreAchieved}</span>
          </div>

          <div className="flex flex-col items-center p-1.5">
            <span className="text-[9px] text-red-400 font-extrabold uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Coins Saved</span>
            <span className="text-base font-black text-yellow-300 mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]">{coinsCollected}</span>
          </div>
        </div>

        {/* Action button cluster */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onRestartLevel}
            className="w-full py-3.5 game-btn game-btn-amber text-white font-extrabold text-xs uppercase tracking-wider flex justify-center items-center gap-2 cursor-pointer drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.4)]"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <button
            onClick={onExit}
            className="w-full py-2.5 game-btn game-btn-zinc text-zinc-100 text-xs font-extrabold flex justify-center items-center gap-1.5 cursor-pointer drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.4)]"
          >
            <Home className="w-3.5 h-3.5" /> Return to Menu
          </button>
        </div>

      </div>
    </div>
  );
};

export default GameOverModal;
