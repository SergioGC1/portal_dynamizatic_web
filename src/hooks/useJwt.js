const usuariosApi = require('../api-endpoints/usuarios/index.js');
const productosApi = require('../api-endpoints/productos/index.js');

function extraerTokens(data) {
  if (!data) return {};
  const accessToken = data.accessToken || data.token || data.access_token || data.jwt || data.idToken || (data.token && data.token.accessToken) || (data.access && data.access.token) || null;
  const refreshToken = data.refreshToken || data.refresh_token || (data.token && data.token.refreshToken) || null;
  return { accessToken, refreshToken };
}

export default function useJwt() {
  // Iniciar sesión: llamar a usuariosApi.login y guardar tokens en localStorage
  const signIn = async ({ email, password }) => {
    console.debug('AUTH signIn start', { email });
    let data;
    try {
      data = await usuariosApi.login({ email, password });
      console.debug('AUTH signIn response:', data);
    } catch (err) {
      console.error('AUTH signIn error:', err);
      throw err;
    }
    const { accessToken, refreshToken } = extraerTokens(data);
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    return data;
  };

  // Registrarse: llamar a usuariosApi.register y guardar tokens en localStorage
  const signUp = async (payload) => {
    console.debug('AUTH signUp start', { payload });
    let data;
    try {
      data = await usuariosApi.register(payload);
      console.debug('AUTH signUp response:', data);
    } catch (err) {
      console.error('AUTH signUp error:', err);
      throw err;
    }
    const { accessToken, refreshToken } = extraerTokens(data);
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    return data;
  };

  // Obtener lista de usuarios (ejemplo de llamada autenticada)
  const getUsuarios = async (params) => {
    console.debug('AUTH getUsuarios start', { params });
    // Intentamos la implementación del módulo generado primero. Si falla, aplicamos un fallback
    try {
      const data = await usuariosApi.findUsuarios(params);
      console.debug('AUTH getUsuarios response', data && (Array.isArray(data) ? { length: data.length } : data));
      return data;
    } catch (err) {
      console.warn('AUTH getUsuarios: fallback activado por error en usuariosApi.findUsuarios', err);
      // Fallback sencillo: fetch directo al endpoint público
      try {
        const qs = params && Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : '';
        const res = await fetch((typeof window !== 'undefined' && window.__API_BASE_URL__ ? window.__API_BASE_URL__ : 'http://localhost:3000') + `/usuarios${qs}`);
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          const e = new Error(`Fallback fetch failed: ${res.status} ${res.statusText} ${body}`);
          e.status = res.status;
          throw e;
        }
        const json = await res.json().catch((parseErr) => { throw parseErr; });
        console.debug('AUTH getUsuarios fallback response', json && (Array.isArray(json) ? { length: json.length } : json));
        return json;
      } catch (fallbackErr) {
        console.error('AUTH getUsuarios fallback error', fallbackErr);
        throw fallbackErr;
      }
    }
  };

  const getUsuarioById = async (id) => {
    console.debug('AUTH getUsuarioById start', { id });
    try {
      const data = await usuariosApi.getUsuarioById(id);
      console.debug('AUTH getUsuarioById response', data);
      return data;
    }
    catch (err) {
      console.error('AUTH getUsuarioById error:', err);
      throw err;
    }
  };

  const getProductoById = async (id) => {
    console.debug('AUTH getProductoById start', { id });
    try {
      const data = await productosApi.getProductoById(id);
      console.debug('AUTH getProductoById response', data);
      return data;
    } catch (err) {
      console.error('AUTH getProductoById error:', err);
      throw err;
    }
  };


  return { signIn, signUp, getUsuarios, getUsuarioById, getProductoById };
}
