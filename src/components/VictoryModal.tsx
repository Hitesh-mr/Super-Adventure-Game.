/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Sparkles, Award } from 'lucide-react';

interface VictoryModalProps {
  scoreAchieved: number;
  totalCoins: number;
  onExit: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  scoreAchieved,
  totalCoins,
  onExit
}) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center font-mono p-4">
      <div className="w-full max-w-md game-panel-slate p-6 md:p-8 text-zinc-100 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        
        {/* Sparkles victory anim crown */}
        <div className="relative mb-4">
          <div className="absolute inset-0 animate-ping rounded-full bg-white/10"></div>
          <div className="w-20 h-20 rounded-full bg-white/20 text-white flex items-center justify-center text-4xl shadow-lg relative game-badge border border-white/30">
            👑
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-yellow-400 animate-pulse" />
        </div>

        <span className="text-[10px] tracking-[0.3em] text-yellow-400 uppercase font-black drop-shadow-[0_1px_2.5px_rgba(0,0,0,0.6)]">
          Champion of Zenith
        </span>
        <h2 className="text-2xl font-black text-white uppercase mt-1.5 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
          Campaign Cleared!
        </h2>
        <p className="text-[11px] text-zinc-200/90 max-w-sm mt-3 leading-relaxed font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          You have successfully conquered all 10 biomes, slayed the Lich Archangel, and restored light to the pixel kingdom! Your name is written in gold!
        </p>

        {/* Grand skin unlocked highlight */}
        <div className="w-full my-5 p-4 bg-white/10 border border-white/20 rounded-xl game-badge">
          <span className="text-[9px] text-yellow-400 uppercase tracking-widest font-extrabold block mb-1 animate-pulse drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">🔥 GRAND CHAMPION REWARD 🔥</span>
          <span className="text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">LEGENDARY GOLDEN HERO SKIN UNLOCKED!</span>
          <p className="text-[10px] text-zinc-300 mt-1 leading-snug font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Equip your shining cosmic gold armor in the main menu Wardrobe.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3.5 w-full mb-6 bg-black/35 p-4.5 rounded-xl border border-zinc-750 text-xs shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col items-center p-1 border-r border-zinc-700/20">
            <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Final Campaign Score</span>
            <span className="text-base font-black text-white mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]">{scoreAchieved}</span>
          </div>

          <div className="flex flex-col items-center p-1">
            <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Total Coins Collected</span>
            <span className="text-base font-black text-yellow-300 mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]">{totalCoins}</span>
          </div>
        </div>

        {/* Back to main menu */}
        <button
          onClick={onExit}
          className="w-full py-3.5 game-btn game-btn-amber text-white font-black text-xs uppercase tracking-wider flex justify-center items-center gap-2 cursor-pointer drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.4)]"
        >
          <Home className="w-4 h-4" /> Return to Citadel Menu
        </button>

      </div>
    </div>
  );
};

export default VictoryModal;
