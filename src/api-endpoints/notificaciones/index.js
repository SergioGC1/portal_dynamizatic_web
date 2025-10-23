// Compatibilidad ESM/CJS: algunos bundlers ponen la librería en `.default`.
// Adaptador: reexporta la implementación nueva y limpia de notificaciones
const notiAPI = require('./notificaciones.api.js');

module.exports = {
  findNotificaciones: (params) => notiAPI.find(params),
  getNotificacionById: (id) => notiAPI.getById(id),
  createNotificacion: (payload) => notiAPI.create(payload),
  updateNotificacionById: (id, payload) => notiAPI.update(id, payload),
  replaceNotificacionById: (id, payload) => notiAPI.replace(id, payload),
  deleteNotificacionById: (id) => notiAPI.delete(id),
  countNotificaciones: (where) => notiAPI.count(where),
};
