import { Container, Graphics, Sprite, Texture, Filter, GlProgram, defaultFilterVert, MeshRope, Point, Text } from 'pixi.js';
import { Howl } from 'howler';
import { SceneManager, type IScene } from '../SceneManager';
import { createBackButton } from '../ui/BackButton';

type SeedState = 'FALLING' | 'FLOATING' | 'SINKING' | 'STACKED' | 'EXPLODED';

interface Seed extends Sprite {
  vx: number;
  vy: number;
  state: SeedState;
  floatTimer: number;
  trail?: Trail;
}

class Trail {
  rope: MeshRope;
  points: Point[];
  historySize = 15;
  target: Sprite;

  constructor(target: Sprite, texture: Texture, parent: Container) {
    this.target = target;
    this.points = [];
    for (let i = 0; i < this.historySize; i++) {
      this.points.push(new Point(target.x, target.y));
    }
    this.rope = new MeshRope({ texture, points: this.points });
    this.rope.tint = target.tint;
    this.rope.alpha = 0.6;
    parent.addChildAt(this.rope, 0);
  }

  update(): void {
    const p = this.points;
    for (let i = p.length - 1; i > 0; i--) {
      p[i].x = p[i - 1].x;
      p[i].y = p[i - 1].y;
    }
    p[0].x = this.target.x;
    p[0].y = this.target.y;
  }

  destroy(): void {
    try {
      this.rope.destroy();
    } catch (e) {}
    this.points.length = 0;
  }
}

export class SeedsScene extends Container implements IScene {
  private skyContainer: Container;
  private waterContainer: Container;
  private waterBg: Graphics;
  private waterFilter: Filter;
  private seeds: Seed[] = [];
  private activeTrails: Trail[] = [];
  // Pools
  private _seedPool: Seed[] = [];
  private _trailPool: Trail[] = [];
  private texSeed!: Texture;
  private texTrail!: Texture;
  private sfxExplode: Howl;

  private time = 0;
  private magnetActive = false;
  private magnetX = 0;
  private magnetY = 0;

  private spawnInterval: ReturnType<typeof setInterval> | null = null;

  private readonly WATER_LEVEL: number;
  private readonly GROUND_LEVEL: number;
  private readonly COLORS = [0xFF5555, 0x55FF55, 0x5555FF, 0xFFFF55];
  private readonly FULL_STACK_THRESHOLD = 30;
  private _isRestarting = false;
  private _restartTimeout: any = null;

  constructor() {
    super();
    
    const w = SceneManager.width;
    const h = SceneManager.height;
    
    this.WATER_LEVEL = h / 2;
    this.GROUND_LEVEL = h - 20;
    
    // Background
    const skyBg = new Graphics().rect(0, 0, w, h).fill(0x87CEEB);
    this.addChild(skyBg);

    // Water background (interactive)
    this.waterBg = new Graphics().rect(0, this.WATER_LEVEL, w, h / 2).fill(0x006994);
    this.waterBg.eventMode = 'static';
    this.waterBg.cursor = 'pointer';
    this.addChild(this.waterBg);

    // Containers
    this.skyContainer = new Container();
    this.waterContainer = new Container();

    // Water wobble shader
    const fragSource = `
      precision mediump float;
      in vec2 vTextureCoord;
      out vec4 finalColor;
      uniform sampler2D uTexture;
      uniform float uTime;
      void main() {
        vec2 uv = vTextureCoord;
        uv.x += sin(uv.y * 10.0 + uTime * 3.0) * 0.005;
        finalColor = texture(uTexture, uv);
        if (finalColor.a > 0.0) {
          finalColor.g *= 1.1;
          finalColor.b *= 1.2;
        }
      }
    `;

    this.waterFilter = new Filter({
      glProgram: new GlProgram({ vertex: defaultFilterVert, fragment: fragSource }),
      resources: { uniforms: { uTime: { value: 0, type: 'f32' } } }
    });

    this.waterContainer.filters = [this.waterFilter];
    this.waterContainer.filterArea = SceneManager.app.screen;

    this.addChild(this.skyContainer);
    this.addChild(this.waterContainer);

    // Generate textures
    const gSeed = new Graphics().circle(0, 0, 10).fill(0xFFFFFF);
    this.texSeed = SceneManager.app.renderer.generateTexture(gSeed);

    const gTrail = new Graphics().rect(0, 0, 20, 10).fill(0xFFFFFF);
    this.texTrail = SceneManager.app.renderer.generateTexture(gTrail);

    // Audio
    this.sfxExplode = new Howl({
      src: ['assets/sfx/explosion.webm', 'assets/sfx/explosion.mp3'],
      volume: 0.5
    });

    // Pointer events
    this.waterBg.eventMode = 'static';
    this.waterBg.cursor = 'pointer';
    this._onWaterDown = (e: any) => {
      this.magnetActive = true;
      this.magnetX = e.global.x;
      this.magnetY = e.global.y;
      // schedule magnet off via a short timer stored on the scene so it can be cleared on cleanup
      if (this._magnetTimeout) clearTimeout(this._magnetTimeout);
      this._magnetTimeout = setTimeout(() => { this.magnetActive = false; this._magnetTimeout = null; }, 1500);
    };
    this.waterBg.on('pointerdown', this._onWaterDown);

    // internal magnet timeout handle so we can cancel on cleanup

    // Spawn seeds (kept as interval for simplicity) - seeds will be pooled
    this.spawnInterval = setInterval(() => this.spawnSeed(), 200);

    // Instructions
    this.createInstructions();

    // Back button (added last for proper z-order)
    this.addChild(createBackButton());
  }

