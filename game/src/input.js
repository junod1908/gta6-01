// Input: the keyboard state the world reads every step, plus the edge-triggered
// actions (enter a car, punch, pause) that fire once per press. The mouse drags
// the camera; a click fires the pistol while playing.
export const ACTION_ENTER = 1;
export const ACTION_PUNCH = 2;
export const ACTION_PAUSE = 4;
export const ACTION_CONFIRM = 8;
export const ACTION_MUTE = 16;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let yawDelta = 0;
  let pitchDelta = 0;
  let clicked = false;

  const code = (e) => e.code;
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code(e))) e.preventDefault();
    if (e.repeat) return;
    keys.add(code(e));
    if (code(e) === 'KeyE') actions |= ACTION_ENTER;
    if (code(e) === 'KeyF') actions |= ACTION_PUNCH;
    if (code(e) === 'KeyP' || code(e) === 'Escape') actions |= ACTION_PAUSE;
    if (code(e) === 'Enter' || code(e) === 'Space') actions |= ACTION_CONFIRM;
    if (code(e) === 'KeyM') actions |= ACTION_MUTE;
  });
  window.addEventListener('keyup', (e) => keys.delete(code(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    clicked = true;
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    yawDelta += e.clientX - lastX;
    pitchDelta += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { dragging = false; });

  return {
    get forward() { return keys.has('KeyW') || keys.has('ArrowUp'); },
    get back() { return keys.has('KeyS') || keys.has('ArrowDown'); },
    get left() { return keys.has('KeyA') || keys.has('ArrowLeft'); },
    get right() { return keys.has('KeyD') || keys.has('ArrowRight'); },
    get run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    get jump() { return keys.has('Space'); },
    get handbrake() { return keys.has('Space'); },
    // The mouse: a drag orbits the camera, a click fires the pistol.
    takeLook() {
      const look = { yaw: yawDelta * 0.005, pitch: pitchDelta * 0.004 };
      yawDelta = 0;
      pitchDelta = 0;
      return look;
    },
    takeClick() {
      const was = clicked;
      clicked = false;
      return was;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
