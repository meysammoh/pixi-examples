import { Container, Sprite, Assets, Graphics } from 'pixi.js';
import { gsap } from 'gsap';
import { SceneManager, type IScene } from '../SceneManager';
import { createBackButton } from '../ui/BackButton';
import { config } from '../config';

/**
 * Task 1: "Ace of Shadows"
 * Displays 144 sprites stacked on top of each other like cards in a deck.
 * Cards move from top of one stack to the other every second with a 2-second animation.
 */
export class AceOfShadowsScene extends Container implements IScene {
    private cards: Sprite[] = [];
    private stack1: Sprite[] = [];
    private stack2: Sprite[] = [];
    private startPos = { x: 0, y: 0 };
    private endPos = { x: 0, y: 0 };
    private readonly offsetY = 1.5;
    private readonly offsetX = 0.3;
    private timer: gsap.core.Tween | null = null;
    private _isRunning = false; 

    constructor() {
        super();
        this.calculatePositions();
        this.createBackground();
        this.addChild(createBackButton());
    }

    private calculatePositions(): void {
        const centerX = SceneManager.width / 2;
        const centerY = SceneManager.height / 2 + 50;
        this.startPos = { x: centerX - 150, y: centerY };
        this.endPos = { x: centerX + 150, y: centerY };
    }

    private createBackground(): void {
        const bg = new Graphics();
        bg.roundRect(0, 0, SceneManager.width, SceneManager.height, 0);
        bg.fill(0x1a472a);
        this.addChild(bg);

        const circle = new Graphics();
        circle.ellipse(SceneManager.width / 2, SceneManager.height / 2 + 50, 350, 250);
        circle.fill({ color: 0x2d5a3d, alpha: 0.5 });
        this.addChild(circle);
    }

    /** Loads card assets and initializes the stacked layout. */
    public async init(): Promise<void> {
        const sheet = Assets.get("cards");
        const frameNames = Object.keys(sheet.textures);

        for (let i = 0; i < 144; i++) {
            const texName = frameNames[i % frameNames.length];
            const texture = sheet.textures[texName];
            const card = new Sprite(texture);
            card.anchor.set(0.5);
            card.scale.set(0.5);
            card.eventMode = 'none';
            card.cullable = true;
            this.cards.push(card);
            this.stack1.push(card);
            this.addChild(card);
            card.position.set(
                this.startPos.x + (i * this.offsetX),
                this.startPos.y - (i * this.offsetY)
            );
        }

        this.startLoop();
    }

    /** Starts the animation loop that moves one card at configured interval. */
    private startLoop(): void {
        this._isRunning = true;
        this.timer = gsap.delayedCall(config.aceOfShadows.cardMoveDelay, () => {
            if (!this._isRunning) return;
            this.moveTopCard();
            this.timer?.restart(true);
        });
    }

    /**
     * Moves the top card from stack1 to stack2 with GSAP animation.
     * Uses timeline with keyframes for better performance (no per-frame calculations).
     */
    private moveTopCard(): void {
        const card = this.stack1.pop();
        if (!card) return;

        this.stack2.push(card);
        const stack2Index = this.stack2.length - 1;
        const targetX = this.endPos.x + (stack2Index * this.offsetX);
        const targetY = this.endPos.y - (stack2Index * this.offsetY);

        // Bring card to top for proper z-order
        this.addChild(card);

        const midX = (card.x + targetX) / 2;
        const midY = Math.min(card.y, targetY) - 120;

        const halfDuration = config.aceOfShadows.cardMoveDuration / 2;
        const tl = gsap.timeline();

        tl.to(card, {
            x: midX,
            y: midY,
            duration: halfDuration,
            ease: "power2.out"
        }, 0);
        tl.to(card, {
            x: targetX,
            y: targetY,
            duration: halfDuration,
            ease: "power2.in"
        }, halfDuration);

        tl.to(card.scale, {
            x: 0.6,
            y: 0.6,
            duration: halfDuration,
            ease: "sine.out"
        }, 0);
        tl.to(card.scale, {
            x: 0.5,
            y: 0.5,
            duration: halfDuration,
            ease: "sine.in"
        }, halfDuration);
    }

    public update(_delta: number): void {}

    public resize(_width: number, _height: number): void {
        this.calculatePositions();
    }

    public cleanup(): void {
        this._isRunning = false;
        if (this.timer) {
            this.timer.kill();
            this.timer = null;
        }
        this.cards.forEach(c => gsap.killTweensOf(c));
    }
}
