// Compatibilidad ESM/CJS: algunos bundlers ponen la librería en `.default`.
// Adaptador: reexporta la implementación nueva y limpia de tareas-fases
const tareasFasesAPI = require('./tareas-fases.api.js');

module.exports = {
  findTareasFases: (params) => tareasFasesAPI.find(params),
  getTareasFaseById: (id) => tareasFasesAPI.getById(id),
  createTareasFase: (payload) => tareasFasesAPI.create(payload),
  updateTareasFaseById: (id, payload) => tareasFasesAPI.update(id, payload),
  replaceTareasFaseById: (id, payload) => tareasFasesAPI.replace(id, payload),
  deleteTareasFaseById: (id) => tareasFasesAPI.delete(id),
  countTareasFases: (where) => tareasFasesAPI.count(where),
};
