// Coque commune : barre du haut, panneau latéral (ou tiroir en portrait), zone principale.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { navigate } from '../router.js';

let drawerOpen = false;
export function closeDrawer() { drawerOpen = false; }

const narrow = () => matchMedia('(max-width: 900px)').matches;

export function shell({ title, subtitle, back, sidebar, main, actions = [] }) {
  const hasSidebar = !!sidebar;
  const showSidebar = hasSidebar && store.settings.sidebar !== false;
  const root = h('div', { class: 'shell' + (showSidebar ? '' : ' no-sidebar') });

  const backdrop = () => h('div', { class: 'drawer-backdrop', onclick: closeDrawerNow });
  function openDrawerNow() { drawerOpen = true; root.classList.add('drawer-open'); if (!root.querySelector('.drawer-backdrop')) root.append(backdrop()); }
  function closeDrawerNow() { drawerOpen = false; root.classList.remove('drawer-open'); root.querySelector('.drawer-backdrop')?.remove(); }
  function toggle() {
    if (narrow()) { drawerOpen ? closeDrawerNow() : openDrawerNow(); }
    else store.setSetting('sidebar', !showSidebar);
  }

  const topbar = h('div', { class: 'topbar' },
    hasSidebar ? h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Panneau des salles', onclick: toggle }, icon('menu')) : null,
    back != null ? h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Retour', onclick: () => navigate(back) }, icon('back')) : null,
    h('div', { class: 'topbar-title' },
      h('div', { class: 't1' }, title),
      subtitle ? h('div', { class: 't2' }, subtitle) : null),
    actions,
    h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Accueil', onclick: () => navigate('') }, icon('home')));

  const body = h('div', { class: 'body' },
    hasSidebar ? h('aside', { class: 'sidebar' }, sidebar) : null,
    h('div', { class: 'main' }, h('div', { class: 'main-inner' }, main)));

  root.append(topbar, body);
  if (drawerOpen && hasSidebar && narrow()) openDrawerNow();
  return root;
}
