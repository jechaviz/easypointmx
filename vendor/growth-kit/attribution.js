// First/last-touch attribution from UTM parameters and referrer. Storage is optional and always guarded.
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export function parseTouch(search = '', referrer = '', now = new Date()) {
  const q = new URLSearchParams(search);
  const t = {};
  for (const k of KEYS) { const v = (q.get(k) || '').trim().slice(0, 80); if (v) t[k] = v.replace(/[^\w\-.~ ]/g, ''); }
  if (!t.utm_source && referrer) { try { const h = new URL(referrer).hostname.replace(/^www\./, ''); if (h) { t.utm_source = h.slice(0, 80); t.utm_medium = t.utm_medium || 'referral'; } } catch {} }
  if (!Object.keys(t).length) return null;
  t.at = now.toISOString();
  return t;
}

function safe(store) { try { return store || null; } catch { return null; } }

/** Records the touch once per page load. Returns { first, last } (either can be null). */
export function captureAttribution({ search = '', referrer = '', storage = (typeof localStorage !== 'undefined' ? localStorage : null), key = 'gk_attr' } = {}) {
  const s = safe(storage);
  let state = { first: null, last: null };
  try { const raw = s?.getItem(key); if (raw) state = { ...state, ...JSON.parse(raw) }; } catch {}
  const touch = parseTouch(search, referrer);
  if (touch) { state.last = touch; if (!state.first) state.first = touch; try { s?.setItem(key, JSON.stringify(state)); } catch {} }
  return state;
}

/** Flat object ready to attach to a lead payload. */
export function attributionFields(state) {
  const out = {};
  if (state?.first) out.first_touch = state.first;
  if (state?.last) out.last_touch = state.last;
  return out;
}