  private createInstructions(): void {
    const text = new Text({
      text: 'Click on water to attract seeds. Gather 10+ for explosion!',
      style: { fill: '#ffffff', fontSize: 16, fontFamily: 'Arial' }
    });
    text.anchor.set(0.5, 0);
    text.position.set(SceneManager.width / 2, 150);
    this.addChild(text);
  }

  private spawnSeed(): void {
    let s: Seed | undefined = this._seedPool.pop();
    if (s) {
      s.texture = this.texSeed;
    } else {
      s = new Sprite(this.texSeed) as Seed;
    }
    s.anchor.set(0.5);
    s.x = Math.random() * SceneManager.width;
    s.y = -50;
    s.tint = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
    s.vx = 0;
    s.vy = 2 + Math.random() * 3;
    s.state = 'FALLING';
    s.floatTimer = 0;
    this.skyContainer.addChild(s);
    this.seeds.push(s);
  }

  private _onWaterDown: ((e: any) => void) | null = null;
  private _magnetTimeout: any = null;

  /** Release a seed back to the pool */
  private releaseSeed(s: Seed): void {
    try {
      if (s.parent) s.parent.removeChild(s);
    } catch (e) {}
    if (s.trail) {
      this.releaseTrail(s.trail);
      s.trail = undefined;
    }
    // reset minimal state
    s.alpha = 1;
    s.scale.set(1);
    s.vx = 0;
    s.vy = 0;
    s.state = 'FALLING';
    this._seedPool.push(s);
  }

  /** Get a Trail from the pool or create a new one */
  private getTrail(target: Sprite): Trail {
    const t = this._trailPool.pop();
    if (t) {
      // reuse: reparent rope and target
      t.target = target;
      for (let i = 0; i < t.points.length; i++) {
        t.points[i].x = target.x;
        t.points[i].y = target.y;
      }
      try {
        t.rope.alpha = 0.6;
        t.rope.tint = target.tint;
        this.waterContainer.addChildAt(t.rope, 0);
      } catch (e) {}
      return t;
    }
    return new Trail(target, this.texTrail, this.waterContainer);
  }

  private releaseTrail(t: Trail): void {
    try {
      if (t.rope.parent) t.rope.parent.removeChild(t.rope);
    } catch (e) {}
    // Keep `points` array intact so reused trails have valid Point objects.
    // Reset rope tint/visibility as a lightweight reset.
    try { t.rope.alpha = 0; } catch (e) {}
    this._trailPool.push(t);
  }

  public update(delta: number): void {
    this.time += delta * 0.05;
    this.waterFilter.resources.uniforms.uniforms.uTime = this.time;

    let gatheredCount = 0;
    const gatheredSeeds: Seed[] = [];

    for (const s of this.seeds) {
      if (s.trail) s.trail.update();

      if (s.state === 'EXPLODED') {
        s.x += s.vx;
        s.y += s.vy;
        continue;
      }

      // Magnet attraction
      if (this.magnetActive && (s.state === 'FLOATING' || s.state === 'SINKING' || s.state === 'STACKED')) {
        const dx = this.magnetX - s.x;
        const dy = this.magnetY - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 250) {
          s.x += dx * 0.05;
          s.y += dy * 0.05;
          s.state = 'SINKING';
          if (dist < 30) {
            gatheredCount++;
            gatheredSeeds.push(s);
          }
        }
      }

      // Physics state machine
      if (s.state === 'FALLING') {
        s.y += s.vy;
        if (s.y > this.WATER_LEVEL) {
          s.state = 'FLOATING';
          s.vy = 0;
          s.floatTimer = 100 + Math.random() * 200;
          this.skyContainer.removeChild(s);
          this.waterContainer.addChild(s);
        }
      } else if (s.state === 'FLOATING') {
        s.y = this.WATER_LEVEL + Math.sin(this.time + s.x * 0.1) * 5;
        s.floatTimer -= delta;
        if (s.floatTimer <= 0) {
          s.state = 'SINKING';
          s.vy = 1;
        }
      } else if (s.state === 'SINKING') {
        s.y += s.vy;
        if (s.y > this.GROUND_LEVEL) {
          s.y = this.GROUND_LEVEL;
          s.state = 'STACKED';
        }

        // Stack on top of other seeds
        for (const other of this.seeds) {
          if (other === s || other.state !== 'STACKED') continue;
          const dy = s.y - other.y;
          const dx = s.x - other.x;
          if (Math.abs(dx) < 15 && Math.abs(dy) < 20) {
            s.y = other.y - 18;
            s.state = 'STACKED';
            break;
          }
        }
      }
    }

