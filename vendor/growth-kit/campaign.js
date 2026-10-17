// Heavy social campaign planner. Pure + deterministic: same input => same plan (testable, reviewable, diff-able).
// Nothing is published or sent anywhere: the output is a plan the owner reviews, then exports (CSV/ICS/Markdown/JSON)
// to a scheduler or posts by hand. Every post has its own UTM link so results are measurable per channel and per post.
import { withUtm } from './share.js';
import { waLink } from './whatsapp.js';

export const CHANNELS = {
  linkedin:  { label: 'LinkedIn',  max: 1300, tags: 3, format: 'post',      hours: ['08:30', '12:15'] },
  facebook:  { label: 'Facebook',  max: 600,  tags: 2, format: 'post',      hours: ['10:00', '19:00'] },
  instagram: { label: 'Instagram', max: 2200, tags: 8, format: 'carousel',  hours: ['12:00', '20:00'] },
  x:         { label: 'X',         max: 280,  tags: 2, format: 'post',      hours: ['09:00', '17:30'] },
  tiktok:    { label: 'TikTok',    max: 300,  tags: 5, format: 'short',     hours: ['18:00', '21:00'] },
  youtube:   { label: 'YouTube',   max: 1000, tags: 3, format: 'short',     hours: ['11:00', '18:30'] },
  whatsapp:  { label: 'WhatsApp',  max: 700,  tags: 0, format: 'broadcast', hours: ['11:30', '17:00'] },
  telegram:  { label: 'Telegram',  max: 900,  tags: 1, format: 'post',      hours: ['10:30', '20:00'] }
};
export const PILLARS = ['problem', 'proof', 'offer', 'education', 'behind', 'faq', 'cta'];
export const PHASES = ['teaser', 'launch', 'proof', 'conversion'];

