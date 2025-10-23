const BASE_URL = (typeof window !== 'undefined' && window.__API_BASE_URL__) || 'http://localhost:3000';

function getAuthHeader() {
  if (typeof localStorage === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res, context) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${context} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return await res.json();
}

async function find(params) {
  const qs = params && Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : '';
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

// Auth endpoints (login/register) - adjust paths if backend differs
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

module.exports = {
  find,
  getById,
  create,
  update,
  replace,
  delete: _delete,
  count,
  login,
  register
};
