/* ============================================================
   BAZARES — API Client (vanilla JS, no build needed)
   Mirrors every backend route exactly. Configure API_BASE below.
============================================================ */
'use strict';

// ─── CONFIG ────────────────────────────────────────────────────
// Change this if your backend runs elsewhere. Defaults to localhost:3001
// (the backend's default dev port). For production, replace with your
// deployed backend URL, e.g. 'https://api.bazares.co.mz'.
const API_BASE = (window.BAZARES_API_BASE || 'http://localhost:3001') + '/api';
const SOCKET_BASE = window.BAZARES_API_BASE || 'http://localhost:3001';

// ─── IN-MEMORY ACCESS TOKEN ────────────────────────────────────
// Never persisted to localStorage; restored via silent refresh on load.
let _accessToken = null;
const getAccessToken = () => _accessToken;
const setAccessToken = (t) => { _accessToken = t; };

// ─── REFRESH QUEUE (avoid refresh storms on concurrent 401s) ──
let _isRefreshing = false;
let _refreshQueue = [];

function _flushQueue(token, err) {
  _refreshQueue.forEach(({ resolve, reject }) => err ? reject(err) : resolve(token));
  _refreshQueue = [];
}

/**
 * fetch() with a per-attempt timeout and automatic retry on network-level
 * failure (connection dropped, DNS hiccup, or — the most common real-world
 * case here — a Railway free-tier backend that was asleep and is still
 * waking up on the first request). Does NOT retry once a response is
 * actually received (so it never double-submits an order/payment/etc).
 */
async function fetchWithRetry(url, options, attempts = 3) {
  const perAttemptTimeout = 20000; // 20s — generous for a cold-starting backend
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perAttemptTimeout);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res; // got a real HTTP response — stop here, success or not
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw lastErr;
}

/**
 * Core request helper. Always sends credentials (httpOnly refresh cookie),
 * attaches the Bearer access token, and auto-refreshes once on 401.
 */
async function apiRequest(method, path, { body, isForm, params, _retry } = {}) {
  let url = API_BASE + path;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.append(k, v); });
    const qsStr = qs.toString();
    if (qsStr) url += '?' + qsStr;
  }

  const headers = {};
  if (_accessToken) headers['Authorization'] = 'Bearer ' + _accessToken;
  let fetchBody;
  if (isForm) {
    fetchBody = body; // FormData — browser sets Content-Type with boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetchWithRetry(url, { method, headers, body: fetchBody, credentials: 'include' });
  } catch (networkErr) {
    const isUpload = isForm && body instanceof FormData;
    const msg = isUpload
      ? 'Não foi possível concluir o envio. Verifique a sua ligação à internet e tente novamente — se persistir, tente com menos imagens de cada vez.'
      : 'Sem ligação ao servidor. Verifique a sua ligação à internet ou tente novamente em breve.';
    throw { ok: false, networkError: true, message: msg };
  }

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (res.status === 401 && !_retry && path !== '/auth/refresh' && path !== '/auth/login') {
    // Try a single silent refresh, queuing concurrent callers.
    if (_isRefreshing) {
      const token = await new Promise((resolve, reject) => _refreshQueue.push({ resolve, reject })).catch(() => null);
      if (token) {
        return apiRequest(method, path, { body, isForm, params, _retry: true });
      }
    } else {
      _isRefreshing = true;
      try {
        const r = await fetch(API_BASE + '/auth/refresh', { method: 'POST', credentials: 'include' });
        const rd = await r.json().catch(() => null);
        if (r.ok && rd?.data?.accessToken) {
          setAccessToken(rd.data.accessToken);
          _flushQueue(rd.data.accessToken, null);
          return apiRequest(method, path, { body, isForm, params, _retry: true });
        }
        _flushQueue(null, new Error('refresh failed'));
      } catch (e) {
        _flushQueue(null, e);
      } finally {
        _isRefreshing = false;
      }
      // Refresh failed — force logout state
      setAccessToken(null);
      document.dispatchEvent(new CustomEvent('bazares:unauthorized'));
    }
  }

  if (!res.ok) {
    const message = data?.message || data?.errors?.[0]?.message || `Erro ${res.status}`;
    throw { ok: false, status: res.status, code: data?.code, message, errors: data?.errors };
  }
  return data; // { success, message, data }
}

const api = {
  get: (path, params) => apiRequest('GET', path, { params }),
  post: (path, body) => apiRequest('POST', path, { body }),
  postForm: (path, formData) => apiRequest('POST', path, { body: formData, isForm: true }),
  put: (path, body) => apiRequest('PUT', path, { body }),
  putForm: (path, formData) => apiRequest('PUT', path, { body: formData, isForm: true }),
  patch: (path, body) => apiRequest('PATCH', path, { body }),
  delete: (path) => apiRequest('DELETE', path)
};

function apiErrorMessage(err) {
  if (err?.message) return err.message;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
