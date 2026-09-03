// État persistant du MJ (propre à l'appareil) : éléments masqués, annotations,
// notes de séance, salles visitées, réglages. Stocké dans localStorage,
// exportable / importable en JSON depuis les réglages.

const STORAGE_KEY = 'dnd-companion:v1';

const DEFAULT = {
  settings: { theme: 'dark', fontScale: 1, sidebar: true, condensed: false, mapClick: true, enhanced: true },
  hidden: {},     // clé élément -> 1        (déjà lu / dit / vaincu / distribué)
  overrides: {},  // clé élément -> texte    (texte modifié à la volée)
  notes: {},      // clé élément -> texte    (annotation ajoutée)
  checks: {},     // clé élément -> 1        (cases cochées : dialogue dit, trésor distribué…)
  roomNotes: {},  // "adv/room" -> texte     (notes libres de séance)
  visited: {},    // adv -> { room -> timestamp }
  status: {},     // "adv/room" -> 'inexploree' | 'encours' | 'fait'  (forcé par le MJ)
  todo: {},       // clé bloc -> 1          (note du MJ à traiter, remontée sur la page d'aventure)
  order: {},      // "adv/room/type" -> [ids]  (ordre choisi par glisser-déposer)
  flag: {},       // adv -> room            (marque-page de fin de séance, un seul par aventure)
  npcStatus: {},  // "adv/npc" -> statut
  lastRoom: {},   // adv -> room
  trackers: {},   // "adv/tracker" -> palier courant (compteur de progression, ex. la Marée)
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function merge(base, extra) {
  for (const k of Object.keys(extra || {})) {
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && extra[k] && typeof extra[k] === 'object') {
      Object.assign(base[k], extra[k]);
    } else {
      base[k] = extra[k];
    }
  }
  return base;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return merge(clone(DEFAULT), JSON.parse(raw));
  } catch (e) {
    console.warn('État illisible, réinitialisation.', e);
  }
  return clone(DEFAULT);
}

let state = migrate(load());

/** Les salles cochées « faites » avant la version 0.6 deviennent des salles au statut « fait ». */
function migrate(st) {
  if (st.done) {
    for (const [advId, rooms] of Object.entries(st.done)) {
      for (const roomId of Object.keys(rooms || {})) st.status[`${advId}/${roomId}`] ||= 'fait';
    }
    delete st.done;
  }
  return st;
}
const listeners = new Set();
let saveTimer = null;

function write() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.error('Impossible d’enregistrer l’état', e); }
}

// Écriture immédiate pour les actions ponctuelles ; différée (frappe au clavier) pour les notes.
function persist(deferred = false) {
  if (!deferred) return write();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(write, 300);
}

function emit(silent = false) {
  persist(silent);
  if (!silent) for (const fn of listeners) fn(state);
}

// Ne rien perdre si l'app est fermée pendant une écriture différée.
addEventListener('pagehide', () => { if (saveTimer) write(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) write(); });

function deleteByPrefix(obj, prefix) {
  for (const k of Object.keys(obj)) if (k.startsWith(prefix)) delete obj[k];
}