// 3 variants per pillar and language so a 100-post plan does not repeat itself.
const T = {
  es: {
    problem: [
      '{Audience}: ¿el camino para {offer} se siente más largo de lo que debería? En {brand} lo ordenamos paso a paso.',
      'La idea casi nunca es el problema: es el camino para {offer}. {brand} te ayuda a verlo claro.',
      'Si formas parte de {audience}, seguro te ha pasado: mucho esfuerzo y poco avance al intentar {offer}. Hay otra forma.'
    ],
    proof: [
      'Qué cambia al {offer} con {brand}: alcance claro, entregas revisables y decisiones contigo.',
      'Resultados visibles, no promesas: así acompañamos a {audience} a {offer}.',
      'Menos incertidumbre, más avance. Así se ve el camino para {offer} con {brand}.'
    ],
    offer: [
      '{tagline} Para {audience}: {offer}. Conversemos esta semana.',
      'Abrimos cupo este mes para trabajar con {audience}. Objetivo: {offer}. Cupo limitado.',
      '{brand} te propone el primer paso concreto para {offer}. Sin vueltas.'
    ],
    education: [
      '3 preguntas antes de {offer}: ¿para quién es?, ¿cómo sabrás que funcionó?, ¿qué NO harás primero? Guárdalo.',
      'Checklist rápido para {audience}: objetivo, alcance, presupuesto y fecha. Con eso, el camino para {offer} deja de ser abstracto.',
      'Un error común al querer {offer}: empezar por la herramienta y no por la necesidad. Hazlo al revés.'
    ],
    behind: [
      'Detrás de cámaras en {brand}: así preparamos el primer borrador para {audience}.',
      'Un día en {brand}: de la idea a algo que ya se puede revisar. Así se ve el camino para {offer}.',
      'Nos gusta mostrar el proceso. Hoy: de una conversación a un plan para {offer}.'
    ],
    faq: [
      'Pregunta frecuente: «¿cuánto tarda {offer}?» Depende del alcance; lo definimos contigo desde la primera llamada.',
      'Pregunta frecuente: «¿y si aún no lo tengo claro?» Perfecto: ahí empieza la conversación con {brand}.',
      'Pregunta frecuente: «¿puedo empezar pequeño?» Sí. Un primer entregable chico también cuenta.'
    ],
    cta: [
      '¿Listo para {offer}? Cuéntanos tu idea y te respondemos con un siguiente paso claro.',
      'Si esto te suena, escríbenos. {brand} responde personalmente.',
      'Hoy es buen día para {offer}. Una conversación basta.'
    ]
  },
  en: {
    problem: [
      '{Audience}: does the way to {offer} feel longer than it should? {brand} sorts it out step by step.',
      'The idea is rarely the problem: the way to {offer} is. {brand} helps you see it clearly.',
      'If you are part of {audience}, you know it: lots of effort, little progress when trying to {offer}. There is another way.'
    ],
    proof: [
      'What changes when you {offer} with {brand}: clear scope, reviewable deliverables, decisions made with you.',
      'Visible results, not promises: this is how we support {audience} to {offer}.',
      'Less uncertainty, more progress. This is what the way to {offer} looks like with {brand}.'
    ],
    offer: [
      '{tagline} For {audience}: {offer}. Let us talk this week.',
      'We are opening room this month to work with {audience}. Goal: {offer}. Limited spots.',
      '{brand} proposes the first concrete step to {offer}. No detours.'
    ],
    education: [
      '3 questions before you {offer}: who is it for, how will you know it worked, what will you NOT do first? Save this.',
      'Quick checklist for {audience}: goal, scope, budget, date. With that, the way to {offer} stops being abstract.',
      'A common mistake when wanting to {offer}: starting from the tool instead of the need. Flip it.'
    ],
    behind: [
      'Behind the scenes at {brand}: how we prepare the first draft for {audience}.',
      'A day at {brand}: from idea to something reviewable. This is the way to {offer} in practice.',
      'We like showing the process. Today: from a conversation to a plan to {offer}.'
    ],
    faq: [
      'FAQ: "how long does it take to {offer}?" It depends on scope; we define it with you from the first call.',
      'FAQ: "what if I am not clear yet?" Perfect: that is where the conversation with {brand} starts.',
      'FAQ: "can I start small?" Yes. A small first deliverable counts too.'
    ],
    cta: [
      'Ready to {offer}? Tell us your idea and we will reply with a clear next step.',
      'If this sounds like you, message us. {brand} replies personally.',
      'Today is a good day to {offer}. One conversation is enough.'
    ]
  }
};
const CTA = {
  es: { teaser: 'Entérate primero', launch: 'Escríbenos hoy', proof: 'Mira cómo funciona', conversion: 'Agenda una conversación' },
  en: { teaser: 'Be the first to know', launch: 'Message us today', proof: 'See how it works', conversion: 'Book a conversation' }
};
const MEDIA = {
  es: { post: 'Imagen 1080×1080 con una sola frase y el logo', carousel: 'Carrusel de 5 láminas: gancho, problema, paso 1, paso 2, llamada a la acción', short: 'Video vertical de 15–30 s con subtítulos y gancho en los primeros 2 s', broadcast: 'Texto breve + una imagen; sin adjuntos pesados', story: 'Historia vertical con enlace' },
  en: { post: '1080×1080 image with one sentence and the logo', carousel: '5-slide carousel: hook, problem, step 1, step 2, call to action', short: '15–30 s vertical video with captions and a hook in the first 2 s', broadcast: 'Short text + one image; no heavy attachments', story: 'Vertical story with link' }
};
const STOP = new Set(['de', 'la', 'el', 'los', 'las', 'con', 'para', 'por', 'una', 'un', 'y', 'o', 'the', 'and', 'for', 'with', 'of', 'to', 'a', 'in']);

const pad = n => String(n).padStart(2, '0');
const slug = s => String(s || 'campana').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'campana';
const fill = (tpl, ctx) => tpl.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? '').replace(/\s{2,}/g, ' ').trim();
const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

