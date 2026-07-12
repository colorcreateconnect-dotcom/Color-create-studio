// ============================================================================
// input.js — keyboard handling (movement + interact).
// ============================================================================

/* `CCS` is the shared global created in core.js (loaded first). */

CCS.input = (() => {
  const keys = new Set();
  let typingInChat = false;

  function init() {
    window.addEventListener('keydown', (e) => {
      // Don't hijack keys while typing in a text field (chat, mod inputs).
      if (isTyping(e.target)) return;

      const k = e.key.toLowerCase();
      keys.add(k);

      if (k === 'e') { CCS.events.emit('key-interact'); e.preventDefault(); }
      if (k === 'escape') { CCS.player?.cancelActivity(); }
      // Prevent arrow keys / space from scrolling the page
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    });

    window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => keys.clear());
  }

  function isTyping(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }

  // Returns a normalized movement vector {x, y} in -1..1.
  function axis() {
    let x = 0, y = 0;
    if (keys.has('arrowleft') || keys.has('a')) x -= 1;
    if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowup') || keys.has('w')) y -= 1;
    if (keys.has('arrowdown') || keys.has('s')) y += 1;
    if (x && y) { const n = Math.SQRT1_2; x *= n; y *= n; } // diagonal not faster
    return { x, y };
  }

  return { init, axis, keys };
})();
