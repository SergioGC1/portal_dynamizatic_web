// Compatibilidad ESM/CJS: algunos bundlers ponen la librería en `.default`.
// Adaptador: reexporta la implementación nueva y limpia de mensajes-chats
const mcAPI = require('./mensajes-chats.api.js');

module.exports = {
  findMensajesChats: (params) => mcAPI.find(params),
  getMensajesChatById: (id) => mcAPI.getById(id),
  createMensajesChat: (payload) => mcAPI.create(payload),
  updateMensajesChatById: (id, payload) => mcAPI.update(id, payload),
  replaceMensajesChatById: (id, payload) => mcAPI.replace(id, payload),
  deleteMensajesChatById: (id) => mcAPI.delete(id),
  countMensajesChats: (where) => mcAPI.count(where),
};
