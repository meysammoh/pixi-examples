import { Container, Graphics, Text } from 'pixi.js';
import { gsap } from 'gsap';

export interface ButtonOptions {
  label: string;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: number;
  hoverColor?: number;
  textColor?: string;
  borderRadius?: number;
  onClick: () => void;
}

export class Button extends Container {
  private _bg: Graphics;
  private _label: Text;
  private _options: Required<ButtonOptions>;

  constructor(options: ButtonOptions) {
    super();

    this._options = {
      width: 160,
      height: 50,
      fontSize: 24,
      color: 0x333333,
      hoverColor: 0x555555,
      textColor: '#ffffff',
      borderRadius: 8,
      ...options,
    };

    this._bg = new Graphics();
    this._label = new Text({
      text: this._options.label,
      style: {
        fill: this._options.textColor,
        fontSize: this._options.fontSize,
        fontFamily: 'Arial',
      }
    });

    this._label.anchor.set(0.5);
    this.addChild(this._bg);
    this.addChild(this._label);

    this.draw(this._options.color);
    this.setupInteraction();
  }

  private draw(color: number): void {
    const { width, height, borderRadius } = this._options;
    this._bg.clear();
    this._bg.roundRect(-width / 2, -height / 2, width, height, borderRadius);
    this._bg.fill({ color, alpha: 0.9 });
  }

  private setupInteraction(): void {
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerover', () => {
      this.draw(this._options.hoverColor);
      gsap.to(this.scale, { x: 1.05, y: 1.05, duration: 0.15 });
    });

    this.on('pointerout', () => {
      this.draw(this._options.color);
      gsap.to(this.scale, { x: 1, y: 1, duration: 0.15 });
    });

    this.on('pointerdown', this._options.onClick);
  }

  destroy(): void {
    gsap.killTweensOf(this.scale);
    super.destroy({ children: true });
  }
}
