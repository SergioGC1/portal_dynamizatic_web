// Adapter que reexporta la implementación fetch-based en productos.api.js
const productosApi = require('./productos.api.js');

module.exports = {
  findProductos: (params) => productosApi.find(params),
  getProductoById: (id) => productosApi.getById(id),
  createProducto: (payload) => productosApi.create(payload),
  updateProductoById: (id, payload) => productosApi.update(id, payload),
  replaceProductoById: (id, payload) => productosApi.replace(id, payload),
  deleteProductoById: (id) => productosApi.delete(id),
  countProductos: (where) => productosApi.count(where),
  uploadProductoImagen: (id, file, filename) => productosApi.uploadProductoImagen(id, file, filename),
};
