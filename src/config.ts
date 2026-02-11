/**
 * Application configuration - tweak these values to adjust behavior
 */
export const config = {
  /** Design resolution */
  design: {
    width: 720,
    height: 1280,
  },

  /** Display settings */
  display: {
    /** Request fullscreen on first user interaction */
    fullscreen: true,
  },

  /** Loading screen settings */
  loading: {
    /** Minimum time (ms) to show loading screen to avoid jarring flash */
    minDisplayTime: 500,
  },

  /** Sound settings */
  sound: {
    /** Default volume for fire loop (0-1) */
    fireLoopVolume: 0.5,
    /** Fade out duration (ms) when leaving scenes */
    fadeOutDuration: 300,
  },

  /** Phoenix Flame scene settings */
  phoenixFlame: {
    /** Particle spawn interval (in delta frames) */
    particleSpawnInterval: 8,
  },

  /** Ace of Shadows scene settings */
  aceOfShadows: {
    /** Card movement duration (seconds) */
    cardMoveDuration: 2,
    /** Delay between card moves (seconds) */
    cardMoveDelay: 1,
  },

  /** Magic Words scene settings */
  magicWords: {
    /** Delay between each character/element in typewriter effect (seconds) */
    typewriteDelay: 0.03,
  },
} as const;
