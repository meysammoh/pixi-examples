import { Container, Graphics, Text } from 'pixi.js';
import { gsap } from 'gsap';
import { SoundManager } from '../SoundManager';

/**
 * A toggle button for muting/unmuting game audio.
 * Displays speaker icon that changes based on mute state.
 */
export class MuteButton extends Container {
  private _bg: Graphics;
  private _icon: Text;
  private _muted: boolean;

  constructor() {
    super();
    this._muted = SoundManager.muted;

    this._bg = new Graphics();
    this.addChild(this._bg);

    this._icon = new Text({
      text: this._muted ? '🔇' : '🔊',
      style: {
        fontSize: 24,
      },
    });
    this._icon.anchor.set(0.5);
    this.addChild(this._icon);

    this.draw();
    this.setupInteraction();
  }

  private draw(): void {
    const size = 44;
    this._bg.clear();
    this._bg.roundRect(-size / 2, -size / 2, size, size, 8);
    this._bg.fill({ color: 0x2a2a2a, alpha: 0.8 });
  }

  private setupInteraction(): void {
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerover', () => {
      gsap.to(this.scale, { x: 1.1, y: 1.1, duration: 0.15 });
    });

    this.on('pointerout', () => {
      gsap.to(this.scale, { x: 1, y: 1, duration: 0.15 });
    });

    this.on('pointerdown', () => {
      this._muted = SoundManager.toggleMute();
      this._icon.text = this._muted ? '🔇' : '🔊';
      gsap.to(this.scale, { x: 0.9, y: 0.9, duration: 0.1, yoyo: true, repeat: 1 });
    });
  }

  destroy(): void {
    gsap.killTweensOf(this.scale);
    super.destroy({ children: true });
  }
}
