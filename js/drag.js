// Drag & drop engine using Pointer Events.
// onDrop(targetEl) called when a prop is dropped on an element
// whose dataset.accepts matches prop's dataset.type.

export function makeDraggable(prop, { onDrop, onEnterTarget, onLeaveTarget } = {}) {
  let startX=0, startY=0;
  let ghostX=0, ghostY=0;
  let lastTarget = null;
  let origLeft=0, origTop=0;

  prop.addEventListener('pointerdown', onDown);

  function onDown(e) {
    e.preventDefault();
    try { prop.setPointerCapture(e.pointerId); } catch {}
    const rect = prop.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    origLeft = rect.left; origTop = rect.top;
    prop.classList.add('dragging');
    // Freeze size and switch to fixed positioning at current location
    prop.style.position = 'fixed';
    prop.style.left = rect.left + 'px';
    prop.style.top = rect.top + 'px';
    prop.style.width = rect.width + 'px';
    prop.style.height = rect.height + 'px';
    prop.style.zIndex = 99999;
    prop.addEventListener('pointermove', onMove);
    prop.addEventListener('pointerup', onUp);
    prop.addEventListener('pointercancel', onUp);
  }

  function findTarget(x, y) {
    prop.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y);
    prop.style.pointerEvents = '';
    if (!el) return null;
    let node = el;
    while (node) {
      if (node.dataset && node.dataset.accepts) return node;
      node = node.parentElement;
    }
    return null;
  }

  function onMove(e) {
    ghostX = e.clientX - startX;
    ghostY = e.clientY - startY;
    prop.style.transform = `translate(${ghostX}px, ${ghostY}px)`;

    const t = findTarget(e.clientX, e.clientY);
    if (t !== lastTarget) {
      if (lastTarget) { lastTarget.classList.remove('hover'); onLeaveTarget?.(lastTarget); }
      lastTarget = t;
      if (t && t.dataset.accepts === prop.dataset.type) {
        t.classList.add('hover');
        onEnterTarget?.(t);
      }
    }
  }

  function onUp(e) {
    prop.removeEventListener('pointermove', onMove);
    prop.removeEventListener('pointerup', onUp);
    prop.removeEventListener('pointercancel', onUp);

    const target = findTarget(e.clientX, e.clientY);
    let hit = false;
    if (target && target.dataset.accepts === prop.dataset.type) {
      hit = true;
      onDrop?.(target);
    }
    if (lastTarget) lastTarget.classList.remove('hover');
    lastTarget = null;

    // Reset prop to tray
    prop.classList.remove('dragging');
    prop.style.position = '';
    prop.style.left = '';
    prop.style.top = '';
    prop.style.transform = '';
    prop.style.width = '';
    prop.style.height = '';
    prop.style.zIndex = '';
  }
}
