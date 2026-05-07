export const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8091';
export const WEB_URL = process.env.WEB_URL || 'http://127.0.0.1:3041';
export const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@easypoint.mx';
export const PB_ALT_ADMIN_EMAIL = process.env.PB_ALT_ADMIN_EMAIL || 'admin@demo.mx';
export const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'easypoint123';

export function pbApi(path = '') {
  if (!path) return PB_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${PB_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function pbFilterString(value) {
  return `'${String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function pbApiUrl(path, params = {}) {
  const url = new URL(path, PB_URL.endsWith('/') ? PB_URL : `${PB_URL}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function readJson(response) {
  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}

export async function ensureJson(response, context = 'PocketBase request') {
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(`${context} failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

export async function adminAuth({ allowDemoFallback = true } = {}) {
  const identities = [PB_ADMIN_EMAIL];
  if (allowDemoFallback && PB_ALT_ADMIN_EMAIL && PB_ALT_ADMIN_EMAIL !== PB_ADMIN_EMAIL) {
    identities.push(PB_ALT_ADMIN_EMAIL);
  }

  let lastError = null;
  for (const identity of identities) {
    const response = await fetch(pbApi('/api/admins/auth-with-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity,
        password: PB_ADMIN_PASSWORD
      })
    });

    if (response.ok) {
      const data = await ensureJson(response, `Admin auth (${identity})`);
      return {
        identity,
        token: data.token,
        data
      };
    }

    lastError = await readJson(response);
  }

  throw new Error(`Admin auth failed for ${identities.join(', ')}: ${JSON.stringify(lastError)}`);
}

export async function adminHeaders(options) {
  const auth = await adminAuth(options);
  return {
    'Content-Type': 'application/json',
    Authorization: auth.token
  };
}