    // Explosion when 10+ gathered
    if (gatheredCount >= 10) {
      this.sfxExplode.play();

      for (const s of gatheredSeeds) {
        s.state = 'EXPLODED';
        const angle = Math.random() * Math.PI * 2;
        s.vx = Math.cos(angle) * 15;
        s.vy = Math.sin(angle) * 15;
        s.trail = this.getTrail(s);
        this.activeTrails.push(s.trail);
        s.tint = 0xFFFFFF;
      }
      this.magnetActive = false;
    }

    // Recycle seeds that have left the play area
    for (let i = this.seeds.length - 1; i >= 0; i--) {
      const s = this.seeds[i];
      if (s.y > SceneManager.height + 200 || s.x < -200 || s.x > SceneManager.width + 200) {
        this.seeds.splice(i, 1);
        this.releaseSeed(s);
      }
    }

    // If too many seeds are stacked at ground level, restart the scene (water full)
    const stackedCount = this.seeds.reduce((acc, s) => acc + (s.state === 'STACKED' ? 1 : 0), 0);
    if (stackedCount >= this.FULL_STACK_THRESHOLD && !this._isRestarting) {
      this._isRestarting = true;

      // Disable magnet and stop spawning
      this.magnetActive = false;
      if (this.spawnInterval) {
        clearInterval(this.spawnInterval);
        this.spawnInterval = null;
      }

      // Explode all remaining seeds to create a visual cleanup
      try {
        this.sfxExplode.play();
      } catch (e) {}

      for (const s of this.seeds) {
        if (s.state === 'EXPLODED') continue;
        s.state = 'EXPLODED';
        const angle = Math.random() * Math.PI * 2;
        s.vx = Math.cos(angle) * 15;
        s.vy = Math.sin(angle) * 15;
        if (!s.trail) {
          s.trail = this.getTrail(s);
          this.activeTrails.push(s.trail);
        }
        s.tint = 0xFFFFFF;
      }

      // Delay restart slightly so explosion plays
      this._restartTimeout = setTimeout(() => {
        try { void SceneManager.changeScene(() => new SeedsScene()); } catch (e) {}
      }, 1000);
    }
  }

  public resize(_width: number, _height: number): void {}

  public cleanup(): void {
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = null;
    }
    // Remove pointer listener and cancel magnet timeout
    try {
      if (this._onWaterDown) this.waterBg.off('pointerdown', this._onWaterDown);
    } catch (e) {}
    if (this._magnetTimeout) {
      clearTimeout(this._magnetTimeout);
      this._magnetTimeout = null;
    }
    if (this._restartTimeout) {
      clearTimeout(this._restartTimeout);
      this._restartTimeout = null;
    }

    // Destroy active trails and move them to pool
    for (const t of this.activeTrails) {
      try { t.destroy(); } catch (e) {}
    }
    this.activeTrails = [];

    // Destroy all seeds in scene
    for (const s of this.seeds) {
      try {
        if (s.parent) s.parent.removeChild(s);
      } catch (e) {}
      try { s.destroy(); } catch (e) {}
    }
    this.seeds = [];

    // Destroy pooled objects
    for (const p of this._seedPool) {
      try { p.destroy(); } catch (e) {}
    }
    this._seedPool = [];
    for (const p of this._trailPool) {
      try { p.destroy(); } catch (e) {}
    }
    this._trailPool = [];

    // Destroy textures and filters
    try { this.texSeed.destroy(true); } catch (e) {}
    try { this.texTrail.destroy(true); } catch (e) {}
    try { this.waterFilter.destroy(); } catch (e) {}

    this.sfxExplode.unload();

    // Remove all children
    try { this.removeChildren(); } catch (e) {}
  }
}
