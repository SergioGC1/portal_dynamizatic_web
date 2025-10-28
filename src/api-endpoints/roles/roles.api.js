const BASE_URL = (typeof window !== 'undefined' && window.__API_BASE_URL__) || 'http://localhost:3000';

function getAuthHeader() {
  if (typeof localStorage === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res, context) {
  const contentType = res.headers.get('content-type') || '';
  // Leer como texto primero para evitar errores con cuerpos vacíos
  const text = await res.text().catch(() => '');

  if (!res.ok) {
    const body = text || '';
    throw new Error(`${context} failed: ${res.status} ${res.statusText} ${body}`);
  }

  if (!text) return null; // cuerpo vacío (204 o respuesta sin body)
  if (!contentType.includes('application/json')) return text;

  try {
    return JSON.parse(text);
  } catch (err) {
    // Si no es JSON válido, devolver el texto tal cual
    return text;
  }
}

async function find(params) {
  const qs = params && Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : '';
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/roles${qs}`, { method: 'GET', headers });
  return await handleResponse(res, 'findRoles');
}

async function getById(id) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/roles/${id}`, { method: 'GET', headers });
  return await handleResponse(res, 'getRoleById');
}

async function create(payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/roles`, { method: 'POST', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'createRole');
}

async function update(id, payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/roles/${id}`, { method: 'PATCH', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'updateRoleById');
}

async function replaceFn(id, payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/roles/${id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'replaceRoleById');
}

async function _delete(id) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/roles/${id}`, { method: 'DELETE', headers });
  return await handleResponse(res, 'deleteRoleById');
}

async function count(where) {
  const qs = where && Object.keys(where).length ? `?${new URLSearchParams(where).toString()}` : '';
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/roles/count${qs}`, { method: 'GET', headers });
  return await handleResponse(res, 'countRoles');
}

module.exports = { find, getById, create, update, replace: replaceFn, delete: _delete, count };
