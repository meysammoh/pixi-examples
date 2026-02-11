import type { AssetsManifest } from 'pixi.js';

export const manifest: AssetsManifest = {
  bundles: [
    {
      name: 'preload',
      assets: [
        {
          alias: 'logo',
          src: 'assets/logo.png',
        },
      ],
    },
    {
      name: 'ace-of-shadows',
      assets: [
        {
          alias: 'cards',
          src: 'assets/cards.json',
        },
      ],
    },
    {
      name: 'magic-words',
      assets: [
        {
          alias: 'placeholder-avatar',
          src: 'assets/placeholders/avatar.svg',
        },
        {
          alias: 'placeholder-emoji',
          src: 'assets/placeholders/emoji.svg',
        },
      ],
    },
    {
      name: 'phoenix-flame',
      assets: [
        {
          alias: 'fire',
          src: 'assets/fire.png',
        },
        {
          alias: 'flare-sheet',
          src: 'assets/flare-sheet.json',
        },
        {
          alias: 'flame-vert',
          src: 'assets/shaders/flame.vert',
        },
        {
          alias: 'flame-frag',
          src: 'assets/shaders/flame.frag',
        },
        {
          alias: 'glow-frag',
          src: 'assets/shaders/glow.frag',
        },
        {
          alias: 'fire-loop-webm',
          src: 'assets/sfx/fire_loop.webm',
        },
        {
          alias: 'fire-loop-mp3',
          src: 'assets/sfx/fire_loop.mp3',
        },
      ],
    },
  ],
};
