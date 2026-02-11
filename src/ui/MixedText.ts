import { Container, Text, Sprite, Assets, Texture, TextStyle, type TextStyleOptions } from 'pixi.js';
import gsap from 'gsap';

export interface MixedTextOptions {
  /** Text content with optional {token} placeholders for images. */
  text: string;
  /** Text styling options. */
  style?: TextStyleOptions | TextStyle;
  /** Map of token names to cached texture aliases (e.g., "happy" -> "emoji_happy"). */
  images: Record<string, string>;
  /** Maximum width before wrapping. Defaults to no wrapping. */
  maxWidth?: number;
  /** Horizontal spacing between text and image elements. */
  gap?: number;
  /** Vertical spacing between lines. */
  lineGap?: number;
  /** Fallback texture for missing images. If not provided, shows raw token text. */
  placeholderTexture?: Texture;
}

/**
 * Custom text renderer that supports embedding images (like emojis) inline with text.
 * Text wraps at word boundaries, images scale to match text height.
 * Supports typewriter animation effect.
 * Uses object pooling to reduce Text/Sprite creation overhead.
 */
export class MixedText extends Container {
  private _opts: MixedTextOptions;
  private _elements: (Text | Sprite)[] = [];
  private _originalScales: { x: number; y: number }[] = [];
  private _typewriteTimeline: gsap.core.Timeline | null = null;
  private _isTyping = false;

  // Object pools for reuse
  private _textPool: Text[] = [];
  private _spritePool: Sprite[] = [];

  // Cached line height to avoid repeated measurements
  private _cachedLineHeight: number | null = null;

  constructor(opts: MixedTextOptions) {
    super();
    this._opts = opts;
    this.build();
  }

  public setText(text: string): void {
    this._opts.text = text;
    this.stopTypewrite();
    this.build();
  }

  public setMaxWidth(maxWidth: number): void {
    this._opts.maxWidth = maxWidth;
    this.build();
  }

  /** Returns true if typewriter animation is currently playing */
  public get isTyping(): boolean {
    return this._isTyping;
  }

  /**
   * Starts typewriter animation - reveals elements one by one.
   * @param charDelay Delay between each element in seconds (default 0.05)
   * @param onComplete Callback when animation completes
   */
  public typewrite(charDelay = 0.05, onComplete?: () => void): void {
    this.stopTypewrite();

    if (this._elements.length === 0) {
      onComplete?.();
      return;
    }

    this._isTyping = true;

    // Store original scales before hiding (sprites have custom scales for sizing)
    this._originalScales = this._elements.map(el => ({ x: el.scale.x, y: el.scale.y }));

    // Hide all elements initially
    for (const el of this._elements) {
      el.alpha = 0;
      el.scale.set(el.scale.x, 0);
    }

    // Create timeline to reveal elements
    this._typewriteTimeline = gsap.timeline({
      onComplete: () => {
        this._isTyping = false;
        onComplete?.();
      }
    });

    for (let i = 0; i < this._elements.length; i++) {
      const el = this._elements[i];
      const targetScale = this._originalScales[i];

      this._typewriteTimeline.to(el, {
        alpha: 1,
        duration: 0.1,
        ease: 'power1.out',
      }, i * charDelay);

      this._typewriteTimeline.to(el.scale, {
        y: targetScale.y,
        duration: 0.15,
        ease: 'back.out(2)',
      }, i * charDelay);
    }
  }

  /** Stops typewriter animation and shows all text immediately */
  public stopTypewrite(): void {
    if (this._typewriteTimeline) {
      this._typewriteTimeline.kill();
      this._typewriteTimeline = null;
    }
    this._isTyping = false;

    // Show all elements and restore original scales
    for (let i = 0; i < this._elements.length; i++) {
      const el = this._elements[i];
      el.alpha = 1;
      const scale = this._originalScales[i];
      if (scale) {
        el.scale.set(scale.x, scale.y);
      }
    }
  }

