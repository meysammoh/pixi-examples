import { SceneManager } from '../SceneManager';
import { MenuScene } from '../scenes/MenuScene';
import { Button } from './Button';

export function createBackButton(): Button {
  const btn = new Button({
    label: '← Back',
    width: 120,
    height: 44,
    fontSize: 22,
    color: 0x2a2a2a,
    hoverColor: 0x444444,
    onClick: () => SceneManager.changeScene(new MenuScene()),
  });

  btn.position.set(SceneManager.width - 80, 40);
  return btn;
}
