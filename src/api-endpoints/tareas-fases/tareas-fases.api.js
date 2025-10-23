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
  const res = await fetch(`${BASE_URL}/tareas-fases${qs}`, { method: 'GET', headers });
  return await handleResponse(res, 'findTareasFases');
}

async function getById(id) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/tareas-fases/${id}`, { method: 'GET', headers });
  return await handleResponse(res, 'getTareasFaseById');
}

async function create(payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/tareas-fases`, { method: 'POST', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'createTareasFase');
}

async function update(id, payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/tareas-fases/${id}`, { method: 'PATCH', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'updateTareasFaseById');
}

async function replace(id, payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/tareas-fases/${id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'replaceTareasFaseById');
}

async function _delete(id) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/tareas-fases/${id}`, { method: 'DELETE', headers });
  return await handleResponse(res, 'deleteTareasFaseById');
}

async function count(where) {
  const qs = where && Object.keys(where).length ? `?${new URLSearchParams(where).toString()}` : '';
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/tareas-fases/count${qs}`, { method: 'GET', headers });
  return await handleResponse(res, 'countTareasFases');
}

module.exports = { find, getById, create, update, replace, delete: _delete, count };
