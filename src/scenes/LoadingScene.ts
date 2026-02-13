import { Container, Graphics, Sprite, Assets, Text } from 'pixi.js';
import gsap from 'gsap';
import { SceneManager, type IScene } from '../SceneManager';

/**
 * Loading screen with logo and animated progress bar.
 * Shown during initial asset loading.
 */
export class LoadingScene extends Container implements IScene {
  private _bg: Graphics;
  private _logo: Sprite | null = null;
  private _progressBg: Graphics;
  private _progressBar: Graphics;
  private _progressText: Text;
  private _barWidth = 400;
  private _barHeight = 8;

  constructor() {
    super();

    // Orange background matching brand
    this._bg = new Graphics();
    this._bg.rect(0, 0, SceneManager.width, SceneManager.height);
    this._bg.fill(0xF5842D);
    this.addChild(this._bg);

    // Progress bar background
    this._progressBg = new Graphics();
    this._progressBg.roundRect(0, 0, this._barWidth, this._barHeight, this._barHeight / 2);
    this._progressBg.fill({ color: 0x000000, alpha: 0.3 });
    this._progressBg.position.set(
      (SceneManager.width - this._barWidth) / 2,
      SceneManager.height / 2 + 80
    );
    this.addChild(this._progressBg);

    // Progress bar fill
    this._progressBar = new Graphics();
    this._progressBar.position.set(
      (SceneManager.width - this._barWidth) / 2,
      SceneManager.height / 2 + 80
    );
    this.addChild(this._progressBar);

    // Progress text
    this._progressText = new Text({
      text: 'Loading...',
      style: {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 'white',
        fontWeight: 'bold',
      },
    });
    this._progressText.anchor.set(0.5);
    this._progressText.position.set(SceneManager.width / 2, SceneManager.height / 2 + 110);
    this.addChild(this._progressText);

    this.loadLogo();
  }

  private async loadLogo(): Promise<void> {
    try {
      const bundle = await Assets.loadBundle('preload');
      const logoTexture = bundle['logo'];

      this._logo = new Sprite(logoTexture);
      this._logo.anchor.set(0.5);
      this._logo.position.set(SceneManager.width / 2, SceneManager.height / 2 - 20);
      this._logo.scale.set(0.8);
      this.addChild(this._logo);

      // Entrance animation
      this._logo.alpha = 0;
      this._logo.scale.set(0.6);
      gsap.to(this._logo, {
        alpha: 1,
        duration: 0.5,
        ease: 'power2.out',
      });
      gsap.to(this._logo.scale, {
        x: 0.8,
        y: 0.8,
        duration: 0.5,
        ease: 'back.out(1.7)',
      });

      // Subtle pulse animation
      gsap.to(this._logo.scale, {
        x: 0.82,
        y: 0.82,
        duration: 1.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 0.5,
      });
    } catch (error) {
      console.error('Failed to load logo:', error);
    }
  }

  /** Updates progress bar (0-1) */
  public setProgress(progress: number): void {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const width = this._barWidth * clampedProgress;

    this._progressBar.clear();
    if (width > 0) {
      this._progressBar.roundRect(0, 0, width, this._barHeight, this._barHeight / 2);
      this._progressBar.fill(0xffffff);
    }

    this._progressText.text = `Loading... ${Math.round(clampedProgress * 100)}%`;
  }

  public update(_delta: number): void {}

  public resize(_width: number, _height: number): void {
    this._bg.clear();
    this._bg.rect(0, 0, SceneManager.width, SceneManager.height);
    this._bg.fill(0xF5842D);

    this._progressBg.position.set(
      (SceneManager.width - this._barWidth) / 2,
      SceneManager.height / 2 + 80
    );
    this._progressBar.position.set(
      (SceneManager.width - this._barWidth) / 2,
      SceneManager.height / 2 + 80
    );
    this._progressText.position.set(SceneManager.width / 2, SceneManager.height / 2 + 110);

    if (this._logo) {
      this._logo.position.set(SceneManager.width / 2, SceneManager.height / 2 - 20);
    }
  }

  public cleanup(): void {
    if (this._logo) {
      gsap.killTweensOf(this._logo);
      gsap.killTweensOf(this._logo.scale);
      try {
        this.removeChild(this._logo);
        this._logo.destroy();
      } catch (e) {}
      this._logo = null;
    }

    // Stop any tweens on progress visuals
    gsap.killTweensOf(this._progressBar);
    gsap.killTweensOf(this._progressBg);
  }
}