export const store = {
  get state() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  /** Force un re-rendu sans modifier l'état (état d'interface volatile). */
  refresh() { for (const fn of listeners) fn(state); },

  // --- Masquage (lu / dit / vaincu / distribué) ---
  isHidden(key) { return !!state.hidden[key]; },
  setHidden(key, v) { if (v) state.hidden[key] = 1; else delete state.hidden[key]; emit(); },
  toggleHidden(key) { this.setHidden(key, !state.hidden[key]); },

  // --- Texte modifié à la volée ---
  getOverride(key) { return state.overrides[key]; },
  setOverride(key, text) {
    if (text == null || text === '') delete state.overrides[key]; else state.overrides[key] = text;
    emit();
  },

  // --- Annotations ---
  getNote(key) { return state.notes[key]; },
  setNote(key, text) {
    if (!text || !text.trim()) delete state.notes[key]; else state.notes[key] = text;
    emit();
  },

  // --- Cases cochées ---
  isChecked(key) { return !!state.checks[key]; },
  setChecked(key, v) { if (v) state.checks[key] = 1; else delete state.checks[key]; emit(); },
  toggleChecked(key) { this.setChecked(key, !state.checks[key]); },

  // --- Notes de séance par salle (enregistrées sans re-rendu) ---
  getRoomNote(advId, roomId) { return state.roomNotes[`${advId}/${roomId}`] || ''; },
  setRoomNote(advId, roomId, text) {
    const k = `${advId}/${roomId}`;
    if (!text || !text.trim()) delete state.roomNotes[k]; else state.roomNotes[k] = text;
    emit(true);
  },

  // --- Progression ---
  markVisited(advId, roomId) {
    (state.visited[advId] ||= {})[roomId] = Date.now();
    state.lastRoom[advId] = roomId;
    emit(true);
  },
  isVisited(advId, roomId) { return !!state.visited[advId]?.[roomId]; },
  lastRoom(advId) { return state.lastRoom[advId]; },

  // --- Blocs « à faire » ---
  isTodo(key) { return !!state.todo[key]; },
  toggleTodo(key) { if (state.todo[key]) delete state.todo[key]; else state.todo[key] = 1; emit(); },
  todoKeys() { return Object.keys(state.todo); },

  // --- Ordre des blocs (glisser-déposer) ---
  getOrder(scope) { return state.order[scope] || null; },
  setOrder(scope, ids) { state.order[scope] = ids; emit(); },
  clearOrder(scope) { delete state.order[scope]; emit(); },

  // --- Marque-page de fin de séance ---
  flag(advId) { return state.flag[advId] || null; },
  setFlag(advId, roomId) {
    if (!roomId || state.flag[advId] === roomId) delete state.flag[advId];
    else state.flag[advId] = roomId;
    emit();
  },
  isFlagged(advId, roomId) { return state.flag[advId] === roomId; },

  // --- Compteurs de progression déclarés par l'aventure (la Marée, et ce qui suivra) ---
  tracker(advId, trackerId) { return state.trackers[`${advId}/${trackerId}`] || 0; },
  setTracker(advId, trackerId, step) {
    const k = `${advId}/${trackerId}`;
    if (!step) delete state.trackers[k]; else state.trackers[k] = step;
    emit();
  },

  // --- Statut des PNJ ---
  npcStatus(advId, npcId) { return state.npcStatus[`${advId}/${npcId}`] || null; },
  setNpcStatus(advId, npcId, status) {
    const k = `${advId}/${npcId}`;
    if (!status) delete state.npcStatus[k]; else state.npcStatus[k] = status;
    emit();
  },

  // --- Statut de salle forcé par le MJ (sinon il est déduit de l'avancement) ---
  forcedStatus(advId, roomId) { return state.status[`${advId}/${roomId}`] || null; },
  setStatus(advId, roomId, status) {
    const k = `${advId}/${roomId}`;
    if (!status) delete state.status[k]; else state.status[k] = status;
    emit();
  },
  /** Salles portant un statut donné, forcé ou non : la vue fournit les statuts déduits. */
  statusCount(advId, wanted, derived = {}) {
    let n = 0;
    for (const [roomId, d] of Object.entries(derived)) {
      if ((state.status[`${advId}/${roomId}`] || d) === wanted) n++;
    }
    return n;
  },

  // --- Réglages ---
  get settings() { return state.settings; },
  setSetting(k, v) { state.settings[k] = v; emit(); },

  // --- Réinitialisations ---
  resetRoom(advId, roomId) {
    const p = `${advId}/${roomId}/`;
    for (const bucket of [state.hidden, state.overrides, state.notes, state.checks, state.todo, state.order]) deleteByPrefix(bucket, p);
    delete state.roomNotes[`${advId}/${roomId}`];
    delete state.status[`${advId}/${roomId}`];
    emit();
  },
  resetAdventure(advId) {
    const p = `${advId}/`;
    for (const bucket of [state.hidden, state.overrides, state.notes, state.checks, state.roomNotes, state.todo, state.order, state.npcStatus, state.status, state.trackers]) deleteByPrefix(bucket, p);
    delete state.visited[advId];
    delete state.lastRoom[advId];
    delete state.flag[advId];
    emit();
  },
  resetAll() {
    const settings = state.settings;
    state = clone(DEFAULT);
    state.settings = settings;
    emit();
  },

  // --- Export / import ---
  exportJSON() { return JSON.stringify(state, null, 2); },
  importJSON(json) {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') throw new Error('Format invalide');
    state = merge(clone(DEFAULT), parsed);
    emit();
  },

  /** Statistiques rapides pour les réglages. */
  counts() {
    return {
      hidden: Object.keys(state.hidden).length,
      overrides: Object.keys(state.overrides).length,
      notes: Object.keys(state.notes).length + Object.keys(state.roomNotes).length,
    };
  },
};

/** Construit une clé d'élément stable : adv/room/kind/id[/sous-id…] */
export function key(...parts) {
  return parts.map(String).join('/');
}
