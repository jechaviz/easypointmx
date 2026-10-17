/* Easypoint · portadas generativas (raster en <canvas>, deterministas por semilla).
   Cada excursión obtiene un paisaje único según su destino/etiquetas; sin imágenes externas. */
(function (global) {
  'use strict';

  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  const PALETTES = {
    sierra: { sky: ['#0b1d3a', '#35577e', '#f4b183'], sun: '#ffd9a0', ridge: ['#2a4a52', '#1f3b44', '#15303a', '#0e232c', '#08171e'], haze: '#ffcba3' },
    vino:   { sky: ['#2b0f2e', '#7a2e5b', '#ffae7a'], sun: '#ffe0b8', ridge: ['#5a2a4a', '#46203b', '#33172c', '#220f1f', '#140913'], haze: '#ffb59a' },
    pueblo: { sky: ['#12274a', '#5a6aa8', '#ffc58a'], sun: '#fff0c8', ridge: ['#3b4f77', '#2d3f63', '#223250', '#18253d', '#0e1727'], haze: '#ffd7ab' },
    rio:    { sky: ['#06303d', '#1b7a86', '#c8f0d4'], sun: '#fffbe0', ridge: ['#1d6b66', '#17554f', '#103f3c', '#0a2d2b', '#061c1b'], haze: '#c8f0d4' },
    tren:   { sky: ['#2c1a0e', '#a8602c', '#ffe0a8'], sun: '#fff1c8', ridge: ['#6d4a2a', '#563a20', '#412b18', '#2c1d10', '#1a1109'], haze: '#ffd9a0' },
    glamping: { sky: ['#020617', '#1e1b4b', '#6d4aa8'], sun: '#e9e4ff', ridge: ['#2b2a5e', '#201f49', '#171637', '#0f0e26', '#08081a'], haze: '#a99be0', stars: true },
    brand:  { sky: ['#06210a', '#1f6b1c', '#d9f99d'], sun: '#f7fee7', ridge: ['#2f6a21', '#24521b', '#1a3d14', '#122b0e', '#0a1a08'], haze: '#d9f99d' }
  };

  function pick(tags, name) {
    const t = (String(tags || '') + ' ' + String(name || '')).toLowerCase();
    if (/glamping|rom[aá]ntic|noche/.test(t)) return 'glamping';
    if (/vino|queso|cava|gastro/.test(t)) return 'vino';
    if (/rio|r[ií]o|rafting|aventura|cascada/.test(t)) return /sierra/.test(t) ? 'sierra' : 'rio';
    if (/tren|hacienda|historia/.test(t)) return 'tren';
    if (/pueblo|bernal|m[aá]gico|senderismo/.test(t)) return 'pueblo';
    if (/sierra|mision|misi[oó]n|jalpan/.test(t)) return 'sierra';
    return 'brand';
  }

  function ridge(ctx, r, w, h, base, amp, fill, rough) {
    const p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28, f1 = 1.2 + r() * 1.5, f2 = 3 + r() * 2.5, f3 = 7 + r() * 5;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const u = x / w;
      const y = base + amp * (0.55 * Math.sin(u * f1 * 6.28 + p1) + 0.3 * Math.sin(u * f2 * 6.28 + p2) + rough * 0.15 * Math.sin(u * f3 * 6.28 + p3));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }

  function paint(canvas, seedKey, tags, name) {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth || 640, ch = canvas.clientHeight || 400;
    const w = Math.round(cw * dpr), h = Math.round(ch * dpr);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    const key = pick(tags, name);
    const P = PALETTES[key];
    const r = rng(hash(String(seedKey) + key));

    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.75);
    sky.addColorStop(0, P.sky[0]); sky.addColorStop(0.55, P.sky[1]); sky.addColorStop(1, P.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    if (P.stars) { for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.7})`; const s = (0.6 + r() * 1.4) * dpr; ctx.fillRect(r() * w, r() * h * 0.55, s, s); } }

    // sol / luna con halo
    const sx = w * (0.18 + r() * 0.64), sy = h * (0.22 + r() * 0.2), sr = h * (0.06 + r() * 0.03);
    const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 7);
    halo.addColorStop(0, P.sun + 'cc'); halo.addColorStop(0.25, P.sun + '44'); halo.addColorStop(1, P.sun + '00');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.283); ctx.fillStyle = P.sun; ctx.fill();

    // crestas con neblina entre capas
    const layers = P.ridge.length;
    for (let i = 0; i < layers; i++) {
      const base = h * (0.42 + i * 0.1), amp = h * (0.16 - i * 0.018);
      ridge(ctx, r, w, h, base, amp, P.ridge[i], 1 + i * 0.4);
      if (i < layers - 1) {
        const g = ctx.createLinearGradient(0, base - amp, 0, base + h * 0.12);
        g.addColorStop(0, P.haze + '00'); g.addColorStop(0.6, P.haze + (i < 2 ? '55' : '33')); g.addColorStop(1, P.haze + '00');
        ctx.fillStyle = g; ctx.fillRect(0, base - amp, w, amp + h * 0.14);
      }
    }

    // acentos por tema
    if (key === 'sierra' || key === 'brand') { // pinos
      for (let i = 0; i < 26; i++) {
        const x = r() * w, y = h * (0.78 + r() * 0.2), s = h * (0.04 + r() * 0.06);
        ctx.fillStyle = 'rgba(4,14,10,.85)';
        ctx.beginPath(); ctx.moveTo(x, y - s * 2); ctx.lineTo(x - s * 0.6, y); ctx.lineTo(x + s * 0.6, y); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y - s * 1.5); ctx.lineTo(x - s * 0.8, y - s * 0.3); ctx.lineTo(x + s * 0.8, y - s * 0.3); ctx.fill();
      }
    }
    if (key === 'vino') { // hileras de viñedo en perspectiva
      ctx.strokeStyle = 'rgba(255,200,160,.18)'; ctx.lineWidth = 1.5 * dpr;
      for (let i = -8; i <= 18; i++) { ctx.beginPath(); ctx.moveTo(w * 0.5 + i * w * 0.012, h * 0.74); ctx.lineTo(w * 0.5 + i * w * 0.14, h); ctx.stroke(); }
    }
    if (key === 'rio') { // cinta de río
      const g = ctx.createLinearGradient(0, h * 0.7, 0, h);
      g.addColorStop(0, 'rgba(200,240,212,.0)'); g.addColorStop(1, 'rgba(120,220,220,.55)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(w * 0.35, h * 0.72);
      ctx.bezierCurveTo(w * 0.5, h * 0.82, w * 0.3, h * 0.9, w * 0.55, h); ctx.lineTo(w * 0.85, h); ctx.bezierCurveTo(w * 0.7, h * 0.88, w * 0.62, h * 0.8, w * 0.5, h * 0.72); ctx.fill();
    }
    if (key === 'pueblo' || key === 'tren') { // casitas con ventanas cálidas
      for (let i = 0; i < 14; i++) {
        const x = w * (0.08 + r() * 0.84), y = h * (0.8 + r() * 0.12), bw = h * (0.05 + r() * 0.05), bh = bw * (0.7 + r() * 0.5);
        ctx.fillStyle = 'rgba(12,16,26,.9)'; ctx.fillRect(x, y - bh, bw, bh);
        ctx.beginPath(); ctx.moveTo(x - 3, y - bh); ctx.lineTo(x + bw / 2, y - bh - bw * 0.35); ctx.lineTo(x + bw + 3, y - bh); ctx.fill();
        ctx.fillStyle = 'rgba(255,214,140,.9)'; ctx.fillRect(x + bw * 0.25, y - bh * 0.65, bw * 0.18, bw * 0.2); ctx.fillRect(x + bw * 0.6, y - bh * 0.65, bw * 0.18, bw * 0.2);
      }
    }
    // viñeta + grano
    const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    const gr = rng(hash('grain' + seedKey));
    for (let i = 0; i < (w * h) / 900; i++) { ctx.fillStyle = `rgba(255,255,255,${gr() * 0.05})`; ctx.fillRect(gr() * w, gr() * h, dpr, dpr); }
    return key;
  }

  global.EPArt = { paint, pick, PALETTES };
})(window);
