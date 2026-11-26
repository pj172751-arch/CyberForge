export const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function formatFastApiError(data, status) {
  if (!data) return `Request failed with status ${status}`;
  if (typeof data.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const messages = data.detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return null;
        const loc = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== 'body').join('.')
          : '';
        const msg = item.msg || 'Invalid value';
        return loc ? `${loc}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (messages.length > 0) return messages.join('; ');
  }
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }
  return `Request failed with status ${status}`;
}

export async function apiFetch(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const requestHeaders = { ...headers };
  let requestBody = body;

  if (body !== undefined && body !== null && typeof body !== 'string' && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
    requestBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new Error('Unable to reach CyberForge API. Ensure the backend is running.');
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(formatFastApiError(data, response.status));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function exportActivityCsvUrl(params = {}) {
  const query = new URLSearchParams();
  if (params.event_type && params.event_type !== 'all') {
    query.set('event_type', params.event_type);
  }
  if (params.challenge_id !== undefined && params.challenge_id !== null && params.challenge_id !== '') {
    query.set('challenge_id', String(params.challenge_id));
  }
  if (params.search && String(params.search).trim()) {
    query.set('search', String(params.search).trim());
  }
  const qs = query.toString();
  return `${API_BASE}/api/reports/export${qs ? `?${qs}` : ''}`;
}
