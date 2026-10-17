// Tiny DOM widgets (no framework). They only touch the DOM when called, so importing is SSR-safe.
import { waLink } from './whatsapp.js';
import { NETWORKS, shareIntent } from './share.js';

const WA_SVG = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-1.5-.7-2.5-1.3-3.4-2.9-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.2.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';

export function mountWhatsAppButton({ number, text = '', label = 'WhatsApp', root = document.body, hideOn = [] } = {}) {
  const href = waLink(number, text);
  if (!href || typeof document === 'undefined') return null;
  document.querySelector('.gk-wa')?.remove();
  const a = document.createElement('a');
  a.className = 'gk-wa'; a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('aria-label', label);
  a.innerHTML = WA_SVG + '<span class="gk-wa-label"></span>'; a.querySelector('.gk-wa-label').textContent = label;
  if (hideOn.includes(location.pathname)) a.hidden = true;
  root.appendChild(a); return a;
}

export function updateWhatsAppButton(el, { number, text }) { const href = waLink(number, text); if (el && href) el.href = href; }

const NAMES = { whatsapp: 'WhatsApp', facebook: 'Facebook', x: 'X', linkedin: 'LinkedIn', telegram: 'Telegram', email: 'Email', copy: 'Copiar enlace' };
export function mountShareDock(container, { url, text = '', title = '', campaign = 'share', lang = 'es', nets = NETWORKS } = {}) {
  if (!container || typeof document === 'undefined') return null;
  container.classList.add('gk-share'); container.replaceChildren();
  for (const n of nets) {
    const b = document.createElement(n === 'copy' ? 'button' : 'a');
    b.className = 'gk-share-btn'; b.dataset.network = n;
    b.textContent = n === 'copy' ? (lang === 'en' ? 'Copy link' : NAMES.copy) : NAMES[n];
    if (n === 'copy') { b.type = 'button'; b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(shareIntent('copy', { url, text, title, campaign })); b.textContent = lang === 'en' ? 'Copied' : 'Copiado'; } catch {} }); }
    else { b.href = shareIntent(n, { url, text, title, campaign }); b.target = '_blank'; b.rel = 'noopener noreferrer'; }
    container.appendChild(b);
  }
  return container;
}
