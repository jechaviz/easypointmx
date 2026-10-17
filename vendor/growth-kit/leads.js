// Lead capture client: validates, adds attribution + anti-bot signals, posts JSON to the growth-kit endpoint.
const T = {
  es: { name: 'Escribe tu nombre.', email: 'Revisa tu correo electrónico.', message: 'Cuéntanos un poco más (mínimo 15 caracteres).', consent: 'Acepta el aviso de privacidad para continuar.', net: 'No pudimos enviar tu mensaje. Inténtalo de nuevo o escríbenos por WhatsApp.', rate: 'Demasiados intentos. Espera un minuto.', server: 'No pudimos registrar tu solicitud. Inténtalo de nuevo en unos minutos.' },
  en: { name: 'Enter your name.', email: 'Check your email address.', message: 'Tell us a bit more (at least 15 characters).', consent: 'Accept the privacy notice to continue.', net: 'We could not send your message. Try again or reach us on WhatsApp.', rate: 'Too many attempts. Wait a minute.', server: 'We could not register your request. Try again in a few minutes.' }
};
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/** Returns an array of {field, message}; empty when valid. */
export function validateLead(l, lang = 'es') {
  const t = T[lang === 'en' ? 'en' : 'es'], e = [];
  if (!String(l.name || '').trim()) e.push({ field: 'name', message: t.name });
  if (!EMAIL.test(String(l.email || '').trim())) e.push({ field: 'email', message: t.email });
  if (String(l.idea || '').trim().length < 15) e.push({ field: 'idea', message: t.message });
  if (!l.consent) e.push({ field: 'consent', message: t.consent });
  return e;
}

export function buildLead(form, { attribution = {}, page = '', lang = 'es', renderedAt = Date.now(), source = 'web' } = {}) {
  const pick = k => String(form[k] ?? '').trim();
  return {
    name: pick('name'), email: pick('email'), company: pick('company'), phone: pick('phone'), type: pick('type'), service: pick('service'),
    budget: pick('budget'), timeline: pick('timeline'), idea: pick('idea'), consent: !!form.consent, lang, source, page,
    website: '', // honeypot: real users never see or fill it
    elapsed_ms: Math.max(0, Date.now() - renderedAt), ...attribution
  };
}

export async function submitLead(endpoint, lead, { fetchImpl = (typeof fetch !== 'undefined' ? fetch : null), timeoutMs = 15000 } = {}) {
  const t = T[lead.lang === 'en' ? 'en' : 'es'];
  const errors = validateLead(lead, lead.lang);
  if (errors.length) return { ok: false, error: errors[0].message, fields: errors };
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    const r = await fetchImpl(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead), signal: ctl?.signal });
    let data = {}; try { data = await r.json(); } catch {}
    if (r.status === 429) return { ok: false, error: t.rate };
    if (!r.ok || data.ok === false) return { ok: false, error: data.error || t.server };
    return { ok: true, id: data.id || '', delivered: data.delivered !== false };
  } catch { return { ok: false, error: t.net }; }
  finally { if (timer) clearTimeout(timer); }
}
