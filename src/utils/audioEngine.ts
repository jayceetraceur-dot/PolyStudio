// Procedural Ambient Low-Poly Audio Soundscape Engine using the Web Audio API.
// Generates real-time soundscapes based on active biomes and day/night state.

export class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private isInitialized = false;

  // Synthesis nodes
  private masterGain: GainNode | null = null;

  // Wind synthesiser (Lowpass filtered white noise modulated by a random/LFO swing)
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  // Leaves rustling synthesiser (Highpass/Bandpass filtered crackling noise bursts)
  private rustleSource: AudioBufferSourceNode | null = null;
  private rustleFilter: BiquadFilterNode | null = null;
  private rustleGain: GainNode | null = null;

  // Waves/Water lapping synthesiser (Surging lowpass noise modulated by a slow wave LFO)
  private waveSource: AudioBufferSourceNode | null = null;
  private waveFilter: BiquadFilterNode | null = null;
  private waveGain: GainNode | null = null;

  // Crickets chirp synthesiser (High frequency oscillators modulated by high-rate pulse trains)
  private cricketOsc1: OscillatorNode | null = null;
  private cricketOsc2: OscillatorNode | null = null;
  private cricketGain: GainNode | null = null;
  private cricketModulator: GainNode | null = null;

  // Mix gains for individual channels
  private channelWind: GainNode | null = null;
  private channelRustle: GainNode | null = null;
  private channelWave: GainNode | null = null;
  private channelCricket: GainNode | null = null;

  // Current fade states
  private targetWindVol = 0.15;
  private targetRustleVol = 0.0;
  private targetWaveVol = 0.0;
  private targetCricketVol = 0.0;

  // State monitoring
  private currentBiome = 'grassland';
  private currentIsNight = false;
  private soundInterval: any = null;

  constructor() {
    // Lazy initialisation to comply with startup and auto-play guidelines
  }

  public init() {
    if (this.isInitialized) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();
      this.noiseBuffer = this.createNoiseBuffer(this.ctx, 3.0);

      // Create Master Output Bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Create Channel Gains
      this.channelWind = this.ctx.createGain();
      this.channelRustle = this.ctx.createGain();
      this.channelWave = this.ctx.createGain();
      this.channelCricket = this.ctx.createGain();

      this.channelWind.connect(this.masterGain);
      this.channelRustle.connect(this.masterGain);
      this.channelWave.connect(this.masterGain);
      this.channelCricket.connect(this.masterGain);

      // Set baseline volumes
      this.channelWind.gain.setValueAtTime(0.12, this.ctx.currentTime);
      this.channelRustle.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.channelWave.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.channelCricket.gain.setValueAtTime(0.0, this.ctx.currentTime);

      // Start Synthesis Subsystems
      this.setupWindSynth();
      this.setupRustleSynth();
      this.setupWaveSynth();
      this.setupCricketSynth();

      // Master fade-in
      this.masterGain.gain.linearRampToValueAtTime(0.65, this.ctx.currentTime + 2.0);

      this.isInitialized = true;

      // Start periodic LFO/modulation updates
      this.startModulationLoop();
    } catch (e) {
      console.error('Failed to initialize Soundscape Engine:', e);
    }
  }

  private createNoiseBuffer(ctx: AudioContext, secs: number): AudioBuffer {
    const size = ctx.sampleRate * secs;
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private setupWindSynth() {
    if (!this.ctx || !this.noiseBuffer || !this.channelWind) return;

    // Loopable noise source
    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = this.noiseBuffer;
    this.windSource.loop = true;

    // Cozy Lowpass filter to emulate rushing/blowing wind
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

    // Chain
    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.channelWind);

    this.windSource.start(0);
  }

  private setupRustleSynth() {
    if (!this.ctx || !this.noiseBuffer || !this.channelRustle) return;

    this.rustleSource = this.ctx.createBufferSource();
    this.rustleSource.buffer = this.noiseBuffer;
    this.rustleSource.loop = true;

    // Bandpass filter centered around leaf rustling frequencies
    this.rustleFilter = this.ctx.createBiquadFilter();
    this.rustleFilter.type = 'bandpass';
    this.rustleFilter.frequency.setValueAtTime(4500, this.ctx.currentTime);
    this.rustleFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.rustleGain = this.ctx.createGain();
    this.rustleGain.gain.setValueAtTime(0.1, this.ctx.currentTime);

    this.rustleSource.connect(this.rustleFilter);
    this.rustleFilter.connect(this.rustleGain);
    this.rustleGain.connect(this.channelRustle);

    this.rustleSource.start(0);
  }

  private setupWaveSynth() {
    if (!this.ctx || !this.noiseBuffer || !this.channelWave) return;

    this.waveSource = this.ctx.createBufferSource();
    this.waveSource.buffer = this.noiseBuffer;
    this.waveSource.loop = true;

    // Lowpass filter for muffled sea water rumbling and crashing
    this.waveFilter = this.ctx.createBiquadFilter();
    this.waveFilter.type = 'lowpass';
    this.waveFilter.frequency.setValueAtTime(550, this.ctx.currentTime);
    this.waveFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.waveGain = this.ctx.createGain();
    this.waveGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    this.waveSource.connect(this.waveFilter);
    this.waveFilter.connect(this.waveGain);
    this.waveGain.connect(this.channelWave);

    this.waveSource.start(0);
  }

  private setupCricketSynth() {
    if (!this.ctx || !this.channelCricket) return;

    // High pitched chirping oscillators detuned slightly to sound natural
    this.cricketOsc1 = this.ctx.createOscillator();
    this.cricketOsc2 = this.ctx.createOscillator();

    this.cricketOsc1.type = 'sine';
    this.cricketOsc1.frequency.setValueAtTime(3950, this.ctx.currentTime); // high pitch

    this.cricketOsc2.type = 'sine';
    this.cricketOsc2.frequency.setValueAtTime(4020, this.ctx.currentTime); // slightly detuned

    // Gains
    this.cricketModulator = this.ctx.createGain();
    this.cricketModulator.gain.setValueAtTime(0.001, this.ctx.currentTime);

    // Route both through modulator
    this.cricketOsc1.connect(this.cricketModulator);
    this.cricketOsc2.connect(this.cricketModulator);

    this.cricketGain = this.ctx.createGain();
    this.cricketGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    this.cricketModulator.connect(this.cricketGain);
    this.cricketGain.connect(this.channelCricket);

    this.cricketOsc1.start(0);
    this.cricketOsc2.start(0);
  }

  private startModulationLoop() {
    if (this.soundInterval) clearInterval(this.soundInterval);

    let timeTicker = 0;

    this.soundInterval = setInterval(() => {
      if (!this.ctx || !this.isInitialized) return;

      const t = this.ctx.currentTime;
      timeTicker += 0.1;

      // 1. Wind Gust LFO (Cutoff sweeps slowly from 150 to 550 Hz, volume peaks)
      if (this.windFilter && this.windGain) {
        const gustFactor = Math.sin(timeTicker * 0.4) * Math.cos(timeTicker * 0.15);
        const cutoff = 300 + gustFactor * 160;
        this.windFilter.frequency.setValueAtTime(cutoff, t);

        const windVolume = 0.4 + (gustFactor > 0 ? gustFactor * 0.35 : gustFactor * 0.15);
        this.windGain.gain.setValueAtTime(Math.max(0.15, windVolume), t);
      }

      // 2. Rustling Leaves Crackles (Modulate leaves volume rapidly to simulate rustling random brush)
      if (this.rustleGain && this.channelRustle) {
        const leafWind = Math.sin(timeTicker * 0.6) * 0.5 + 0.5; // slow gust factor
        const microRustle = (Math.random() * Math.random()) * leafWind * 0.9;
        this.rustleGain.gain.setValueAtTime(0.02 + microRustle * 0.25, t);
      }

      // 3. Ocean Waves surging lapping (Swells of crashing water with a 4.5 second cycle)
      if (this.waveGain && this.waveFilter) {
        const waveLFO = Math.sin(timeTicker * 1.4) * 0.5 + 0.5; // wave period swell
        const oceanSwell = 0.05 + Math.pow(waveLFO, 2) * 0.45;
        this.waveGain.gain.setValueAtTime(oceanSwell, t);
        
        // Also ocean cutoff surges down as waves wash up, and expands
        this.waveFilter.frequency.setValueAtTime(280 + waveLFO * 250, t);
      }

      // 4. Crickets High Rate Chirp (Rhythmic chirps of crickets, active mostly at night or dry deserts)
      if (this.cricketModulator) {
        // Crickets chirp in burst packets: chirp chirp chirp pause
        const periodSeconds = 1.3;
        const phase = timeTicker % periodSeconds;
        let activeChirp = 0.0;

        if (phase < 0.6) {
          // rapid chirping phase (pulse at 10Hz)
          const miniPhase = (phase * 10) % 1.0;
          if (miniPhase < 0.4) {
            activeChirp = 0.02; // chirping buzz level
          }
        }
        
        this.cricketModulator.gain.setValueAtTime(activeChirp, t);
      }
    }, 100);
  }

  /**
   * Smoothly transitions soundscapes when camera biome or time shifts
   */
  public updateAmbientZone(biome: string, isNight: boolean) {
    this.currentBiome = biome;
    this.currentIsNight = isNight;

    if (!this.ctx || !this.isInitialized) return;

    // Match biome mix settings
    switch (biome) {
      case 'water':
        this.targetWindVol = 0.05;
        this.targetRustleVol = 0.0;
        this.targetWaveVol = 0.70; // intense roaring waves
        this.targetCricketVol = isNight ? 0.08 : 0.0;
        break;

      case 'beach':
        this.targetWindVol = 0.15;
        this.targetRustleVol = 0.05;
        this.targetWaveVol = 0.45; // pleasant lapping
        this.targetCricketVol = isNight ? 0.35 : 0.0;
        break;

      case 'desert':
        this.targetWindVol = 0.35; // high whistling wind
        this.targetRustleVol = 0.0;
        this.targetWaveVol = 0.0;
        this.targetCricketVol = isNight ? 0.45 : 0.02; // very hot cicadas/crickets
        break;

      case 'forest':
        this.targetWindVol = 0.12;
        this.targetRustleVol = 0.60; // rich rustling leaves
        this.targetWaveVol = 0.0;
        this.targetCricketVol = isNight ? 0.55 : 0.08; // forest crickets
        break;

      case 'rocky':
        this.targetWindVol = 0.65; // heavy gusty mountain winds
        this.targetRustleVol = 0.05;
        this.targetWaveVol = 0.0;
        this.targetCricketVol = isNight ? 0.15 : 0.0;
        break;

      case 'grassland':
      default:
        this.targetWindVol = 0.22; // pleasant breeze
        this.targetRustleVol = 0.15; // occasional grass brush
        this.targetWaveVol = 0.02; // faint distant murmur
        this.targetCricketVol = isNight ? 0.40 : 0.05;
        break;
    }

    // Apply linear ramp to transition channels smoothly over 1.8 seconds (prevents sharp pops)
    const t = this.ctx.currentTime;
    const fadeDur = 1.8;

    if (this.channelWind) {
      this.channelWind.gain.linearRampToValueAtTime(this.targetWindVol, t + fadeDur);
    }
    if (this.channelRustle) {
      this.channelRustle.gain.linearRampToValueAtTime(this.targetRustleVol, t + fadeDur);
    }
    if (this.channelWave) {
      this.channelWave.gain.linearRampToValueAtTime(this.targetWaveVol, t + fadeDur);
    }
    if (this.channelCricket) {
      this.channelCricket.gain.linearRampToValueAtTime(this.targetCricketVol, t + fadeDur);
    }
  }

  /**
   * Play a point-source spatial sound effect with distance falloff relative to the camera center
   * (or directly if coordinates aren't provided).
   */
  public playSpatialSound(
    type: 'animal_cry' | 'alien_chirp' | 'storm_rumble' | 'villager_chat' | 'villager_work' | 'spore_spit',
    x?: number,
    z?: number,
    camX?: number,
    camZ?: number
  ) {
    if (!this.ctx || !this.isInitialized || this.ctx.state === 'suspended') return;

    const t = this.ctx.currentTime;
    
    // 1. Calculate distance-based volume falloff
    let volume = 0.5;
    if (x !== undefined && z !== undefined && camX !== undefined && camZ !== undefined) {
      const dist = Math.hypot(x - camX, z - camZ);
      // Falloff curve: 1.0 at distance 0, dropping to 0.0 at distance 16
      volume = Math.max(0.001, 1.0 - (dist / 16.0));
      if (volume <= 0.01) return; // Silent, don't waste CPU!
    }

    // 2. Synthesize custom procedural sounds based on requested types
    try {
      const pOsc = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();
      
      pOsc.connect(pGain);
      pGain.connect(this.masterGain || this.ctx.destination);

      if (type === 'animal_cry') {
        // Alien wolf/beast growl + whistle (FM synthesis)
        pOsc.type = 'sawtooth';
        pOsc.frequency.setValueAtTime(140, t);
        pOsc.frequency.exponentialRampToValueAtTime(320, t + 0.12);
        pOsc.frequency.exponentialRampToValueAtTime(80, t + 0.45);

        pGain.gain.setValueAtTime(0.001, t);
        pGain.gain.linearRampToValueAtTime(0.18 * volume, t + 0.05);
        pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        pOsc.start(t);
        pOsc.stop(t + 0.55);

      } else if (type === 'alien_chirp') {
        // High frequency space bird or glow grub chirps
        pOsc.type = 'sine';
        pOsc.frequency.setValueAtTime(1200, t);
        pOsc.frequency.exponentialRampToValueAtTime(2400, t + 0.06);
        pOsc.frequency.exponentialRampToValueAtTime(1800, t + 0.15);

        pGain.gain.setValueAtTime(0.001, t);
        pGain.gain.linearRampToValueAtTime(0.15 * volume, t + 0.02);
        pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        pOsc.start(t);
        pOsc.stop(t + 0.2);

      } else if (type === 'storm_rumble') {
        // Deep thunderous static hum of the lightning wall
        pOsc.type = 'triangle';
        pOsc.frequency.setValueAtTime(55, t);
        pOsc.frequency.linearRampToValueAtTime(45, t + 0.8);

        pGain.gain.setValueAtTime(0.001, t);
        pGain.gain.linearRampToValueAtTime(0.35 * volume, t + 0.2);
        pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

        pOsc.start(t);
        pOsc.stop(t + 0.9);

      } else if (type === 'villager_chat') {
        // Friendly hum-like dialogue synthesis
        pOsc.type = 'triangle';
        pOsc.frequency.setValueAtTime(280, t);
        pOsc.frequency.linearRampToValueAtTime(350, t + 0.08);
        pOsc.frequency.exponentialRampToValueAtTime(220, t + 0.2);

        pGain.gain.setValueAtTime(0.001, t);
        pGain.gain.linearRampToValueAtTime(0.12 * volume, t + 0.04);
        pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        pOsc.start(t);
        pOsc.stop(t + 0.25);

      } else if (type === 'villager_work') {
        // Metallic hammer strike or pickaxe stone tap
        pOsc.type = 'sine';
        pOsc.frequency.setValueAtTime(2500, t);
        pOsc.frequency.exponentialRampToValueAtTime(120, t + 0.05);

        pGain.gain.setValueAtTime(0.001, t);
        pGain.gain.linearRampToValueAtTime(0.20 * volume, t + 0.01);
        pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        pOsc.start(t);
        pOsc.stop(t + 0.15);

      } else if (type === 'spore_spit') {
        // Corrosive acid hiss
        pOsc.type = 'sawtooth';
        pOsc.frequency.setValueAtTime(800, t);
        pOsc.frequency.exponentialRampToValueAtTime(150, t + 0.15);

        pGain.gain.setValueAtTime(0.001, t);
        pGain.gain.linearRampToValueAtTime(0.15 * volume, t + 0.02);
        pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        pOsc.start(t);
        pOsc.stop(t + 0.22);
      }
    } catch (e) {
      console.warn('Procedural spatial audio synth fail:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public dispose() {
    if (this.soundInterval) {
      clearInterval(this.soundInterval);
    }

    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {}
    }

    this.isInitialized = false;
  }
}

// Export a single global instance for simplicity
export const ambientAudioEngine = new SoundscapeEngine();
