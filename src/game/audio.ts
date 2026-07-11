/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.6;
  private masterMusicGain: GainNode | null = null;
  private masterSfxGain: GainNode | null = null;
  private currentTrack: string | null = null;
  private sequencerTimer: number | null = null;
  private seqStep: number = 0;
  private isMuted: boolean = false;

  // Melody data for chiptunes
  // Note frequencies: C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88
  // C5=523.25, D5=587.33, E5=659.25, F5=698.46, G5=783.99, A5=880.00, B5=987.77, C6=1046.50
  private scales: Record<string, number[]> = {
    major: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 783.99, 880.00],
    minor: [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25],
    lento: [196.00, 220.00, 233.08, 261.63, 293.66, 311.13, 349.23, 392.00, 440.00],
    boss: [146.83, 155.56, 174.61, 196.00, 207.65, 233.08, 246.94, 293.66, 311.13, 392.00]
  };

  private tracks: Record<string, { scale: string; melody: number[]; bass: number[]; tempo: number }> = {
    menu: {
      scale: 'major',
      tempo: 140,
      melody: [
        0, 2, 4, 7,  4, 7, 9, 7,
        0, 2, 4, 7,  4, 2, 0, -1,
        2, 4, 5, 9,  5, 9, 11, 9,
        7, 9, 7, 4,  2, 4, 2, 0
      ],
      bass: [
        0, 0, 4, 4,  0, 0, 7, 7,
        0, 0, 4, 4,  2, 2, 0, 0,
        2, 2, 5, 5,  2, 2, 5, 5,
        4, 4, 4, 4,  2, 2, 0, 0
      ]
    },
    forest: {
      scale: 'major',
      tempo: 155,
      melody: [
        4, 4, 7, 4,  9, 7, 4, 2,
        0, 0, 2, 4,  2, 0, 2, -1,
        4, 4, 7, 4,  11, 9, 7, 9,
        11, 9, 7, 4, 7, 9, 11, -1
      ],
      bass: [
        0, 0, 0, 0,  4, 4, 4, 4,
        2, 2, 2, 2,  7, 7, 7, 7,
        0, 0, 0, 0,  4, 4, 4, 4,
        5, 5, 5, 5,  2, 2, 7, 7
      ]
    },
    cave: {
      scale: 'minor',
      tempo: 100,
      melody: [
        0, 2, 3, 5,  6, 5, 3, 2,
        0, -1, 3, -1, 2, -1, 0, -1,
        0, 3, 5, 7,  8, 7, 5, 3,
        2, -1, 5, -1, 3, 2, 0, -1
      ],
      bass: [
        0, 0, 0, 0,  3, 3, 3, 3,
        2, 2, 2, 2,  0, 0, 0, 0,
        0, 0, 0, 0,  5, 5, 5, 5,
        4, 4, 4, 4,  0, 0, 0, 0
      ]
    },
    castle: {
      scale: 'lento',
      tempo: 120,
      melody: [
        0, 3, 2, 0,  5, 4, 3, 0,
        6, 5, 4, 3,  2, 1, 0, -1,
        0, 3, 2, 0,  7, 6, 5, 3,
        8, 7, 6, 5,  4, 3, 2, 0
      ],
      bass: [
        0, 0, 0, 0,  3, 3, 3, 3,
        1, 1, 1, 1,  0, 0, 0, 0,
        0, 0, 0, 0,  5, 5, 5, 5,
        2, 2, 2, 2,  0, 0, 0, 0
      ]
    },
    boss: {
      scale: 'boss',
      tempo: 165,
      melody: [
        0, 1, 3, 4,  3, 4, 6, 4,
        3, 1, 0, 1,  3, 4, 3, -1,
        1, 2, 4, 5,  4, 5, 7, 5,
        4, 2, 1, 2,  4, 5, 4, -1
      ],
      bass: [
        0, 0, 0, 0,  3, 3, 3, 3,
        1, 1, 1, 1,  4, 4, 4, 4,
        0, 0, 0, 0,  3, 3, 3, 3,
        1, 1, 1, 1,  0, 0, 0, 0
      ]
    },
    ending: {
      scale: 'major',
      tempo: 110,
      melody: [
        7, 9, 11, 12, 14, 12, 11, 9,
        7, 7, 9, 11,  9, 7, 9, -1,
        7, 9, 11, 12, 14, 12, 11, 9,
        11, 12, 14, 11, 12, -1, -1, -1
      ],
      bass: [
        0, 0, 4, 4,  5, 5, 0, 0,
        2, 2, 4, 4,  5, 5, 7, 7,
        0, 0, 4, 4,  5, 5, 0, 0,
        4, 4, 5, 5,  0, 0, 0, 0
      ]
    }
  };

  constructor() {
    // Audio context will be lazy-initialized on user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterMusicGain = this.ctx.createGain();
      this.masterMusicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.masterMusicGain.connect(this.ctx.destination);

      this.masterSfxGain = this.ctx.createGain();
      this.masterSfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.masterSfxGain.connect(this.ctx.destination);
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.masterMusicGain && this.ctx) {
      this.masterMusicGain.gain.setValueAtTime(this.isMuted ? 0 : this.musicVolume, this.ctx.currentTime);
    }
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.masterSfxGain && this.ctx) {
      this.masterSfxGain.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVolume, this.ctx.currentTime);
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ctx) {
      const curTime = this.ctx.currentTime;
      if (this.masterMusicGain) {
        this.masterMusicGain.gain.setValueAtTime(this.isMuted ? 0 : this.musicVolume, curTime);
      }
      if (this.masterSfxGain) {
        this.masterSfxGain.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVolume, curTime);
      }
    }
    return this.isMuted;
  }

  public getMutedState() {
    return this.isMuted;
  }

  // --- PLAY PROCEDURAL CHIPTUNE MUSIC ---
  public playMusic(trackName: string | null) {
    this.init();
    if (!this.ctx) return;

    if (this.currentTrack === trackName) return;

    // Stop current sequencer
    this.stopMusic();

    if (!trackName || !this.tracks[trackName]) {
      this.currentTrack = null;
      return;
    }

    this.currentTrack = trackName;
    const track = this.tracks[trackName];
    const scale = this.scales[track.scale];
    this.seqStep = 0;

    const interval = (60 / track.tempo) * 0.5 * 1000; // eighth notes

    const runSequencer = () => {
      if (!this.ctx || this.currentTrack !== trackName || this.isMuted) return;

      const time = this.ctx.currentTime;
      const melodyIndex = this.seqStep % track.melody.length;
      const bassIndex = this.seqStep % track.bass.length;

      const melodyNote = track.melody[melodyIndex];
      const bassNote = track.bass[bassIndex];

      // Play melody (Pulse / Triangle wave)
      if (melodyNote >= 0 && scale[melodyNote]) {
        this.playMelodyNote(scale[melodyNote], 0.12, time);
      }

      // Play bass (Triangle wave, lower octave)
      if (bassNote >= 0 && scale[bassNote]) {
        // Drop bass note by 1 or 2 octaves
        const bassFreq = scale[bassNote] * 0.25;
        this.playBassNote(bassFreq, 0.22, time);
      }

      // Occasional retro noise drum beat
      if (trackName !== 'cave') {
        if (this.seqStep % 4 === 0) {
          this.playNoiseDrum(0.1, time, true); // kick-ish
        } else if (this.seqStep % 4 === 2) {
          this.playNoiseDrum(0.04, time, false); // snare-ish
        }
      }

      this.seqStep++;
      this.sequencerTimer = window.setTimeout(runSequencer, interval);
    };

    // Make sure audio context is running (resume if suspended by browser)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => runSequencer());
    } else {
      runSequencer();
    }
  }

  public stopMusic() {
    if (this.sequencerTimer) {
      clearTimeout(this.sequencerTimer);
      this.sequencerTimer = null;
    }
    this.currentTrack = null;
  }

  private playMelodyNote(freq: number, duration: number, startTime: number) {
    if (!this.ctx || !this.masterMusicGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Retro square wave (duty cycles can be simulated, square is classic NES pulse)
    osc.type = Math.random() > 0.4 ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.12, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterMusicGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private playBassNote(freq: number, duration: number, startTime: number) {
    if (!this.ctx || !this.masterMusicGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle'; // Low bass is usually triangle for clean tone
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterMusicGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private playNoiseDrum(vol: number, startTime: number, isKick: boolean) {
    if (!this.ctx || !this.masterMusicGain) return;

    const bufferSize = this.ctx.sampleRate * 0.1; // 100ms noise buffer
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isKick ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(isKick ? 150 : 1000, startTime);
    if (isKick) {
      filter.Q.setValueAtTime(2.0, startTime);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + (isKick ? 0.08 : 0.05));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterMusicGain);

    noise.start(startTime);
    noise.stop(startTime + 0.1);
  }

  // --- PLAY RETRO SFX ---
  public playSfx(type: 'jump' | 'coin' | 'hit' | 'explosion' | 'powerup' | 'victory' | 'gameover' | 'laser' | 'slash' | 'checkpoint' | 'shield_break') {
    this.init();
    if (!this.ctx || !this.masterSfxGain || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const time = this.ctx.currentTime;

    switch (type) {
      case 'jump': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        // Classic frequency sweep upwards
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(450, time + 0.12);

        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

        osc.connect(gain);
        gain.connect(this.masterSfxGain);

        osc.start(time);
        osc.stop(time + 0.12);
        break;
      }

      case 'coin': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // Quick 2-note ding (arpeggio)
        osc.frequency.setValueAtTime(987.77, time); // B5
        osc.frequency.setValueAtTime(1318.51, time + 0.07); // E6

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.connect(gain);
        gain.connect(this.masterSfxGain);

        osc.start(time);
        osc.stop(time + 0.3);
        break;
      }

      case 'hit': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        // Downward buzz
        osc.frequency.setValueAtTime(300, time);
        osc.frequency.linearRampToValueAtTime(60, time + 0.1);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        osc.connect(gain);
        gain.connect(this.masterSfxGain);

        osc.start(time);
        osc.stop(time + 0.1);
        break;
      }

      case 'explosion': {
        // Noise + Low frequency sine sweep
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, time);
        filter.frequency.exponentialRampToValueAtTime(20, time + 0.35);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterSfxGain);

        noise.start(time);
        noise.stop(time + 0.4);

        // Sub blast
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, time);
        osc.frequency.linearRampToValueAtTime(10, time + 0.3);
        oscGain.gain.setValueAtTime(0.4, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.connect(oscGain);
        oscGain.connect(this.masterSfxGain);
        osc.start(time);
        osc.stop(time + 0.3);
        break;
      }

      case 'powerup': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        // Rapid arpeggio rising
        const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((freq, idx) => {
          osc.frequency.setValueAtTime(freq, time + idx * 0.04);
        });

        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.32);

        osc.connect(gain);
        gain.connect(this.masterSfxGain);

        osc.start(time);
        osc.stop(time + 0.35);
        break;
      }

      case 'checkpoint': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const freqs = [440, 554, 659, 880];
        freqs.forEach((freq, idx) => {
          osc.frequency.setValueAtTime(freq, time + idx * 0.05);
        });

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

        osc.connect(gain);
        gain.connect(this.masterSfxGain);

        osc.start(time);
        osc.stop(time + 0.28);
        break;
      }

      case 'laser': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.exponentialRampToValueAtTime(150, time + 0.15);

        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.connect(gain);
        gain.connect(this.masterSfxGain);

        osc.start(time);
        osc.stop(time + 0.15);
        break;
      }

      case 'slash': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, time);
        osc.frequency.exponentialRampToValueAtTime(200, time + 0.08);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

        osc.connect(gain);
        gain.connect(this.masterSfxGain);

        osc.start(time);
        osc.stop(time + 0.08);
        break;
      }

      case 'shield_break': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(400, time);
        osc.frequency.linearRampToValueAtTime(100, time + 0.2);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.connect(gain);
        gain.connect(this.masterSfxGain);

        osc.start(time);
        osc.stop(time + 0.2);
        break;
      }

      case 'victory': {
        this.stopMusic();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        // Fanfare
        const melody = [523.25, 523.25, 523.25, 523.25, 659.25, 587.33, 523.25, 659.25, 783.99];
        const times = [0, 0.1, 0.2, 0.3, 0.45, 0.55, 0.65, 0.75, 0.9];
        const durs = [0.08, 0.08, 0.08, 0.12, 0.1, 0.1, 0.1, 0.12, 0.5];

        melody.forEach((f, i) => {
          osc.frequency.setValueAtTime(f, time + times[i]);
        });

        gain.gain.setValueAtTime(0.25, time);
        times.forEach((t, i) => {
          gain.gain.setValueAtTime(0.25, time + t);
          gain.gain.exponentialRampToValueAtTime(0.001, time + t + durs[i]);
        });

        osc.connect(gain);
        gain.connect(this.masterSfxGain);

        osc.start(time);
        osc.stop(time + 1.5);
        break;
      }

      case 'gameover': {
        this.stopMusic();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        // Desolate descending sad chord
        const melody = [392.00, 349.23, 311.13, 293.66, 220.00];
        const times = [0, 0.2, 0.4, 0.6, 0.8];
        const durs = [0.18, 0.18, 0.18, 0.18, 0.8];

        melody.forEach((f, i) => {
          osc.frequency.setValueAtTime(f, time + times[i]);
        });

        gain.gain.setValueAtTime(0.22, time);
        times.forEach((t, i) => {
          gain.gain.setValueAtTime(0.22, time + t);
          gain.gain.exponentialRampToValueAtTime(0.001, time + t + durs[i]);
        });

        osc.connect(gain);
        gain.connect(this.masterSfxGain);

        osc.start(time);
        osc.stop(time + 1.8);
        break;
      }
    }
  }
}

export const audio = new RetroAudioEngine();
export default audio;