function tagsFor(ctx, count) {
  if (!count) return [];
  const words = [...new Set(`${ctx.brand} ${ctx.audience}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOP.has(w)))];
  const pool = [slug(ctx.brand).replace(/-/g, ''), ...words, 'negocios', 'digital', 'emprender', 'tecnologia'];
  return [...new Set(pool)].filter(Boolean).slice(0, count).map(t => '#' + t);
}

function trimToFit(text, room) {
  if (text.length <= room) return text;
  const cut = text.slice(0, Math.max(0, room - 1));
  const sp = cut.lastIndexOf(' ');
  return (sp > room * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\-–—]+$/, '') + '…';
}

/**
 * @param {object} o brand, url, audience, offer, tagline, lang('es'|'en'), channels[], weeks(1-12), postsPerWeek(1-7 per channel),
 *                   startDate('YYYY-MM-DD'), campaign(slug), whatsapp(number), waText
 * @returns {{meta:object, posts:object[]}}
 */
export function buildCampaignPlan(o = {}) {
  const lang = o.lang === 'en' ? 'en' : 'es';
  const brand = String(o.brand || '').trim().slice(0, 90);
  const audience = String(o.audience || '').trim().slice(0, 180);
  const offer = String(o.offer || '').trim().slice(0, 240);
  if (!brand || !audience || !offer) throw new Error(lang === 'en' ? 'Brand, audience and offer are required.' : 'Marca, público y oferta son obligatorios.');
  let base;
  try { base = new URL(o.url); if (!/^https?:$/.test(base.protocol)) throw 0; } catch { throw new Error(lang === 'en' ? 'A valid destination URL is required.' : 'Se requiere un enlace de destino válido.'); }
  const channels = (o.channels?.length ? o.channels : Object.keys(CHANNELS)).filter(c => CHANNELS[c]);
  if (!channels.length) throw new Error(lang === 'en' ? 'Pick at least one channel.' : 'Elige al menos un canal.');
  const weeks = Math.min(12, Math.max(1, Math.round(Number(o.weeks) || 4)));
  const perWeek = Math.min(7, Math.max(1, Math.round(Number(o.postsPerWeek) || 4)));
  const campaign = slug(o.campaign || brand);
  const start = o.startDate && /^\d{4}-\d{2}-\d{2}$/.test(o.startDate) ? new Date(o.startDate + 'T00:00:00Z') : new Date(Date.now() + 86400000);
  const ctx = { brand, audience, Audience: audience.charAt(0).toUpperCase() + audience.slice(1), offer, tagline: String(o.tagline || '').trim().slice(0, 160) };
  const dayOffsets = [0, 2, 4, 1, 3, 5, 6]; // spread across the week, weekdays first
  const posts = [];

  channels.forEach((channel, ci) => {
    const spec = CHANNELS[channel];
    for (let w = 0; w < weeks; w++) {
      const phase = PHASES[Math.min(PHASES.length - 1, Math.floor((w * PHASES.length) / weeks))];
      for (let n = 0; n < perWeek; n++) {
        const idx = w * perWeek + n;
        // Phase biases the pillar order so the story arc is respected: teaser -> education/problem, conversion -> offer/cta.
        const order = { teaser: ['problem', 'education', 'behind', 'faq', 'proof', 'offer', 'cta'], launch: ['offer', 'problem', 'proof', 'education', 'cta', 'behind', 'faq'], proof: ['proof', 'behind', 'faq', 'education', 'offer', 'problem', 'cta'], conversion: ['cta', 'offer', 'proof', 'faq', 'problem', 'education', 'behind'] }[phase];
        const pillar = order[(n + ci) % order.length];
        const variants = T[lang][pillar];
        const body = fill(variants[(idx + ci) % variants.length], ctx);
        const date = new Date(start.getTime());
        date.setUTCDate(date.getUTCDate() + w * 7 + dayOffsets[(n + ci) % 7]);
        const id = `${campaign}-${channel}-w${w + 1}p${n + 1}`;
        const url = withUtm(base.toString(), { source: channel, medium: channel === 'whatsapp' ? 'messaging' : 'social', campaign, content: id });
        const link = channel === 'whatsapp' && o.whatsapp ? (waLink(o.whatsapp, o.waText || `${brand}: ${offer}`) || url) : url;
        const cta = CTA[lang][phase];
        const tags = tagsFor(ctx, spec.tags);
        const tail = `\n\n${cta}: ${link}` + (tags.length ? '\n' + tags.join(' ') : '');
        const copy = trimToFit(body, spec.max - tail.length) + tail;
        posts.push({
          id, channel, week: w + 1, phase, pillar, format: spec.format, date: ymd(date), time: spec.hours[n % spec.hours.length],
          copy, link, url, cta, hashtags: tags, mediaBrief: MEDIA[lang][spec.format] || MEDIA[lang].post, limit: spec.max
        });
      }
    }
  });
  posts.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.channel.localeCompare(b.channel));
  return { meta: { brand, audience, offer, lang, campaign, weeks, perWeek, channels, start: ymd(start), total: posts.length }, posts };
}

export const PILLAR_LABELS = {
  es: { problem: 'Problema', proof: 'Prueba', offer: 'Oferta', education: 'Educativo', behind: 'Detrás de cámaras', faq: 'Preguntas', cta: 'Llamada a la acción' },
  en: { problem: 'Problem', proof: 'Proof', offer: 'Offer', education: 'Educational', behind: 'Behind the scenes', faq: 'FAQ', cta: 'Call to action' }
};
export const PHASE_LABELS = {
  es: { teaser: 'Anticipación', launch: 'Lanzamiento', proof: 'Prueba', conversion: 'Conversión' },
  en: { teaser: 'Teaser', launch: 'Launch', proof: 'Proof', conversion: 'Conversion' }
};
/** One-line, language-aware summary: "128 publicaciones · 4 semanas · 8 canales". */
export function describePlan(plan) {
  const m = plan.meta, es = m.lang !== 'en';
  return es ? `${m.total} publicaciones · ${m.weeks} ${m.weeks === 1 ? 'semana' : 'semanas'} · ${m.channels.length} ${m.channels.length === 1 ? 'canal' : 'canales'}`
            : `${m.total} posts · ${m.weeks} ${m.weeks === 1 ? 'week' : 'weeks'} · ${m.channels.length} ${m.channels.length === 1 ? 'channel' : 'channels'}`;
}
export function previewNote(plan, shown) {
  const es = plan.meta.lang !== 'en';
  return plan.posts.length > shown ? (es ? `Vista previa de ${shown}; los archivos incluyen las ${plan.posts.length} publicaciones.` : `Previewing ${shown}; the files include all ${plan.posts.length} posts.`) : '';
}

/** Review gate before anyone schedules anything. Returns [] when the plan is clean. */
export function validatePlan(plan) {
  const issues = [], seen = new Set();
  for (const p of plan.posts) {
    if (seen.has(p.id)) issues.push({ id: p.id, issue: 'duplicate-id' }); seen.add(p.id);
    if (!p.copy.trim()) issues.push({ id: p.id, issue: 'empty-copy' });
    if (p.copy.length > p.limit) issues.push({ id: p.id, issue: 'over-limit', length: p.copy.length, limit: p.limit });
    if (!/utm_source=|wa\.me\//.test(p.link)) issues.push({ id: p.id, issue: 'untracked-link' });
    if (/\{\w+\}/.test(p.copy)) issues.push({ id: p.id, issue: 'unfilled-placeholder' });
  }
  return issues;
}

export function summarize(plan) {
  const by = {};
  for (const p of plan.posts) { (by[p.channel] ||= { posts: 0, pillars: {} }).posts++; by[p.channel].pillars[p.pillar] = (by[p.channel].pillars[p.pillar] || 0) + 1; }
  return { total: plan.posts.length, channels: by };
}

const csvCell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function toCsv(plan) {
  const cols = ['id', 'date', 'time', 'channel', 'format', 'phase', 'pillar', 'copy', 'link', 'media_brief', 'hashtags'];
  const rows = plan.posts.map(p => [p.id, p.date, p.time, p.channel, p.format, p.phase, p.pillar, p.copy, p.link, p.mediaBrief, p.hashtags.join(' ')]);
  return '\uFEFF' + [cols, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function foldIcs(line) {
  const enc = new TextEncoder(); const out = []; let cur = '', bytes = 0;
  for (const ch of line) { const b = enc.encode(ch).length; if (bytes + b > 74) { out.push(cur); cur = ' ' + ch; bytes = 1 + b; } else { cur += ch; bytes += b; } }
  out.push(cur); return out.join('\r\n');
}
const icsText = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
export function toIcs(plan, { stamp = new Date() } = {}) {
  const dt = (d, t) => d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00';
  const addMin = (t, m) => { const [h, mi] = t.split(':').map(Number); const x = h * 60 + mi + m; return `${pad(Math.floor(x / 60) % 24)}:${pad(x % 60)}`; };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//growth-kit//campaign//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const st = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  for (const p of plan.posts) {
    lines.push('BEGIN:VEVENT', `UID:${p.id}@growth-kit`, `DTSTAMP:${st}`, `DTSTART:${dt(p.date, p.time)}`, `DTEND:${dt(p.date, addMin(p.time, 30))}`,
      `SUMMARY:${icsText(`[${CHANNELS[p.channel].label}] ${p.pillar} · ${plan.meta.campaign}`)}`, `DESCRIPTION:${icsText(p.copy + '\n\n' + p.mediaBrief)}`, `URL:${p.link}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldIcs).join('\r\n') + '\r\n';
}

export function toMarkdown(plan) {
  const m = plan.meta; const es = m.lang !== 'en';
  let out = `# ${es ? 'Campaña' : 'Campaign'} ${m.campaign} · ${m.brand}\n\n${es ? 'Borradores para revisión. Nada se publica automáticamente.' : 'Drafts for review. Nothing is published automatically.'}\n\n`;
  out += `${es ? 'Total' : 'Total'}: ${m.total} · ${m.weeks} ${es ? 'semanas' : 'weeks'} · ${m.channels.map(c => CHANNELS[c].label).join(', ')}\n`;
  let day = '';
  for (const p of plan.posts) {
    if (p.date !== day) { day = p.date; out += `\n## ${day}\n`; }
    out += `\n### ${p.time} · ${CHANNELS[p.channel].label} · ${p.pillar} (${p.phase})\n\n${p.copy}\n\n_${p.mediaBrief}_\n`;
  }
  return out;
}
