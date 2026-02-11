import { Container, Assets, Sprite, Graphics, Text, Texture } from 'pixi.js';
import gsap from 'gsap';
import { MixedText } from '../ui/MixedText';
import { SceneManager, type IScene } from '../SceneManager';
import { createBackButton } from '../ui/BackButton';
import { config } from '../config';

interface EmojiData { name: string; url: string; }
interface AvatarData { name: string; url: string; position: 'left' | 'right'; }
interface DialogueLine { name: string; text: string; }
interface MagicWordsResponse { dialogue: DialogueLine[]; emojies: EmojiData[]; avatars: AvatarData[]; }

/**
 * Task 2: "Magic Words"
 * Dialogue system with character avatars and inline emoji support.
 * Fetches data from API and renders text with embedded images using MixedText.
 */
export class MagicWordsScene extends Container implements IScene {
  private _apiUrl = '/magicwords.json';
  private _dialogueData: DialogueLine[] = [];
  private _currentIndex = 0;
  private _emojiMap: Record<string, string> = {};
  private _avatarMap: Map<string, AvatarData> = new Map();
  private _isLoaded = false;
  private _emojiPlaceholder: Texture | null = null;
  private _avatarPlaceholder: Texture | null = null;

  private _bg: Graphics = new Graphics();
  private _loadingText: Text = new Text({ text: 'Loading...', style: { fill: 'white', fontSize: 32 } });
  private _avatarSprite: Sprite = new Sprite();
  private _dialogueContainer: Container = new Container();
  private _box: Graphics = new Graphics();
  private _nameLabel: Text = new Text({ text: '', style: { fill: 'white', fontSize: 24, fontWeight: 'bold' } });
  private _textContainer: Container = new Container();
  private _continueText: Text = new Text({ text: 'Click to continue...', style: { fill: '#cccccc', fontSize: 16 } });
  private _currentMixedText: MixedText | null = null;

  private _boxWidth = 660;
  private _boxMinHeight = 200;
  private _padX = 30;
  private _padTop = 70;
  private _padBottom = 50;

  private _onTap = () => this.nextSlide();

  constructor() {
    super();
    this._bg.rect(0, 0, SceneManager.width, SceneManager.height).fill(0x2c3e50);
    this._loadingText.anchor.set(0.5);
    this._loadingText.position.set(SceneManager.width / 2, SceneManager.height / 2);
    this.addChild(this._bg);
    this.addChild(this._loadingText);
  }

