// Share intents per network. Every link carries its own UTM so shares are measurable.
export const NETWORKS = ['whatsapp', 'facebook', 'x', 'linkedin', 'telegram', 'email', 'copy'];

export function withUtm(url, { source, medium = 'social', campaign = 'share', content = '' } = {}) {
  const u = new URL(url);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', medium);
  u.searchParams.set('utm_campaign', campaign);
  if (content) u.searchParams.set('utm_content', content);
  return u.toString();
}

export function shareIntent(network, { url, text = '', title = '', campaign = 'share' }) {
  const link = withUtm(url, { source: network, campaign });
  const u = encodeURIComponent(link), t = encodeURIComponent(text || title);
  switch (network) {
    case 'whatsapp': return 'https://wa.me/?text=' + encodeURIComponent((text ? text + ' ' : '') + link);
    case 'facebook': return 'https://www.facebook.com/sharer/sharer.php?u=' + u;
    case 'x': return 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u;
    case 'linkedin': return 'https://www.linkedin.com/sharing/share-offsite/?url=' + u;
    case 'telegram': return 'https://t.me/share/url?url=' + u + '&text=' + t;
    case 'email': return 'mailto:?subject=' + encodeURIComponent(title || text) + '&body=' + encodeURIComponent((text ? text + '\n\n' : '') + link);
    case 'copy': return link;
    default: throw new Error('Red no soportada: ' + network);
  }
}
