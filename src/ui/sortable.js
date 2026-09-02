// Réagencement par glisser-déposer, au doigt comme à la souris (Pointer Events).
// Chaque enfant réordonnable porte data-sid ; le glissement démarre sur la poignée.
// Les écouteurs de déplacement vivent sur window : déplacer l'élément dans le DOM
// libère la capture du pointeur, et un pointerup posé sur le conteneur serait perdu.

export function makeSortable(container, { handle = '.grip', onEnd } = {}) {
  container.addEventListener('pointerdown', (e) => {
    const grip = e.target.closest(handle);
    if (!grip || !container.contains(grip) || e.button > 0) return;
    const item = grip.closest('[data-sid]');
    if (!item || item.parentElement !== container) return;
    e.preventDefault();

    const drag = { item, startY: e.clientY, dy: 0, moved: false };
    item.classList.add('dragging');
    container.classList.add('is-sorting');

    const onMove = (ev) => {
      ev.preventDefault();
      drag.dy = ev.clientY - drag.startY;
      drag.item.style.transform = `translateY(${drag.dy}px)`;
      const r = drag.item.getBoundingClientRect();
      const mid = r.top + r.height / 2;

      for (const other of [...container.children]) {
        if (other === drag.item || !other.dataset.sid) continue;
        const o = other.getBoundingClientRect();
        const center = o.top + o.height / 2;
        const itemIsBefore = !!(other.compareDocumentPosition(drag.item) & Node.DOCUMENT_POSITION_PRECEDING);
        if (drag.dy < 0 && mid < center && !itemIsBefore) {
          container.insertBefore(drag.item, other); reset(ev.clientY); break;
        }
        if (drag.dy > 0 && mid > center && itemIsBefore) {
          container.insertBefore(drag.item, other.nextSibling); reset(ev.clientY); break;
        }
      }
    };

    function reset(clientY) {
      drag.moved = true;
      drag.startY = clientY;
      drag.dy = 0;
      drag.item.style.transform = '';
    }

    const stop = () => {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', stop);
      removeEventListener('pointercancel', stop);
      drag.item.style.transform = '';
      drag.item.classList.remove('dragging');
      container.classList.remove('is-sorting');
      if (drag.moved) onEnd?.([...container.children].map((c) => c.dataset.sid).filter(Boolean));
    };

    addEventListener('pointermove', onMove, { passive: false });
    addEventListener('pointerup', stop);
    addEventListener('pointercancel', stop);
  });
  return container;
}

/** Applique un ordre enregistré à une liste d'éléments identifiés par `id`. */
export function applyOrder(items, order) {
  if (!order?.length) return items;
  const byId = new Map(items.map((it) => [String(it.id), it]));
  const out = [];
  for (const id of order) if (byId.has(id)) { out.push(byId.get(id)); byId.delete(id); }
  return [...out, ...byId.values()];
}
