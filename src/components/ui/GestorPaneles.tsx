import React from 'react'
import { ColumnDef } from '../../components/data-table/DataTable'
// Importar los paneles específicos
import PanelUsuario from '../paneles/PanelUsuario'
import PanelProducto from '../paneles/PanelProducto'
import PanelRol from '../paneles/PanelRol'
import PanelFase from '../paneles/PanelFase'

// GestorPaneles: Enrutador ligero que delega a paneles específicos según el tipo de entidad
// Mejora el rendimiento cargando solo el código necesario para cada entidad

type ModoDeOperacionDelPanel = 'ver' | 'editar'

type PropiedadesDelGestorPaneles<TipoDeRegistro = any> = {
    mode: ModoDeOperacionDelPanel
    record?: TipoDeRegistro | null
    columns?: ColumnDef<any>[]
    onClose: () => void
    onSave?: (registroActualizado: TipoDeRegistro) => Promise<void>
    onUploadSuccess?: (identificadorDelUsuario: number) => void
    entityType?: string
}

/**
 * GestorPaneles - Componente gestor que delega a paneles específicos
 * Mejora el rendimiento cargando solo el código necesario para cada entidad
 * 
 * @param mode - Modo de operación: 'ver' o 'editar'
 * @param record - Registro a mostrar/editar
 * @param columns - Definición de columnas para renderizado
 * @param onClose - Callback para cerrar el panel
 * @param onSave - Callback para guardar cambios
 * @param onUploadSuccess - Callback para éxito en subida de archivos
 * @param entityType - Tipo de entidad para determinar qué panel usar
 */
export default function GestorPaneles<TipoDeRegistro = any>({
    mode,
    record = null,
    columns = [],
    onClose,
    onSave,
    onUploadSuccess,
    entityType
}: PropiedadesDelGestorPaneles<TipoDeRegistro>) {
    // Si no hay registro disponible, no renderizar ningún panel
    if (!record) return null

    // Determinar qué panel específico usar basándose en el tipo de entidad recibido
    switch (entityType) {
        case 'usuario':
            return (
                <PanelUsuario
                    mode={mode}
                    record={record as any}
                    columns={columns}
                    onClose={onClose}
                    onSave={onSave as any}
                    onUploadSuccess={onUploadSuccess}
                />
            )

        case 'producto':
            return (
                <PanelProducto
                    mode={mode}
                    record={record as any}
                    columns={columns}
                    onClose={onClose}
                    onSave={onSave as any}
                    onUploadSuccess={onUploadSuccess}
                />
            )

        case 'rol':
            return (
                <PanelRol
                    mode={mode}
                    record={record as any}
                    columns={columns}
                    onClose={onClose}
                    onSave={onSave as any}
                />
            )

        case 'fase':
            return (
                <PanelFase
                    mode={mode}
                    record={record as any}
                    columns={columns}
                    onClose={onClose}
                    onSave={onSave as any}
                />
            )

        default:
            // Panel genérico de respaldo para entidades que aún no tienen implementación específica
            return (
                <div className="record-panel">
                    <div className="record-panel__header">
                        <strong className="record-panel__title">
                            {mode === 'ver' ? 'Ver registro genérico' : 'Editar registro genérico'}
                        </strong>
                        <div className="record-panel__controls">
                            <button onClick={onClose} className="p-button-secondary">
                                Cerrar Panel
                            </button>
                        </div>
                    </div>
                    <div className="record-panel__content">
                        <p>Panel genérico para tipo de entidad: <strong>{entityType || 'Tipo no especificado'}</strong></p>
                        <p>La implementación específica para esta entidad está pendiente de desarrollo.</p>
                        {record && (
                            <pre style={{ 
                                fontSize: '12px', 
                                background: '#f5f5f5', 
                                padding: '10px', 
                                borderRadius: '4px',
                                maxHeight: '300px',
                                overflow: 'auto'
                            }}>
                                {JSON.stringify(record, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            )
    }
}