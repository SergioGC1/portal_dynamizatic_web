/**
 * Índice de componentes de paneles de entidades
 * 
 * Este archivo exporta todos los paneles especializados para la gestión
 * de diferentes entidades del sistema, siguiendo una arquitectura modular
 * y aplicando principios de Clean Code.
 */

// Paneles especializados por entidad
export { default as PanelUsuario } from './PanelUsuario';
export { default as PanelProducto } from './PanelProducto';
export { default as PanelFase } from './PanelFase';
export { default as PanelRol } from './PanelRol';

// Tipos y interfaces comunes están definidos en cada panel específico

/**
 * Mapa de paneles disponibles para referencia dinámica
 */
export const PANELES_DISPONIBLES = {
    usuario: 'PanelUsuario',
    producto: 'PanelProducto',
    fase: 'PanelFase',
    rol: 'PanelRol'
} as const;

/**
 * Tipos de entidades soportadas
 */
export type TipoEntidad = keyof typeof PANELES_DISPONIBLES;