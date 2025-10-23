// Utilidades mínimas para manejar el token en localStorage.
// Nota: este es un enfoque simple; considera extraer esto a un servicio
// si quieres cambiar la estrategia de persistencia en el futuro.
export function getAccessToken() {
  return localStorage.getItem('accessToken');  // Obtener el token de acceso almacenado en localStorage
}

export function setAccessToken(token) {
  localStorage.setItem('accessToken', token); // Almacenar el token de acceso en localStorage
}

export function removeAccessToken() {
  localStorage.removeItem('accessToken'); // Eliminar el token de acceso de localStorage
}