  /**
   * Loads an image from URL into a Pixi Texture and caches it.
   * Handles extensionless URLs (e.g., DiceBear avatars) using fetch → blob → ImageBitmap.
   */
  private async loadTextureToCache(alias: string, url: string): Promise<Texture | null> {
    if (Assets.cache.has(alias)) {
      return Assets.cache.get(alias) as Texture;
    }

    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return null;

      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      // Copy bitmap to canvas, then close bitmap immediately
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      // Create texture from canvas (data persists until GPU upload)
      const tex = Texture.from(canvas);
      Assets.cache.set(alias, tex);

      return (Assets.cache.get(alias) as Texture | undefined) ?? null;
    } catch {
      return null;
    }
  }

  /** Fetches dialogue data from API and preloads all emoji and avatar textures. */
  public  async init(): Promise<void> {
    try {
      this._emojiPlaceholder = Assets.get('placeholder-emoji');
      this._avatarPlaceholder = Assets.get('placeholder-avatar');

      const response = await fetch(this._apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: MagicWordsResponse = await response.json();
      this._dialogueData = data.dialogue;

      for (const e of data.emojies) {
        const alias = `emoji_${e.name}`;
        let tex = await this.loadTextureToCache(alias, e.url);

        if (!tex && this._emojiPlaceholder) {
          console.warn(`[MagicWords] Emoji "${e.name}" could not be loaded; using placeholder.`);
          Assets.cache.set(alias, this._emojiPlaceholder);
        }
        this._emojiMap[e.name] = alias;
      }

      for (const a of data.avatars) {
        const alias = `avatar_${a.name}`;
        this._avatarMap.set(a.name, a);

        let tex = await this.loadTextureToCache(alias, a.url);
        if (!tex && this._avatarPlaceholder) {
          console.warn(`[MagicWords] Avatar "${a.name}" could not be loaded; using placeholder.`);
          Assets.cache.set(alias, this._avatarPlaceholder);
        }
      }

      this._isLoaded = true;
      this.removeChild(this._loadingText);
      this.createSceneUI();
      this.showDialogue(0);
      this.resize(SceneManager.width, SceneManager.height);
    } catch (err) {
      console.error('[MagicWords] Fatal error:', err);
      this._loadingText.text = 'Error loading scene.\nCheck console.';
    }
  }

  private createSceneUI(): void {
    this.addChild(createBackButton());

    this._avatarSprite.anchor.set(0.5, 1);
    this._avatarSprite.eventMode = 'none';
    this.addChild(this._avatarSprite);

    this._dialogueContainer.addChild(this._box);
    this._dialogueContainer.addChild(this._nameLabel);
    this._dialogueContainer.addChild(this._textContainer);

    this._continueText.anchor.set(1);
    this._dialogueContainer.addChild(this._continueText);

    gsap.to(this._continueText, {
      alpha: 0.2,
      duration: 0.5,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });

    this.addChild(this._dialogueContainer);

    this._dialogueContainer.x = (SceneManager.width - this._boxWidth) / 2;
    this._dialogueContainer.y = SceneManager.height - this._padX;

    this.redrawDialogueBox(this._boxMinHeight);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointertap', this._onTap);
  }

  /**
   * Redraws the dialogue box extending upward from the container's origin.
   * Positions child elements (name, text, continue prompt) relative to box height.
   */
  private redrawDialogueBox(height: number): void {
    const h = Math.max(this._boxMinHeight, Math.ceil(height));

    this._box.clear();
    this._box.roundRect(0, -h, this._boxWidth, h, 20).fill({ color: 0x000000, alpha: 0.8 });
    this._box.stroke({ width: 4, color: 0xffffff });

    this._nameLabel.position.set(this._padX, -h + 20);
    this._textContainer.position.set(this._padX, -h + this._padTop);
    this._continueText.position.set(this._boxWidth - 20, -18);
  }

  /**
   * Displays dialogue at the given index with avatar and MixedText rendering.
   * Waits one frame for layout before measuring bounds and adjusting box size.
   */
  private showDialogue(index: number): void {
    if (!this._isLoaded) return;

    if (index >= this._dialogueData.length) {
      this._currentIndex = 0;
      index = 0;
    }

    const line = this._dialogueData[index];
    this._nameLabel.text = line.name;

    const avatarInfo = this._avatarMap.get(line.name);
    this._avatarSprite.visible = true;

    const avatarAlias = `avatar_${line.name}`;
    let tex: Texture;
    if (Assets.cache.has(avatarAlias)) {
      tex = Assets.cache.get(avatarAlias) as Texture;
    } else if (this._avatarPlaceholder) {
      tex = this._avatarPlaceholder;
    } else {
      tex = Texture.EMPTY;
    }
    this._avatarSprite.texture = tex;

    const position = avatarInfo?.position ?? 'left';
    this._avatarSprite.scale.set(position === 'right' ? -1 : 1, 1);

    this._textContainer.removeChildren();

    const maxTextWidth = this._boxWidth - this._padX * 2;

    const mixedText = new MixedText({
      text: line.text,
      style: {
        fontFamily: 'Arial',
        fontSize: 28,
        fill: 'white',
      },
      images: this._emojiMap,
      maxWidth: maxTextWidth,
      gap: 6,
      lineGap: 8,
      placeholderTexture: this._emojiPlaceholder ?? undefined,
    });

    this._textContainer.addChild(mixedText);
    this._currentMixedText = mixedText;

    requestAnimationFrame(() => {
      const bounds = mixedText.getLocalBounds();
      const neededHeight = this._padTop + bounds.height + this._padBottom;
      this.redrawDialogueBox(neededHeight);
      this.updateAvatarPosition(avatarInfo);
      // Start typewriter animation after layout is calculated
      mixedText.typewrite(config.magicWords.typewriteDelay);
    });
  }

  private nextSlide(): void {
    // If still typing, complete the animation first
    if (this._currentMixedText?.isTyping) {
      this._currentMixedText.completeTypewrite();
      return;
    }

    this._currentIndex += 1;
    this.showDialogue(this._currentIndex);
  }

  /** Positions avatar at the top edge of the dialogue box. */
  private updateAvatarPosition(avatarInfo: AvatarData | undefined): void {
    const boxBounds = this._box.getLocalBounds();
    const boxHeight = Math.abs(boxBounds.height);
    const boxX = (SceneManager.width - this._boxWidth) / 2;

    const position = avatarInfo?.position ?? 'left';
    this._avatarSprite.x = position === 'left' ? boxX + 100 : boxX + this._boxWidth - 100;
    this._avatarSprite.y = this._dialogueContainer.y - boxHeight;
  }

  public update(_delta: number): void {}

  public resize(_width: number, _height: number): void {
    this._bg.clear();
    this._bg.rect(0, 0, SceneManager.width, SceneManager.height).fill(0x2c3e50);

    this._dialogueContainer.x = (SceneManager.width - this._boxWidth) / 2;
    this._dialogueContainer.y = SceneManager.height - this._padX;

    if (!this._isLoaded) return;

    const line = this._dialogueData[this._currentIndex];
    if (!line) return;

    const info = this._avatarMap.get(line.name);
    this.updateAvatarPosition(info);
  }

  public cleanup(): void {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this._avatarSprite);
    gsap.killTweensOf(this._continueText);
    this.off('pointertap', this._onTap);
    this.destroy({ children: true });
  }
}
