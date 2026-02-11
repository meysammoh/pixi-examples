import { Howl, Howler } from 'howler';

/**
 * Manages game audio using Howler.js.
 * Provides methods to play, stop, and control looping sounds.
 */
class SoundManagerClass {
  private _sounds: Map<string, Howl> = new Map();
  private _muted: boolean = false;

  /**
   * Loads a sound with the given key.
   * @param key - Unique identifier for the sound
   * @param src - Array of source URLs (for format fallback)
   * @param options - Additional Howl options
   */
  load(key: string, src: string[], options: Partial<HowlOptions> = {}): Howl {
    const sound = new Howl({
      src,
      ...options,
    });
    this._sounds.set(key, sound);
    return sound;
  }

  /**
   * Plays a loaded sound by key.
   * @param key - The sound identifier
   * @returns The sound ID or undefined if not found
   */
  play(key: string): number | undefined {
    const sound = this._sounds.get(key);
    return sound?.play();
  }

  /**
   * Stops a sound by key.
   * @param key - The sound identifier
   */
  stop(key: string): void {
    this._sounds.get(key)?.stop();
  }

  /**
   * Fades out and stops a sound.
   * @param key - The sound identifier
   * @param duration - Fade duration in ms
   */
  fadeOut(key: string, duration: number = 500): void {
    const sound = this._sounds.get(key);
    if (sound) {
      sound.fade(sound.volume(), 0, duration);
      sound.once('fade', () => sound.stop());
    }
  }

  /**
   * Sets the volume for a sound.
   * @param key - The sound identifier
   * @param volume - Volume level (0.0 to 1.0)
   */
  setVolume(key: string, volume: number): void {
    this._sounds.get(key)?.volume(volume);
  }

  /**
   * Unloads a sound and removes it from the manager.
   * @param key - The sound identifier
   */
  unload(key: string): void {
    const sound = this._sounds.get(key);
    if (sound) {
      sound.unload();
      this._sounds.delete(key);
    }
  }

  /**
   * Gets a sound by key.
   * @param key - The sound identifier
   */
  get(key: string): Howl | undefined {
    return this._sounds.get(key);
  }

  /** Toggles global mute state. */
  toggleMute(): boolean {
    this._muted = !this._muted;
    Howler.mute(this._muted);
    return this._muted;
  }

  /** Sets global mute state. */
  setMuted(muted: boolean): void {
    this._muted = muted;
    Howler.mute(this._muted);
  }

  /** Returns current mute state. */
  get muted(): boolean {
    return this._muted;
  }
}

interface HowlOptions {
  src: string[];
  loop?: boolean;
  volume?: number;
  autoplay?: boolean;
  preload?: boolean;
}

export const SoundManager = new SoundManagerClass();
