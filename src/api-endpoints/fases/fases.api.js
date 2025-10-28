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

async function find(params) {
  const qs = params && Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : '';
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/fases${qs}`, { method: 'GET', headers });
  return await handleResponse(res, 'findFases');
}

async function getById(id) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/fases/${id}`, { method: 'GET', headers });
  return await handleResponse(res, 'getFaseById');
}

async function create(payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/fases`, { method: 'POST', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'createFase');
}

async function update(id, payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/fases/${id}`, { method: 'PATCH', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'updateFaseById');
}

async function replace(id, payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/fases/${id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'replaceFaseById');
}

async function _delete(id) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/fases/${id}`, { method: 'DELETE', headers });
  return await handleResponse(res, 'deleteFaseById');
}

async function count(where) {
  const qs = where && Object.keys(where).length ? `?${new URLSearchParams(where).toString()}` : '';
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/fases/count${qs}`, { method: 'GET', headers });
  return await handleResponse(res, 'countFases');
}

module.exports = { find, getById, create, update, replace, delete: _delete, count };
