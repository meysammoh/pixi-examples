import { Application, Assets, Container, Ticker } from 'pixi.js';
import { LoadingScene } from './scenes/LoadingScene';
import { config } from './config';

export interface IScene extends Container {
  update(delta: number): void;
  resize(width: number, height: number): void;
  cleanup(): void;
  
  // Optional: Scenes with heavy async init implement this
  init?(): Promise<void>;
}


export class SceneManager {
  private static _app: Application;
  public static get app(): Application { return this._app; }
  private static currentScene?: IScene;
  private static loadingScene: LoadingScene;
  private static readonly DESIGN_W = config.design.width;
  private static readonly DESIGN_H = config.design.height;

  public static async init(app: Application) {
    this._app = app;
    
    // 1. Initialize the loading scene immediately
    this.loadingScene = new LoadingScene();
    
    this._app.ticker.add(this.update, this);
  }

  public static get width(): number { return this.DESIGN_W; }
  public static get height(): number { return this.DESIGN_H; }

  private static readonly MIN_LOADING_TIME = config.loading.minDisplayTime;

  /**
   * Changes to a new scene with optional bundle loading and loading screen.
   * @param sceneFactory Factory function that creates the scene (called after bundle loads), or scene instance.
   * @param bundleId The asset bundle key from your manifest to load. Loading screen only shows if bundle is provided.
   */
public static async changeScene(
  sceneFactory: IScene | (() => IScene),
  bundleId?: string,
): Promise<void> {
  const showLoadingScreen = !!bundleId;
  const startTime = Date.now();

  // 1. Show LoadingScene if bundle needed
  if (showLoadingScreen) {
    this.loadingScene.setProgress(0);
    this._app.stage.addChild(this.loadingScene);
  }

  // 2. Cleanup current scene
  if (this.currentScene) {
    this._app.stage.removeChild(this.currentScene);
    this.currentScene.cleanup();
    this.currentScene.destroy({ children: true });
    this.currentScene = undefined;
  }

  // 3. Load bundle (if provided)
  if (bundleId) {
    try {
      await Assets.loadBundle(bundleId, (progress) => {
        this.loadingScene.setProgress(progress);
      });
    } catch (e) {
      console.error("Failed to load bundle", bundleId, e);
    }
    this.loadingScene.setProgress(1); // Always hit 100%
    
    // Min display time
    const elapsed = Date.now() - startTime;
    if (elapsed < this.MIN_LOADING_TIME) {
      await new Promise(resolve =>
        setTimeout(resolve, this.MIN_LOADING_TIME - elapsed)
      );
    }
  }

  // 4. Create new scene
  const newScene = typeof sceneFactory === "function" ? sceneFactory() : sceneFactory;

  // 5. **GENERIC MAGIC**: Await scene's async init if it exists
  if (typeof newScene.init === 'function') {
    await newScene.init(); // Loading screen stays visible during this!
  }

  // 6. Now safe to swap
  if (showLoadingScreen) {
    this._app.stage.removeChild(this.loadingScene);
  }
  
  this.currentScene = newScene;
  this._app.stage.addChild(this.currentScene);
  this.currentScene.resize(this.DESIGN_W, this.DESIGN_H);
}


  public static resize() {
    this.currentScene?.resize(this.DESIGN_W, this.DESIGN_H);
    this.loadingScene?.resize(this.DESIGN_W, this.DESIGN_H);
  }

  private static update(ticker: Ticker) {
    this.currentScene?.update(ticker.deltaTime);
    this.loadingScene?.update(ticker.deltaTime);
  }
}