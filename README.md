# Super Pixel Adventure

A high-quality 2D side-scrolling platformer built with React, TypeScript, and Vite — featuring custom physics, particle and weather effects, enemy AI, power-ups, a synthesized audio engine, and local progress saving across 10 levels.

## Features

- Custom physics engine (`src/game/physics.ts`)
- Enemy AI (`src/game/enemy.ts`)
- Particle & weather effects (`src/game/particles.ts`)
- Procedural/synthesized audio, no external sound files (`src/game/audio.ts`)
- 10 playable levels (`src/game/level.ts`)
- Local save/progress tracking
- Main menu, HUD, level-complete, victory, and game-over screens

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS
- Optional Gemini API integration (`@google/genai`)

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. (Optional) If using Gemini API features, set `GEMINI_API_KEY` in a `.env.local` file — see `.env.example` for the format.
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

```
src/
  components/   # UI: MainMenu, GameHUD, modals
  game/         # Engine: physics, enemy, particles, audio, level, player
  App.tsx
  main.tsx
```
