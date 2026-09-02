// Réglages : thème, taille du texte, panneau latéral, sauvegarde / restauration de l'état MJ.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { shell } from './shell.js';
import { confirmPopup, openPopup } from '../ui/popup.js';
import { toast } from '../ui/toast.js';
import { checkForUpdate, applyUpdate } from '../update.js';
import { enhancedOn } from '../variant.js';
import { icon as ic } from '../icons.js';

export async function settingsView() {
  const s = store.settings;
  const counts = store.counts();

  const seg = (options, current, onPick) => h('div', { class: 'seg' }, options.map(([v, label]) =>
    h('button', { class: 'btn' + (v === current ? ' is-on' : ''), onclick: () => onPick(v) }, label)));

  const main = h('div', null,
    h('div', { class: 'hero' }, h('h1', null, 'Réglages')),

    row('Thème', 'Sombre pour la table, clair en plein jour.',
      seg([['dark', 'Sombre'], ['light', 'Clair']], s.theme, (v) => store.setSetting('theme', v))),
    row('Taille du texte', null,
      seg([[0.9, 'A−'], [1, 'A'], [1.15, 'A+'], [1.3, 'A++']], s.fontScale, (v) => store.setSetting('fontScale', v))),
    row('Panneau des salles', 'Affiché en permanence sur iPad en paysage.',
      seg([[true, 'Oui'], [false, 'Non']], s.sidebar !== false, (v) => store.setSetting('sidebar', v))),

    row(h('span', null, icon('star', 'star-inline'), ' Version Améliorée'),
      'Créatures épiques, enquêtes et clés narratives, signalées par une étoile. Désactivée, l’aventure revient à sa version d’origine ; les pourcentages suivent.',
      seg([[true, 'Oui'], [false, 'Non']], enhancedOn(), (v) => store.setSetting('enhanced', v))),

    h('h2', { style: { margin: '28px 0 8px', fontSize: '1.1em' } }, 'État de la partie sur cet appareil'),
    h('p', { class: 'muted' }, `${counts.hidden} éléments masqués · ${counts.overrides} textes modifiés · ${counts.notes} annotations et notes.`),
    h('div', { class: 'toolbar', style: { marginTop: '10px' } },
      h('button', { class: 'btn', onclick: exportState }, icon('copy'), 'Exporter (JSON)'),
      h('button', { class: 'btn', onclick: importState }, icon('refresh'), 'Importer'),
      h('button', { class: 'btn btn-danger', onclick: async () => {
        if (await confirmPopup({ title: 'Tout réinitialiser', text: 'Supprimer tous les masquages, annotations et notes de séance de toutes les aventures ? Les réglages sont conservés.', okLabel: 'Tout effacer', danger: true })) {
          store.resetAll(); toast('État réinitialisé');
        }
      } }, icon('trash'), 'Tout réinitialiser')),

    h('h2', { style: { margin: '28px 0 8px', fontSize: '1.1em' } }, 'Application'),
    h('p', { class: 'muted' }, `Version ${self.APP_VERSION}. `,
      'Les données (aventures, monstres) sont embarquées dans l’app ; les annotations restent sur cet appareil. ',
      'Pour installer sur iPad : Safari → Partager → « Sur l’écran d’accueil ». ',
      'L’app cherche une nouvelle version à chaque ouverture et à chaque retour au premier plan.'),
    h('div', { class: 'toolbar', style: { marginTop: '10px' } },
      h('button', { class: 'btn btn-primary', onclick: async () => {
        toast('Recherche…');
        const found = await checkForUpdate({ force: true });
        if (found) toast('Nouvelle version trouvée');
        else toast('Tu es déjà à jour');
      } }, icon('refresh'), 'Vérifier les mises à jour'),
      h('button', { class: 'btn', onclick: () => { toast('Mise à jour…'); applyUpdate(); } },
        icon('forward'), 'Forcer la mise à jour')),
    h('p', { class: 'muted small', style: { marginTop: '10px' } },
      'Mettre à jour ne touche pas à tes notes, coches, annotations et statuts : ils sont ',
      'enregistrés sur l’iPad, en dehors du cache.'),
  );

  return shell({ title: 'Réglages', back: '', main });
}

function row(label, help, control) {
  return h('div', { class: 'settings-row' },
    h('div', { class: 'label' }, label, help ? h('div', { class: 'small' }, help) : null),
    control);
}

function exportState() {
  const json = store.exportJSON();
  openPopup({
    title: 'Export de l’état',
    subtitle: 'Copie ce texte dans une note pour le sauvegarder ou le transférer.',
    render: () => h('div', null,
      h('textarea', { class: 'textarea', style: { minHeight: '260px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.8em' }, value: json, readonly: true }),
      h('div', { class: 'toolbar', style: { marginTop: '10px' } },
        h('button', { class: 'btn btn-primary', onclick: async () => {
          try { await navigator.clipboard.writeText(json); toast('Copié dans le presse-papiers'); }
          catch { toast('Sélectionne le texte et copie-le manuellement'); }
        } }, icon('copy'), 'Copier'))),
  });
}

function importState() {
  let text = '';
  openPopup({
    title: 'Importer un état',
    subtitle: 'Colle ici un export JSON. L’état actuel sera remplacé.',
    render: (api) => h('div', null,
      h('textarea', { class: 'textarea', style: { minHeight: '220px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.8em' }, placeholder: '{ … }', oninput: (e) => { text = e.target.value; } }),
      h('div', { class: 'toolbar', style: { marginTop: '10px' } },
        h('button', { class: 'btn btn-primary', onclick: () => {
          try { store.importJSON(text); api.close(); toast('État importé'); }
          catch (e) { toast('JSON invalide : ' + e.message, 3000); }
        } }, icon('check'), 'Importer'))),
  });
}
