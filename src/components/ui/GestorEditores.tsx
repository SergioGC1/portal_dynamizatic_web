import React from 'react'
import { ColumnDef } from '../../components/data-table/DataTable'
// Importar los paneles específicos
import PanelUsuario from '../../pages/usuarios/editar'
import PanelProducto from '../../pages/productos/editarProducto/editar'
import PanelRol from '../../pages/roles/editar'
import PanelFase from '../../pages/fases/editar'

type ModoDeOperacionDelPanel = 'ver' | 'editar'

type PropiedadesDelGestorEditores<TipoDeRegistro = any> = {
    mode: ModoDeOperacionDelPanel
    record?: TipoDeRegistro | null
    columns?: ColumnDef<any>[]
    onClose: () => void
    onSave?: (registroActualizado: TipoDeRegistro) => Promise<void>
    onUploadSuccess?: (identificadorDelUsuario: number) => void
    entityType?: string
}

/**
 * GestorEditores - Nombre solicitado para el gestor de paneles
 */
export default function GestorEditores<TipoDeRegistro = any>({
    mode,
    record = null,
    columns = [],
    onClose,
    onSave,
    onUploadSuccess,
    entityType
}: PropiedadesDelGestorEditores<TipoDeRegistro>) {
    if (!record) return null

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

// Re-export del mapa de paneles para compatibilidad con la API anterior
export const PANELES_DISPONIBLES = {
    usuario: 'PanelUsuario',
    producto: 'PanelProducto',
    fase: 'PanelFase',
    rol: 'PanelRol'
} as const;

export type TipoEntidad = keyof typeof PANELES_DISPONIBLES
