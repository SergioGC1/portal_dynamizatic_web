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
  const res = await fetch(`${BASE_URL}/productos${qs}`, { method: 'GET', headers });
  return await handleResponse(res, 'findProductos');
}

async function getById(id) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/productos/${id}`, { method: 'GET', headers });
  return await handleResponse(res, 'getProductoById');
}

async function create(payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/productos`, { method: 'POST', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'createProducto');
}

async function update(id, payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/productos/${id}`, { method: 'PATCH', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'updateProductoById');
}

async function replaceFn(id, payload) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/productos/${id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
  return await handleResponse(res, 'replaceProductoById');
}

async function _delete(id) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/productos/${id}`, { method: 'DELETE', headers });
  return await handleResponse(res, 'deleteProductoById');
}

async function count(where) {
  const qs = where && Object.keys(where).length ? `?${new URLSearchParams(where).toString()}` : '';
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(`${BASE_URL}/productos/count${qs}`, { method: 'GET', headers });
  return await handleResponse(res, 'countProductos');
}

module.exports = { find, getById, create, update, replace: replaceFn, delete: _delete, count };
