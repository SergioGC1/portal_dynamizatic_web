const BASE_URL = (typeof window !== 'undefined' && window.__API_BASE_URL__) || 'http://localhost:3000';

function getAuthHeader() {
  if (typeof localStorage === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res, context) {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    const body = text || '';
    throw new Error(`${context} failed: ${res.status} ${res.statusText} ${body}`);
  }
  if (!text) return null;
  if (!contentType.includes('application/json')) return text;
  try { return JSON.parse(text); } catch (err) { return text; }
}

// LISTADO CON PAGINACIÓN + BÚSQUEDA
async function find(params) {
  const query = new URLSearchParams();

  if (params?.limit != null) query.append('limit', String(params.limit));
  if (params?.offset != null) query.append('offset', String(params.offset));
  if (params?.search) query.append('search', params.search);
  if (params?.sortField) query.append('sortField', params.sortField);
  if (params?.sortOrder != null) query.append('sortOrder', String(params.sortOrder));

  // Filtros de columna soportados por el backend
  if (params?.activoSn) query.append('activoSn', params.activoSn);
  if (params?.nombreUsuario) query.append('nombreUsuario', params.nombreUsuario);
  if (params?.apellidos) query.append('apellidos', params.apellidos);
  if (params?.email) query.append('email', params.email);
  if (params?.estadoId != null) query.append('estadoId', String(params.estadoId));

  const qs = query.toString() ? `?${query.toString()}` : '';

  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };

  const res = await fetch(`${BASE_URL}/usuarios${qs}`, { method: 'GET', headers });
  return await handleResponse(res, 'findUsuarios');
}

async function getById(id) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/usuarios/${id}`, { method: 'GET', headers });
  return await handleResponse(res, 'getUsuarioById');
}

async function create(payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/usuarios`, { method: 'POST', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'createUsuario');
}

async function update(id, payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/usuarios/${id}`, { method: 'PATCH', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'updateUsuarioById');
}

async function replace(id, payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/usuarios/${id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'replaceUsuarioById');
}

async function _delete(id) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/usuarios/${id}`, { method: 'DELETE', headers });
  return await handleResponse(res, 'deleteUsuarioById');
}

async function count(where) {
  const qs = where && Object.keys(where).length ? `?${new URLSearchParams(where).toString()}` : '';
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/usuarios/count${qs}`, { method: 'GET', headers });
  return await handleResponse(res, 'countUsuarios');
}

// Auth endpoints (login/register)
async function login(data) {
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(`${BASE_URL}/usuarios/login`, { method: 'POST', headers, body: JSON.stringify(data) });
  return await handleResponse(res, 'login');
}

async function register(data) {
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(`${BASE_URL}/usuarios/register`, { method: 'POST', headers, body: JSON.stringify(data) });
  return await handleResponse(res, 'register');
}

// Upload image for a user. Tries the consolidated endpoint first (/usuarios/:id/imagen)
// and falls back to the older uploads route (/uploads/users/:id) for backward
// compatibility. Returns the parsed response (expected { path, url }).
async function uploadImage(userId, file, filename) {
  if (!userId) throw new Error('userId required')
  if (!file) throw new Error('file required')

  const candidates = [
    `${BASE_URL}/usuarios/${userId}/imagen`,
    `${BASE_URL}/api/uploads/users/${userId}`,
    `${BASE_URL}/uploads/users/${userId}`,
  ]

  const fd = new FormData()
  fd.append('file', file)
  if (filename) fd.append('filename', filename)

  const headers = getAuthHeader()

  let lastError = null
  const tried = []
  for (const url of candidates) {
    tried.push(url)
    try {
      const res = await fetch(url, { method: 'POST', headers, body: fd })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        const err = new Error(`uploadImage failed ${res.status}: ${txt}`)
        err.status = res.status
        lastError = err
        continue
      }
      const contentType = res.headers.get('content-type') || ''
      const txt = await res.text().catch(() => '')
      if (!txt) return null
      if (!contentType.includes('application/json')) return txt
      try { return JSON.parse(txt) } catch (e) { return txt }
    } catch (e) {
      lastError = e
    }
  }

  const msg = lastError ? `${lastError.message}` : 'No endpoint responded successfully'
  const err = new Error(`uploadImage failed. Tried: ${tried.join(', ')}. Last error: ${msg}`)
  throw err
}

module.exports = {
  find,
  getById,
  create,
  update,
  replace,
  delete: _delete,
  count,
  login,
  register,
  uploadImage
};