  /** Skips to the end of the typewriter animation */
  public completeTypewrite(): void {
    if (this._typewriteTimeline) {
      this._typewriteTimeline.progress(1);
    }
  }

  /** Gets a Text object from pool or creates a new one */
  private getTextFromPool(content: string, style?: TextStyleOptions | TextStyle): Text {
    let t = this._textPool.pop();
    if (t) {
      t.text = content;
      t.alpha = 1;
      t.scale.set(1);
    } else {
      t = new Text({ text: content, style });
    }
    return t;
  }

  /** Gets a Sprite object from pool or creates a new one */
  private getSpriteFromPool(texture: Texture): Sprite {
    let sp = this._spritePool.pop();
    if (sp) {
      sp.texture = texture;
      sp.alpha = 1;
      sp.scale.set(1);
    } else {
      sp = new Sprite(texture);
    }
    return sp;
  }

  /** Returns elements to pool for reuse */
  private returnToPool(): void {
    for (const el of this._elements) {
      this.removeChild(el);
      if (el instanceof Text) {
        this._textPool.push(el);
      } else if (el instanceof Sprite) {
        this._spritePool.push(el);
      }
    }
    this._elements = [];
  }

  /** Measures and caches line height based on current style */
  private getLineHeight(): number {
    if (this._cachedLineHeight !== null) {
      return this._cachedLineHeight;
    }

    const measure = new Text({ text: 'Mg', style: this._opts.style });
    this._cachedLineHeight = measure.height;
    measure.destroy();

    return this._cachedLineHeight;
  }

  private build(): void {
    this.returnToPool();

    const { text, style, images, maxWidth = Infinity, gap = 6, lineGap = 10, placeholderTexture } = this._opts;
    const parts = text.split(/({.*?})/g).filter(Boolean);

    const lineHeight = this.getLineHeight();

    let x = 0;
    let y = 0;

    const newline = (): void => {
      x = 0;
      y += lineHeight + lineGap;
    };

    const placeNode = (node: Text | Sprite): void => {
      if (x > 0 && x + node.width > maxWidth) {
        newline();
      }

      node.x = x;
      node.anchor.set(0, 0.5);
      node.y = y + lineHeight / 2;
      node.eventMode = 'none';
      node.cullable = true;
      this.addChild(node);
      this._elements.push(node);
      x += node.width + gap;
    };

    for (const part of parts) {
      const isToken = part.startsWith('{') && part.endsWith('}');

      if (isToken) {
        const key = part.slice(1, -1);
        const alias = images[key];
        const tex = alias && Assets.cache.has(alias)
          ? (Assets.cache.get(alias) as Texture)
          : undefined;

        const finalTex = tex ?? placeholderTexture;
        if (finalTex) {
          const sp = this.getSpriteFromPool(finalTex);
          const targetH = lineHeight * 0.9;
          const scale = targetH / Math.max(1, sp.texture.height);
          sp.scale.set(scale);
          placeNode(sp);
        } else {
          placeNode(this.getTextFromPool(part, style));
        }

        continue;
      }

      const chunks = part.split(/(\s+)/g).filter(Boolean);

      for (const chunk of chunks) {
        const t = this.getTextFromPool(chunk, style);

        if (x > 0 && x + t.width > maxWidth) {
          if (chunk.trim().length === 0) {
            this._textPool.push(t); // Return unused text to pool
            continue;
          }
          newline();
        }

        placeNode(t);
      }
    }
  }

  /** Cleans up pools and releases resources */
  public override destroy(options?: boolean | { children?: boolean; texture?: boolean; textureSource?: boolean }): void {
    this.stopTypewrite();

    // Destroy pooled objects
    for (const t of this._textPool) {
      t.destroy();
    }
    for (const sp of this._spritePool) {
      sp.destroy();
    }
    this._textPool = [];
    this._spritePool = [];
    this._elements = [];
    this._cachedLineHeight = null;

    super.destroy(options);
  }
}
