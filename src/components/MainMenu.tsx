/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Shield, Award, Settings, BarChart2, BookOpen, Lock, Check, RotateCcw, Volume2, Sparkles, Heart } from 'lucide-react';
import { GameSettings, PlayerStats, LocalStats } from '../types';

interface MainMenuProps {
  maxUnlockedLevel: number;
  unlockedSkins: string[];
  activeSkin: string;
  totalCoins: number;
  localStats: LocalStats;
  settings: GameSettings;
  onStartLevel: (idx: number) => void;
  onSelectSkin: (skin: string) => void;
  onUpdateSettings: (settings: GameSettings) => void;
  onResetProgress: () => void;
}

type TabType = 'levels' | 'wardrobe' | 'achievements' | 'stats' | 'controls' | 'settings';

export const MainMenu: React.FC<MainMenuProps> = ({
  maxUnlockedLevel,
  unlockedSkins,
  activeSkin,
  totalCoins,
  localStats,
  settings,
  onStartLevel,
  onSelectSkin,
  onUpdateSettings,
  onResetProgress
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('levels');
  const [confirmReset, setConfirmReset] = useState(false);

  // Level biomes configurations
  const levelConfigs = [
    { name: 'Genesis Plains', theme: 'Tutorial', desc: 'Master gravity, jumps, wall kickoffs and basic mechanics' },
    { name: 'Whispering Woodlands', theme: 'Forest', desc: 'Navigate tall branches, tree bridges and fast flying bats' },
    { name: 'Echoing Caverns', theme: 'Cave', desc: 'Avoid hazardous spike pits and mine walls. Uncover hidden rooms' },
    { name: 'Frostbite Ridge', theme: 'Snow', desc: 'Slide on low-friction icy paths. Speed boosts are key' },
    { name: 'Peak of Trials', theme: 'Mountain', desc: 'Vertical platforms and trampoline bounce climbs' },
    { name: 'Obsidian Keep', theme: 'Castle', desc: 'Infiltrate stone castle corridors defended by fire monsters' },
    { name: 'Deep Crust Tunnels', theme: 'Underground', desc: 'Narrow crawlspaces, checkpoints and sliding escapes' },
    { name: 'Inferno Caldera', theme: 'Lava', desc: 'Extreme active lava lakes. High-density action jumps' },
    { name: 'Cloud Sanctuary', theme: 'Sky', desc: 'High-speed speed boosts and wide horizontal gap jumps' },
    { name: 'Zenith Sanctuary', theme: 'Final Boss', desc: 'Defeat the Archangel Demonic Lich in ultimate combat' }
  ];

  // Skin shop configurations
  const skinConfigs = [
    { id: 'default', name: 'Default Knight', desc: 'A classic blue-cloaked valiant pixel knight.', unlock: 'Unlocked by default', style: 'bg-blue-600 border-blue-400 text-blue-100' },
    { id: 'frost_ninja', name: 'Frost Ninja', desc: 'Master of glaciers. Glowing cyan cowl.', unlock: 'Unlock: Clear Level 4 (Snow)', style: 'bg-cyan-600 border-cyan-400 text-cyan-100' },
    { id: 'fire_knight', name: 'Fire Knight', desc: 'Forged in lava. Emits burning red glow.', unlock: 'Unlock: Clear Level 8 (Lava)', style: 'bg-orange-600 border-orange-400 text-orange-100' },
    { id: 'golden_hero', name: 'Golden Hero', desc: 'Ultimate cosmic armor. Golden sparkles.', unlock: 'Unlock: Beat Level 10 (Boss)', style: 'bg-yellow-500 border-yellow-300 text-yellow-950 font-bold' },
    { id: 'void_wanderer', name: 'Void Wanderer', desc: 'Corrupted by deep-space rifts. Emits mystical magenta and dark void sparks.', unlock: 'Unlock: Amass 300+ Total Coins!', style: 'bg-purple-900 border-purple-500 text-purple-200' }
  ];

  // Achievements cabinet
  const achievements = [
    { title: 'Genesis Plains Savior', desc: 'Completed Level 1 (Genesis Plains)', unlocked: maxUnlockedLevel > 1 },
    { title: 'Cave Explorer', desc: 'Completed Level 3 (Echoing Caverns)', unlocked: maxUnlockedLevel > 3 },
    { title: 'Icy Gladiator', desc: 'Completed Level 5 (Peak of Trials)', unlocked: maxUnlockedLevel > 5 },
    { title: 'Demon Slayer', desc: 'Completed Level 8 (Inferno Caldera)', unlocked: maxUnlockedLevel > 8 },
    { title: 'Archangel Conqueror', desc: 'Defeated Level 10 Final Boss!', unlocked: maxUnlockedLevel > 9 },
    { title: 'Gold Hoarder', desc: 'Amassed over 150 total coins', unlocked: localStats.totalCoinsCollected >= 150 },
    { title: 'Hard to Kill', desc: 'Suffered over 15 deaths in combat', unlocked: localStats.totalDeaths >= 15 },
    { title: 'High Jumper', desc: 'Executed over 200 jumps', unlocked: localStats.totalJumps >= 200 }
  ];

  const handleVolumeChange = (type: 'music' | 'sfx', val: number) => {
    onUpdateSettings({
      ...settings,
      [type === 'music' ? 'musicVolume' : 'sfxVolume']: val
    });
  };

  const handleQualityChange = (quality: 'low' | 'medium' | 'high') => {
    onUpdateSettings({
      ...settings,
      graphicsQuality: quality
    });
  };

  return (
    <div className="w-full max-w-5xl game-panel-dark p-6 md:p-8 font-mono text-zinc-100 select-none">
      {/* --- HERO BRAND HEADER --- */}
      <div className="relative bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-8 text-center border border-zinc-800 rounded-xl mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-yellow-950/40 border border-yellow-700/50 px-3 py-1 rounded-full text-yellow-400 text-xs font-bold game-badge">
          <Award className="w-4 h-4" />
          <span>High Score: {localStats.highScore.toString().padStart(6, '0')}</span>
        </div>

        {/* Dynamic Glowing Title */}
        <div className="flex flex-col items-center gap-1 mt-4">
          <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-emerald-400 animate-pulse">
            ★ Retro 2D Side-Scrolling Platformer ★
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-wider drop-shadow-lg uppercase py-1">
            Super Pixel Adventure
          </h1>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mt-2 leading-relaxed">
            Control your valiant knight, collect gems, unlock power-ups, defeat hostile monsters and storm the Zenith Sanctuary!
          </p>
        </div>
      </div>

      {/* --- NAVIGATION TABS BAR --- */}
      <div className="flex flex-wrap bg-black/50 p-2 gap-2 justify-center md:justify-start rounded-xl mb-6 border border-zinc-850">
        {[
          { id: 'levels', label: 'Select Level', icon: Play },
          { id: 'wardrobe', label: 'Wardrobe', icon: Shield },
          { id: 'achievements', label: 'Trophies', icon: Award },
          { id: 'stats', label: 'Records', icon: BarChart2 },
          { id: 'controls', label: 'Controls', icon: BookOpen },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setConfirmReset(false);
              }}
              className={`flex items-center gap-2 px-4.5 py-2.5 text-xs font-bold uppercase transition-all duration-200 cursor-pointer game-btn ${
                isActive
                  ? 'game-btn-emerald'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- ACTIVE TAB DISPLAY SHEET --- */}
      <div className="min-h-[380px] max-h-[480px] overflow-y-auto pr-1">
        
        {/* TAB 1: LEVELS SELECTION GRID */}
        {activeTab === 'levels' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest mb-4">Choose Your Biome</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {levelConfigs.map((lvl, index) => {
                const levelNum = index + 1;
                const isUnlocked = levelNum <= maxUnlockedLevel;

                return (
                  <button
                    key={index}
                    disabled={!isUnlocked}
                    onClick={() => onStartLevel(index)}
                    className={`relative text-left p-4.5 rounded-xl transition-all flex flex-col justify-between min-h-[120px] ${
                      isUnlocked
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-[0_6px_16px_rgba(0,0,0,0.6)] hover:scale-[1.03] hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-pointer'
                        : 'bg-zinc-950 border border-zinc-900 text-zinc-600 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="w-full">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">Lvl {levelNum}</span>
                        {!isUnlocked && <Lock className="w-3 h-3 text-zinc-600" />}
                      </div>
                      <h3 className={`text-xs font-extrabold leading-tight ${isUnlocked ? 'text-zinc-100' : 'text-zinc-600'}`}>
                        {lvl.name}
                      </h3>
                      <span className="text-[9px] font-bold text-emerald-500 mt-1 block uppercase tracking-wider">
                        {lvl.theme}
                      </span>
                    </div>

                    {isUnlocked && (
                      <span className="text-[9px] text-zinc-400 line-clamp-2 leading-relaxed mt-2.5">
                        {lvl.desc}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SKIN WARDROBE SHOP */}
        {activeTab === 'wardrobe' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-col gap-1 mb-6">
              <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">Knight Wardrobe</h2>
              <span className="text-[11px] text-zinc-400">Unlock custom armored skins by clearing difficult boss and environment biomes!</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skinConfigs.map(skin => {
                const isUnlocked = unlockedSkins.includes(skin.id);
                const isSelected = activeSkin === skin.id;

                return (
                  <div
                    key={skin.id}
                    className={`p-5 rounded-xl border transition-all flex items-start gap-4 ${
                      isSelected
                        ? 'bg-emerald-950/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                        : isUnlocked
                        ? 'bg-zinc-900 border-zinc-800 shadow-[0_6px_16px_rgba(0,0,0,0.5)] hover:border-zinc-700'
                        : 'bg-zinc-950 border-zinc-900 opacity-40'
                    }`}
                  >
                    {/* Skin Avatar Icon placeholder */}
                    <div className={`w-14 h-14 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.4)] ${skin.style}`}>
                      {skin.id === 'default' && <span className="text-xl">🛡️</span>}
                      {skin.id === 'frost_ninja' && <span className="text-xl">❄️</span>}
                      {skin.id === 'fire_knight' && <span className="text-xl">🔥</span>}
                      {skin.id === 'golden_hero' && <span className="text-xl">👑</span>}
                      {skin.id === 'void_wanderer' && <span className="text-xl">🌌</span>}
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-h-[56px]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-extrabold text-white">{skin.name}</h3>
                          {isSelected && (
                            <span className="text-[9px] font-bold bg-emerald-500/20 border border-emerald-500 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider game-badge">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">{skin.desc}</p>
                      </div>

                      <div className="mt-3 flex justify-between items-center border-t border-zinc-850/60 pt-3">
                        <span className="text-[9px] text-zinc-500 italic font-bold">{skin.unlock}</span>
                        {isUnlocked ? (
                          !isSelected && (
                            <button
                              onClick={() => onSelectSkin(skin.id)}
                              className="px-4 py-1.5 game-btn game-btn-zinc text-[10px] font-bold uppercase cursor-pointer"
                            >
                              Equip Skin
                            </button>
                          )
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TROPHIES CABINET */}
        {activeTab === 'achievements' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest mb-4">Achievements Cabinet</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {achievements.map((ach, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all flex items-center gap-4 ${
                    ach.unlocked
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-[0_4px_12px_rgba(0,0,0,0.4)]'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                    ach.unlocked 
                      ? 'bg-amber-950/20 border border-amber-600/50 text-amber-400 game-badge' 
                      : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                  }`}>
                    🏆
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold leading-tight">{ach.title}</h3>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: STATISTICS & LEADERBOARDS */}
        {activeTab === 'stats' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Counters */}
            <div>
              <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest mb-4">Adventure Stats</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 text-xs text-zinc-300 shadow-[0_6px_16px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between border-b border-zinc-850 pb-2">
                  <span>Grand High Score:</span>
                  <span className="font-bold text-sky-400">{localStats.highScore}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-850 pb-2">
                  <span>Gold Coins Collected:</span>
                  <span className="font-bold text-yellow-400">{totalCoins}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-850 pb-2">
                  <span>Monsters Defeated:</span>
                  <span className="font-bold text-red-400">{localStats.totalEnemiesDefeated}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-850 pb-2">
                  <span>Total Jumps Executed:</span>
                  <span className="font-bold text-teal-400">{localStats.totalJumps}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deaths in Combat:</span>
                  <span className="font-bold text-purple-400">{localStats.totalDeaths}</span>
                </div>
              </div>
            </div>

            {/* Speedrun clocks */}
            <div>
              <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest mb-4">Speedrun Best Times</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-h-[220px] overflow-y-auto flex flex-col gap-2.5 shadow-[0_6px_16px_rgba(0,0,0,0.5)]">
                {levelConfigs.map((lvl, idx) => {
                  const savedTime = localStats.speedrunTimes[idx];
                  return (
                    <div key={idx} className="flex justify-between text-[11px] text-zinc-400 border-b border-zinc-850 pb-1.5 last:border-0 last:pb-0">
                      <span>Lvl {idx + 1}: {lvl.theme}</span>
                      <span className="font-bold text-zinc-200">
                        {savedTime ? `${savedTime}s` : '--'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CONTROLS GUIDE */}
        {activeTab === 'controls' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest mb-4">Keyboard Mappings</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 text-xs text-zinc-300 shadow-[0_6px_16px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center">
                  <span>Walk Left / Right:</span>
                  <kbd className="px-2.5 py-1 bg-zinc-850 rounded-lg text-zinc-100 font-sans border border-zinc-750 shadow-[0_2px_4px_rgba(0,0,0,0.25)] font-bold">◀ / ▶ Keys</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>Jump / Fly:</span>
                  <kbd className="px-2.5 py-1 bg-zinc-850 rounded-lg text-zinc-100 font-sans border border-zinc-750 shadow-[0_2px_4px_rgba(0,0,0,0.25)] font-bold">Spacebar</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>Duck / Slide:</span>
                  <kbd className="px-2.5 py-1 bg-zinc-850 rounded-lg text-zinc-100 font-sans border border-zinc-750 shadow-[0_2px_4px_rgba(0,0,0,0.25)] font-bold">▼ Key</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>Sprint Modifier:</span>
                  <kbd className="px-2.5 py-1 bg-zinc-850 rounded-lg text-zinc-100 font-sans border border-zinc-750 shadow-[0_2px_4px_rgba(0,0,0,0.25)] font-bold">Left Shift</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>Attack / Shoot:</span>
                  <kbd className="px-2.5 py-1 bg-zinc-850 rounded-lg text-zinc-100 font-sans border border-zinc-750 shadow-[0_2px_4px_rgba(0,0,0,0.25)] font-bold">X Key</kbd>
                </div>
              </div>
            </div>

            {/* Mechanics overview */}
            <div className="flex flex-col gap-3.5 text-xs text-zinc-400 leading-relaxed">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">PRO TECHNIQUES</h3>
              <p>
                <strong className="text-emerald-400">Double Jump</strong>: Press Space in mid-air to execute an extra jump (replenishes on landing).
              </p>
              <p>
                <strong className="text-emerald-400">Wall Kick</strong>: Jump against any flat solid wall block, then press Space while hugging the wall to launch horizontally in the opposite direction.
              </p>
              <p>
                <strong className="text-emerald-400">Power Sliders</strong>: Press ▼ while running fast (Sprint + Direction) to slide under narrow tile segments.
              </p>
            </div>
          </div>
        )}

        {/* TAB 6: AUDIO & SYSTEM SETTINGS */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col gap-6">
            <div>
              <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest mb-4">Sound Options</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-5 max-w-md shadow-[0_6px_16px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-zinc-300 font-bold">
                    <span>Music Volume:</span>
                    <span>{Math.round(settings.musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.musicVolume}
                    onChange={(e) => handleVolumeChange('music', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-zinc-300 font-bold">
                    <span>SFX Volume:</span>
                    <span>{Math.round(settings.sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.sfxVolume}
                    onChange={(e) => handleVolumeChange('sfx', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Graphics Quality */}
            <div>
              <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest mb-3">Graphics Quality</h2>
              <div className="flex gap-2 max-w-sm">
                {(['low', 'medium', 'high'] as const).map((quality) => (
                  <button
                    key={quality}
                    onClick={() => handleQualityChange(quality)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                      settings.graphicsQuality === quality
                        ? 'game-btn-emerald'
                        : 'bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>

            {/* Retro CRT Filter Option */}
            <div>
              <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest mb-3">Retro CRT Filter</h2>
              <button
                onClick={() => onUpdateSettings({ ...settings, crtFilter: !settings.crtFilter })}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                  settings.crtFilter
                    ? 'game-btn-emerald text-white'
                    : 'bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {settings.crtFilter ? 'ENABLED (60Hz Scanlines)' : 'DISABLED (Flat Panel)'}
              </button>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-zinc-900 pt-5">
              <h2 className="text-xs font-extrabold text-red-500 uppercase tracking-widest mb-3 animate-pulse">Danger Zone</h2>
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="game-btn game-btn-red px-5 py-2.5 text-xs font-bold uppercase cursor-pointer"
                >
                  Reset All Game Progress
                </button>
              ) : (
                <div className="flex items-center gap-4 bg-red-950/20 border border-red-900/40 p-4.5 rounded-xl max-w-lg shadow-[0_8px_16px_rgba(0,0,0,0.4)]">
                  <div className="flex-1 text-xs text-red-200 leading-relaxed font-bold">
                    <strong>Are you absolutely sure?</strong> This will permanently erase all unlocked levels, saved statistics, record speedrun times, and custom unlocked skins. This action is irreversible.
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={onResetProgress}
                      className="game-btn game-btn-red px-3.5 py-2 text-[10px] font-black uppercase cursor-pointer"
                    >
                      Yes, Wipe Save
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="game-btn game-btn-zinc px-3.5 py-2 text-[10px] font-bold uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MainMenu;
