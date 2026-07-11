/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Maximize, Play, Award, RotateCcw } from 'lucide-react';
import { game } from './game/GameEngine';
import { audio } from './game/audio';
import { MainMenu } from './components/MainMenu';
import { GameHUD } from './components/GameHUD';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { PlayerStats, GameSettings } from './types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // React-synchronized game states
  const [gameState, setGameState] = useState<string>('menu');
  const [playerStats, setPlayerStats] = useState<PlayerStats>(game.playerStats);
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [speedrunTime, setSpeedrunTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [settings, setSettings] = useState<GameSettings>(game.settings);

  // Stats from level complete transitions
  const [levelCompleteStats, setLevelCompleteStats] = useState({
    levelNum: 1,
    levelName: '',
    coins: 0,
    score: 0,
    time: 0
  });

  // Track state listeners
  useEffect(() => {
    // 1. Attach Canvas element
    if (canvasRef.current) {
      game.attachCanvas(canvasRef.current);
    }

    // 2. Register State sync listeners
    game.registerStateListener((state) => {
      setGameState(state);
      
      // Cache values upon completion of a level to draw inside modals safely
      if (state === 'levelcomplete' || state === 'victory') {
        setLevelCompleteStats({
          levelNum: game.currentLevelIndex + 1,
          levelName: game.level?.name || 'Super Adventure',
          coins: game.playerStats.coins,
          score: game.playerStats.score,
          time: Math.floor(game.levelTime / 1000)
        });
      }
    });

    game.registerStatsListener((stats, levelIdx, time) => {
      setPlayerStats(stats);
      setCurrentLevelIdx(levelIdx);
      setSpeedrunTime(time);
    });

    // Load initial settings
    setIsMuted(audio.getMutedState());
    setSettings({ ...game.settings });

    // Play menu music on mount
    audio.playMusic('menu');

    return () => {
      audio.stopMusic();
    };
  }, []);

  // Handle key triggers or tactile inputs from mobile panel
  const handleTouchStart = (key: string) => {
    if (key === 'left') game.keysPressed.left = true;
    if (key === 'right') game.keysPressed.right = true;
    if (key === 'jump') game.keysPressed.jump = true;
    if (key === 'down') game.keysPressed.down = true;
    if (key === 'sprint') game.keysPressed.sprint = true;
    if (key === 'attack') game.keysPressed.attack = true;
  };

  const handleTouchEnd = (key: string) => {
    if (key === 'left') game.keysPressed.left = false;
    if (key === 'right') game.keysPressed.right = false;
    if (key === 'jump') game.keysPressed.jump = false;
    if (key === 'down') game.keysPressed.down = false;
    if (key === 'sprint') game.keysPressed.sprint = false;
    if (key === 'attack') game.keysPressed.attack = false;
  };

  // --- ACTIONS COUPLERS ---
  const handleStartLevel = (idx: number) => {
    // Resume context if browser suspended
    audio.playSfx('click' as any); // initializes context
    game.startLevel(idx);
  };

  const handleSelectSkin = (skin: string) => {
    game.selectSkin(skin);
    setPlayerStats({ ...game.playerStats });
  };

  const handleUpdateSettings = (updated: GameSettings) => {
    game.settings = updated;
    setSettings(updated);
    audio.setMusicVolume(updated.musicVolume);
    audio.setSfxVolume(updated.sfxVolume);
    game.saveGame();
  };

  const handlePauseToggle = () => {
    if (gameState === 'playing') {
      game.state = 'paused';
      setGameState('paused');
    } else if (gameState === 'paused') {
      game.state = 'playing';
      setGameState('playing');
      game.gameLoop(); // Resume loops
    }
  };

  const handleRestartLevel = () => {
    game.startLevel(game.currentLevelIndex);
  };

  const handleNextLevel = () => {
    game.startLevel(game.currentLevelIndex + 1);
  };

  const handleExitToMenu = () => {
    game.changeState('menu');
  };

  const handleToggleMute = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleResetProgress = () => {
    game.resetProgress();
    setPlayerStats({ ...game.playerStats });
    setSettings({ ...game.settings });
    setCurrentLevelIdx(0);
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-zinc-900 overflow-hidden relative">
      
      {/* 1. BACKGROUND AMBIENT PARALLAX CANVAS SCREEN (playing active loop) */}
      <div className={`w-full h-full relative ${gameState === 'menu' ? 'hidden' : 'block'} ${settings.crtFilter ? 'phosphor-glow' : ''}`}>
        <canvas
          id="gameCanvas"
          ref={canvasRef}
          className="w-full h-full block bg-black cursor-crosshair"
        />

        {/* Retro CRT overlays if toggled */}
        {settings.crtFilter && <div className="crt-screen-overlay" />}
        {settings.crtFilter && <div className="crt-glass-glare" />}

        {/* HUD Layer Overlay */}
        <GameHUD
          stats={playerStats}
          levelName={game.level?.name || 'Super Adventure'}
          speedrunTime={speedrunTime}
          isPaused={gameState === 'paused'}
          onPauseToggle={handlePauseToggle}
          onRestart={handleRestartLevel}
          onExit={handleExitToMenu}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* 2. MAIN MENU tab controller (layered above) */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 z-40 overflow-y-auto">
          {/* Quick floaty particles on main menu background for chiptune aesthetic */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <MainMenu
            maxUnlockedLevel={game.maxUnlockedLevel}
            unlockedSkins={playerStats.unlockedSkins}
            activeSkin={playerStats.activeSkin}
            totalCoins={game.totalCoins}
            localStats={game.localStats}
            settings={settings}
            onStartLevel={handleStartLevel}
            onSelectSkin={handleSelectSkin}
            onUpdateSettings={handleUpdateSettings}
            onResetProgress={handleResetProgress}
          />
        </div>
      )}

      {/* 3. LEVEL COMPLETE TRANSITION POPUP */}
      {gameState === 'levelcomplete' && (
        <LevelCompleteModal
          levelNum={levelCompleteStats.levelNum}
          levelName={levelCompleteStats.levelName}
          coinsCollected={levelCompleteStats.coins}
          scoreAchieved={levelCompleteStats.score}
          speedrunSeconds={levelCompleteStats.time}
          bestSeconds={game.localStats.speedrunTimes[game.currentLevelIndex]}
          onNextLevel={handleNextLevel}
          onRestartLevel={handleRestartLevel}
          onExit={handleExitToMenu}
        />
      )}

      {/* 4. GAME OVER DIALOG */}
      {gameState === 'gameover' && (
        <GameOverModal
          levelName={game.level?.name || 'Super Adventure'}
          coinsCollected={playerStats.coins}
          scoreAchieved={playerStats.score}
          onRestartLevel={handleRestartLevel}
          onExit={handleExitToMenu}
        />
      )}

      {/* 5. CAMPAIGN CLEARED CONGRATULATIONS */}
      {gameState === 'victory' && (
        <VictoryModal
          scoreAchieved={levelCompleteStats.score}
          totalCoins={game.totalCoins}
          onExit={handleExitToMenu}
        />
      )}

    </div>
  );
}
