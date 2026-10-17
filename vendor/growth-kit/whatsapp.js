// WhatsApp click-to-chat helpers. Pure functions: no DOM, no storage.

/** Keep digits only; a 10-digit Mexican number gets the 52 country code. Returns '' when it cannot be valid. */
export function normalizeNumber(raw, defaultCountry = '52') {
  let d = String(raw ?? '').replace(/\D/g, '').replace(/^00/, '');
  if (d.length === 10) d = defaultCountry + d;
  if (defaultCountry === '52' && /^521\d{10}$/.test(d)) d = '52' + d.slice(3); // wa.me wants 52XXXXXXXXXX
  return d.length >= 11 && d.length <= 15 ? d : '';
}

/** https://wa.me/<number>?text=<message>. Returns null when there is no valid number. */
export function waLink(number, text = '', defaultCountry = '52') {
  const n = normalizeNumber(number, defaultCountry);
  if (!n) return null;
  const t = String(text ?? '').trim().slice(0, 1500);
  return 'https://wa.me/' + n + (t ? '?text=' + encodeURIComponent(t) : '');
}

/** Human message for a lead so the conversation starts with context (no sensitive data beyond what the visitor typed). */
export function leadMessage(lead, { brand = '', lang = 'es' } = {}) {
  const es = lang !== 'en';
  const L = (a, b) => (es ? a : b);
  const lines = [];
  lines.push(L(`Hola${brand ? ' ' + brand : ''}, soy ${lead.name || 'un visitante'}${lead.company ? ' de ' + lead.company : ''}.`,
    `Hi${brand ? ' ' + brand : ''}, I'm ${lead.name || 'a visitor'}${lead.company ? ' from ' + lead.company : ''}.`));
  if (lead.type) lines.push(L('Me interesa: ', 'I am interested in: ') + lead.type + (lead.service ? ' · ' + lead.service : ''));
  if (lead.budget && !/definir|define/i.test(lead.budget)) lines.push(L('Inversión prevista: ', 'Planned budget: ') + lead.budget);
  if (lead.timeline && !/explor/i.test(lead.timeline)) lines.push(L('Inicio: ', 'Start: ') + lead.timeline);
  if (lead.idea) lines.push('', String(lead.idea).slice(0, 700));
  return lines.join('\n');
}
