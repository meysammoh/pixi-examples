import { Container, Assets, AnimatedSprite, Sprite, Texture, Filter, GlProgram } from 'pixi.js';
import { SceneManager, type IScene } from '../SceneManager';
import { createBackButton } from '../ui/BackButton';
import { MuteButton } from '../ui/MuteButton';
import { SoundManager } from '../SoundManager';
import { config } from '../config';

interface Shaders {
  vertex: string;
  flameFrag: string;
  glowFrag: string;
}

interface FlyingParticle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class PhoenixFlameScene extends Container implements IScene {
  private _flameContainer: Container | null = null;
  private _particleContainer: Container | null = null;
  private _flames: AnimatedSprite[] = [];
  private _flameFilter: Filter | null = null;
  private _glowFilter: Filter | null = null;
  private _flyingParticles: FlyingParticle[] = [];
  private _fireTexture: Texture | null = null;
  private _spawnTimer: number = 0;

  constructor() {
    super();
    this.addChild(createBackButton());

    const muteBtn = new MuteButton();
    muteBtn.position.set(SceneManager.width - 80, 90);
    this.addChild(muteBtn);
  }

  public  async init(): Promise<void> {
    try {
      const spritesheet = Assets.get('flare-sheet');
      this._fireTexture = Assets.get('fire');

      const shaders: Shaders = {
        vertex: Assets.get('flame-vert'),
        flameFrag: Assets.get('flame-frag'),
        glowFrag: Assets.get('glow-frag'),
      };

      SoundManager.load('fire-loop', [Assets.get('fire-loop-webm'), Assets.get('fire-loop-mp3')], {
        loop: true,
        volume: config.sound.fireLoopVolume,
      });
      SoundManager.play('fire-loop');

      const frames = spritesheet.animations['flare'] as Texture[];
      this.createFlame(frames, shaders);
    } catch (error) {
      console.error('Failed to load phoenix-flame bundle:', error);
    }
  }

  private createFlame(frames: Texture[], shaders: Shaders): void {
    this._particleContainer = new Container();
    this._particleContainer.position.set(
      SceneManager.width / 2,
      SceneManager.height - 10
    );
    this.addChild(this._particleContainer);

    this._flameContainer = new Container();
    this._flameContainer.position.set(
      SceneManager.width / 2,
      SceneManager.height - 10
    );
    this.addChild(this._flameContainer);

    this._flameFilter = new Filter({
      glProgram: new GlProgram({
        vertex: shaders.vertex,
        fragment: shaders.flameFrag,
      }),
      resources: {},
    });

    this._glowFilter = new Filter({
      glProgram: new GlProgram({
        vertex: shaders.vertex,
        fragment: shaders.glowFrag,
      }),
      resources: {},
    });

    const flameConfigs = [
      { x: 0, scale: 1.0, speed: 0.2, start: 0, alpha: 1.0 },
      { x: -50, scale: 0.7, speed: 0.18, start: 3, alpha: 0.9 },
      { x: 50, scale: 0.7, speed: 0.22, start: 5, alpha: 0.9 },
      { x: -25, scale: 0.8, speed: 0.15, start: 4, alpha: 0.6 },
      { x: 25, scale: 0.8, speed: 0.17, start: 6, alpha: 0.6 },
      { x: 0, scale: 0.5, speed: 0.25, start: 2, alpha: 0.7 },
    ];

    for (const config of flameConfigs) {
      const flame = new AnimatedSprite(frames);
      flame.anchor.set(0.5, 1);
      flame.scale.set(config.scale);
      flame.animationSpeed = config.speed;
      flame.alpha = config.alpha;
      flame.loop = true;
      flame.gotoAndPlay(config.start % frames.length);
      flame.position.set(config.x, 0);
      flame.filters = [this._flameFilter];
      flame.eventMode = 'none';

      this._flames.push(flame);
      this._flameContainer.addChild(flame);
    }

    for (let i = 0; i < 5; i++) {
      this.spawnFlyingParticle();
    }
  }

  private spawnFlyingParticle(): void {
    if (!this._particleContainer || !this._glowFilter || !this._fireTexture) return;

    const sprite = new Sprite(this._fireTexture);
    sprite.anchor.set(0.5, 1);
    sprite.filters = [this._glowFilter];
    sprite.eventMode = 'none';
    sprite.cullable = true;

    const xOffset = (Math.random() - 0.5) * 120;
    sprite.position.set(xOffset, 0);

    const scale = 0.2 + Math.random() * 0.3;
    sprite.scale.set(scale);

    const vx = (Math.random() - 0.5) * 0.8;
    const vy = -2.5 - Math.random() * 2.0;

    const maxLife = 70 + Math.random() * 60;

    const particle: FlyingParticle = {
      sprite,
      vx,
      vy,
      life: maxLife,
      maxLife,
    };

    this._flyingParticles.push(particle);
    this._particleContainer.addChild(sprite);
  }

  public update(delta: number): void {
    this._spawnTimer += delta;
    if (this._spawnTimer > config.phoenixFlame.particleSpawnInterval) {
      this.spawnFlyingParticle();
      this._spawnTimer = 0;
    }

    for (let i = this._flyingParticles.length - 1; i >= 0; i--) {
      const p = this._flyingParticles[i];
      p.life -= delta;

      p.sprite.x += p.vx * delta;
      p.sprite.y += p.vy * delta;
      p.sprite.x += Math.sin(p.life * 0.2) * 0.3;

      const lifeRatio = p.life / p.maxLife;
      p.sprite.alpha = lifeRatio;

      const scale = p.sprite.scale.x * (0.995 + lifeRatio * 0.005);
      p.sprite.scale.set(scale);

      if (p.life <= 0) {
        p.sprite.destroy();
        this._flyingParticles.splice(i, 1);
      }
    }
  }

  public resize(_width: number, _height: number): void {
    if (this._flameContainer) {
      this._flameContainer.position.set(
        SceneManager.width / 2,
        SceneManager.height - 10
      );
    }
    if (this._particleContainer) {
      this._particleContainer.position.set(
        SceneManager.width / 2,
        SceneManager.height - 10
      );
    }
  }

  public cleanup(): void {
    SoundManager.fadeOut('fire-loop', config.sound.fadeOutDuration);
    SoundManager.unload('fire-loop');

    if (this._flameFilter) {
      this._flameFilter.destroy();
      this._flameFilter = null;
    }
    if (this._glowFilter) {
      this._glowFilter.destroy();
      this._glowFilter = null;
    }
    for (const flame of this._flames) {
      flame.destroy();
    }
    for (const p of this._flyingParticles) {
      p.sprite.destroy();
    }
    this._flames = [];
    this._flyingParticles = [];
    this._fireTexture = null;
    this._flameContainer = null;
    this._particleContainer = null;
    this.removeChildren();
  }
}
