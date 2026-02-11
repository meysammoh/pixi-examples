import { Container, Text, Graphics } from 'pixi.js';
import { gsap } from 'gsap';
import { SceneManager, type IScene } from '../SceneManager';
import { AceOfShadowsScene } from './AceOfShadowsScene';
import { MagicWordsScene } from './MagicWordsScene';
import { PhoenixFlameScene } from './PhoenixFlameScene';
import { SeedsScene } from './SeedsScene';

interface MenuButton {
  container: Container;
  bg: Graphics;
  label: Text;
}

export class MenuScene extends Container implements IScene {
  private _buttons: MenuButton[] = [];
  private _bg: Graphics = new Graphics();

  constructor() {
    super();
    this.createBackground();
    this.createUI();
  }
  
  private createBackground(): void {
    const w = SceneManager.width;
    const h = SceneManager.height;

    this._bg.rect(0, 0, w, h);
    this._bg.fill(0x1a1a2e);
    this.addChild(this._bg);

    const gradient = new Graphics();
    gradient.ellipse(w / 2, h * 0.3, w * 0.8, h * 0.4);
    gradient.fill({ color: 0x16213e, alpha: 0.6 });
    this.addChild(gradient);
  }

  private createUI(): void {
    const centerX = SceneManager.width / 2;

    const title = new Text({
      text: 'PIXI EXAMPLES',
      style: {
        fill: '#e94560',
        fontSize: 48,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        letterSpacing: 8,
      }
    });
    title.anchor.set(0.5);
    title.position.set(centerX, 120);
    this.addChild(title);

    const subtitle = new Text({
      text: 'Technical Assignment',
      style: {
        fill: '#aaaaaa',
        fontSize: 20,
        fontFamily: 'Arial',
      }
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(centerX, 170);
    this.addChild(subtitle);

    const buttonData = [
      { label: 'Ace of Shadows', icon: '🃏', color: 0x0f3460, scene: AceOfShadowsScene, bundle: 'ace-of-shadows' },
      { label: 'Magic Words', icon: '💬', color: 0x533483, scene: MagicWordsScene, bundle: 'magic-words' },
      { label: 'Phoenix Flame', icon: '🔥', color: 0xe94560, scene: PhoenixFlameScene, bundle: 'phoenix-flame' },
      { label: 'Water Seeds', icon: '💧', color: 0x006994, scene: SeedsScene, bundle: '' },
    ];

    const startY = 280;
    const spacing = 120;

    buttonData.forEach((data, i) => {
      this.createButton(data.label, data.icon, data.color, startY + i * spacing, () => {
        SceneManager.changeScene(() => new data.scene(), data.bundle);
      });
    });
  }

  private createButton(label: string, icon: string, color: number, y: number, onClick: () => void): void {
    const container = new Container();
    container.position.set(SceneManager.width / 2, y);

    const btnWidth = 320;
    const btnHeight = 100;

    const bg = new Graphics();
    bg.roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 16);
    bg.fill({ color, alpha: 0.9 });
    bg.stroke({ width: 2, color: 0xffffff, alpha: 0.2 });
    container.addChild(bg);

    const iconText = new Text({
      text: icon,
      style: { fontSize: 36 }
    });
    iconText.anchor.set(0.5);
    iconText.position.set(-btnWidth / 2 + 50, 0);
    container.addChild(iconText);

    const labelText = new Text({
      text: label,
      style: {
        fill: '#ffffff',
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Arial',
      }
    });
    labelText.anchor.set(0, 0.5);
    labelText.position.set(-btnWidth / 2 + 90, 0);
    container.addChild(labelText);

    const arrow = new Text({
      text: '→',
      style: {
        fill: '#ffffff',
        fontSize: 28,
        fontFamily: 'Arial',
      }
    });
    arrow.anchor.set(0.5);
    arrow.position.set(btnWidth / 2 - 30, 0);
    arrow.alpha = 0.5;
    container.addChild(arrow);

    container.eventMode = 'static';
    container.cursor = 'pointer';

    container.on('pointerover', () => {
      gsap.to(container.scale, { x: 1.05, y: 1.05, duration: 0.2 });
      gsap.to(arrow, { x: btnWidth / 2 - 20, alpha: 1, duration: 0.2 });
      bg.clear();
      bg.roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 16);
      bg.fill({ color, alpha: 1 });
      bg.stroke({ width: 3, color: 0xffffff, alpha: 0.4 });
    });

    container.on('pointerout', () => {
      gsap.to(container.scale, { x: 1, y: 1, duration: 0.2 });
      gsap.to(arrow, { x: btnWidth / 2 - 30, alpha: 0.5, duration: 0.2 });
      bg.clear();
      bg.roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 16);
      bg.fill({ color, alpha: 0.9 });
      bg.stroke({ width: 2, color: 0xffffff, alpha: 0.2 });
    });

    container.on('pointerdown', onClick);

    this._buttons.push({ container, bg, label: labelText });
    this.addChild(container);
  }

  public update(_delta: number): void {}

  public resize(_width: number, _height: number): void {}

  public cleanup(): void {
    this._buttons.forEach(btn => {
      gsap.killTweensOf(btn.container.scale);
    });
    this.removeChildren();
  }
}
