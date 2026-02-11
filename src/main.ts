import { Application, Assets, Text, Ticker, extensions, ExtensionType } from 'pixi.js';
import { SceneManager } from './SceneManager';
import { MenuScene } from './scenes/MenuScene';
import { LoadingScene } from './scenes/LoadingScene';
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';
import { manifest } from './manifest';
import { config } from './config';

/** Registers shader file extensions to be loaded as plain text */
extensions.add({
  extension: ExtensionType.LoadParser,
  name: 'load-shader',
  test: (url: string) => /\.(vert|frag|glsl)$/i.test(url),
  load: async (url: string) => (await fetch(url)).text(),
});

/** Registers audio file extensions - returns URL for Howler to load */
extensions.add({
  extension: ExtensionType.LoadParser,
  name: 'load-audio',
  test: (url: string) => /\.(mp3|webm|ogg|wav)$/i.test(url),
  load: async (url: string) => url,
});

gsap.registerPlugin(PixiPlugin);

const { width: DESIGN_W, height: DESIGN_H } = config.design;

/**
 * Main application class responsible for initializing Pixi.js, managing the canvas,
 * and bootstrapping the scene management system.
 */
export class Main {
    private app: Application;
    private _loadingInterval: ReturnType<typeof setInterval> | null = null;
    private _loadingTimeout: ReturnType<typeof setTimeout> | null = null;
    private _fpsTickerCallback: ((ticker: Ticker) => void) | null = null;

    constructor() {
        this.app = new Application();
    }

    /**
     * Initializes the application with a fixed design resolution (720x1280).
     * Sets up responsive canvas scaling, assets, scene manager, and event listeners.
     */
    public async init() {
        await this.app.init({
            width: DESIGN_W,
            height: DESIGN_H,
            background: '#1099bb',
            antialias: true,
        });

        document.body.style.margin = '0';
        document.body.style.overflow = 'hidden';
        document.body.appendChild(this.app.canvas);

        this.app.canvas.style.display = 'block';
        this.app.canvas.style.transformOrigin = 'top left';

        this.createFPSCounter();
        await Assets.init({ manifest });
        SceneManager.init(this.app);

        this.applyFixedCanvasScale();
        window.addEventListener('resize', this.applyFixedCanvasScale);
        window.addEventListener('orientationchange', this.applyFixedCanvasScale);

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', this.applyFixedCanvasScale);
            window.visualViewport.addEventListener('scroll', this.applyFixedCanvasScale);
        }

        SceneManager.resize();

        // Request fullscreen on first user interaction (browsers require user gesture)
        if (config.display.fullscreen) {
            this.setupFullscreenOnInteraction();
        }

        // Show loading screen with logo
        const loadingScene = new LoadingScene();
        SceneManager.changeScene(loadingScene);

        // Simulate loading progress then transition to menu
        let progress = 0;
        this._loadingInterval = setInterval(() => {
            progress += 0.02 + Math.random() * 0.03;
            if (progress >= 1) {
                progress = 1;
                loadingScene.setProgress(progress);
                if (this._loadingInterval) {
                    clearInterval(this._loadingInterval);
                    this._loadingInterval = null;
                }
                this._loadingTimeout = setTimeout(() => {
                    this._loadingTimeout = null;
                    SceneManager.changeScene(new MenuScene());
                }, 500);
            } else {
                loadingScene.setProgress(progress);
            }
        }, 50);
    }

    /**
     * Scales and centers the canvas to fit the viewport while maintaining aspect ratio.
     * Uses visual viewport API for proper mobile browser toolbar handling.
     * Canvas never upscales beyond 1:1 (720x1280) to preserve pixel quality.
     */
    private applyFixedCanvasScale = (): void => {
        const vv = window.visualViewport;
        const w = Math.max(1, vv?.width ?? window.innerWidth);
        const h = Math.max(1, vv?.height ?? window.innerHeight);

        const scale = Math.min(w / DESIGN_W, h / DESIGN_H, 1);
        const cssW = Math.round(DESIGN_W * scale);
        const cssH = Math.round(DESIGN_H * scale);

        this.app.canvas.style.width = `${cssW}px`;
        this.app.canvas.style.height = `${cssH}px`;

        const offsetLeft = vv?.offsetLeft ?? 0;
        const offsetTop = vv?.offsetTop ?? 0;
        const x = Math.round(offsetLeft + (w - cssW) * 0.5);
        const y = Math.round(offsetTop + (h - cssH) * 0.5);

        this.app.canvas.style.position = 'absolute';
        this.app.canvas.style.left = `${x}px`;
        this.app.canvas.style.top = `${y}px`;
    };


    /** Requests fullscreen on first click on canvas (required by browsers). */
    private setupFullscreenOnInteraction(): void {
        // Check if fullscreen is supported
        if (!document.documentElement.requestFullscreen) {
            console.warn('Fullscreen API not supported');
            return;
        }

        const requestFullscreen = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {
                    // Silently fail - user may have denied or browser blocked it
                });
            }
        };

        // Only use click on canvas - most reliable user gesture
        this.app.canvas.addEventListener('click', requestFullscreen, { once: true });
    }

    /** Creates and displays an FPS counter in the top-left corner of the canvas. */
    private createFPSCounter() {
        const fpsText = new Text({
            text: 'FPS: --',
            style: {
                fontFamily: 'monospace',
                fontSize: 18,
                fill: '#00ff00',
                fontWeight: 'bold',
            }
        });

        fpsText.position.set(10, 10);
        fpsText.zIndex = 10000;
        this.app.stage.sortableChildren = true;
        this.app.stage.addChild(fpsText);

        let elapsed = 0;
        this._fpsTickerCallback = (ticker: Ticker) => {
            elapsed += ticker.deltaMS;
            if (elapsed >= 1000) {
                const fps = this.app.ticker.FPS;
                fpsText.text = `FPS: ${Math.round(fps)}`;
                elapsed = 0;
            }
        };
        this.app.ticker.add(this._fpsTickerCallback);
    }

    /** Cleans up all event listeners, timers, and resources. */
    public destroy(): void {
        // Clear loading timers
        if (this._loadingInterval) {
            clearInterval(this._loadingInterval);
            this._loadingInterval = null;
        }
        if (this._loadingTimeout) {
            clearTimeout(this._loadingTimeout);
            this._loadingTimeout = null;
        }

        // Remove FPS ticker callback
        if (this._fpsTickerCallback) {
            this.app.ticker.remove(this._fpsTickerCallback);
            this._fpsTickerCallback = null;
        }

        // Remove viewport event listeners
        window.removeEventListener('resize', this.applyFixedCanvasScale);
        window.removeEventListener('orientationchange', this.applyFixedCanvasScale);

        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this.applyFixedCanvasScale);
            window.visualViewport.removeEventListener('scroll', this.applyFixedCanvasScale);
        }

        // Destroy the Pixi application
        this.app.destroy(true, { children: true, texture: true });
    }
}

const game = new Main();
game.init();
