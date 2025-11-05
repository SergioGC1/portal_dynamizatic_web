import React, { useState, useEffect } from 'react'
import { Button } from 'primereact/button'
import { InputSwitch } from 'primereact/inputswitch'
import '../ui/GestorPaneles.css'
import './PanelRol.scss'

// Interfaces con nomenclatura en español
interface Rol {
    id?: number
    nombre: string
    descripcion?: string
    activo?: string
    activoSn?: string
    permisos?: string[]
    nivel?: number
    esSistema?: boolean
}

interface PropiedadesPanelRol {
    mode: 'ver' | 'editar'
    record: Rol | null
    columns: Array<{
        key: string
        title?: string
        label?: string
    }>
    onClose: () => void
    onSave?: (rol: Rol) => Promise<void>
}


export default function PanelRol({ mode, record = null, columns = [], onClose, onSave }: PropiedadesPanelRol) {

    // Estados del formulario con nombres descriptivos en español
    const [formularioDelRol, establecerFormularioDelRol] = useState<Rol | Record<string, any>>({})
    const [erroresDeValidacionDelRol, establecerErroresDeValidacionDelRol] = useState<Record<string, string>>({})

    // Inicializar formulario cuando cambie el registro
    useEffect(() => {
        establecerFormularioDelRol((record as any) || {})
    }, [record])

    // Actualiza un campo específico del formulario del rol
    const actualizarCampoDelFormularioRol = (claveCampo: string, valorDelCampo: any) =>
        establecerFormularioDelRol((formularioActual: any) => ({
            ...formularioActual,
            [claveCampo]: valorDelCampo
        }))

    // Validar y guardar el rol con validaciones específicas
    const guardarRolConValidaciones = async () => {
        establecerErroresDeValidacionDelRol({})

        // Validar nombre del rol
        const nombreDelRol = String(formularioDelRol.nombre || '').trim()
        if (!nombreDelRol || nombreDelRol.length < 3) {
            establecerErroresDeValidacionDelRol({ nombre: 'El nombre del rol debe tener al menos 3 caracteres' })
            return
        }

        // Validar nivel del rol
        const nivelDelRol = Number(formularioDelRol.nivel || 1)
        if (nivelDelRol < 1 || nivelDelRol > 10) {
            establecerErroresDeValidacionDelRol({ nivel: 'El nivel debe estar entre 1 y 10' })
            return
        }

        // Limpiar y normalizar datos antes de enviar al servidor
        const datosLimpiosDelRol: any = { ...formularioDelRol }
        // Normalizar estado activo al formato esperado por la API: 'activoSn' = 'S' | 'N'
        const valorActualDeActivo = (datosLimpiosDelRol.activoSn ?? datosLimpiosDelRol.activo) as string | boolean | undefined
        if (valorActualDeActivo !== undefined) {
            const estaActivoNormalizado = (typeof valorActualDeActivo === 'boolean')
                ? (valorActualDeActivo ? 'S' : 'N')
                : (String(valorActualDeActivo).toUpperCase() === 'S' ? 'S' : 'N')
            datosLimpiosDelRol.activoSn = estaActivoNormalizado
        }
        // Eliminar propiedad no permitida por la API si existe
        if ('activo' in datosLimpiosDelRol) delete datosLimpiosDelRol.activo
        if (datosLimpiosDelRol._cb !== undefined) delete datosLimpiosDelRol._cb

        if (onSave) await onSave(datosLimpiosDelRol as Rol)
    }



    // No renderizar si no hay registro
    if (!record) return null

    return (
        <div className="record-panel">
            <div className="record-panel__header">
                <strong className="record-panel__title">
                    {mode === 'ver' ? 'Ver rol' : 'Editar rol'}
                </strong>
                <div className="record-panel__controls">
                    {mode === 'editar' && (
                        <Button
                            label="Guardar"
                            onClick={guardarRolConValidaciones}
                            style={{ marginRight: 8 }}
                        />
                    )}
                    <Button
                        label="Cerrar"
                        onClick={onClose}
                        className="p-button-secondary"
                    />
                </div>
            </div>

            {/* Sección superior: título del rol */}
            <div className="record-panel__top">
                <div className="record-panel__main-title record-panel__main-title--full">
                    <label className="record-panel__label">Nombre del rol</label>
                    <input
                        value={formularioDelRol?.nombre ?? ''}
                        onChange={(evento: React.ChangeEvent<HTMLInputElement>) =>
                            actualizarCampoDelFormularioRol('nombre', evento.target.value)
                        }
                        className="record-panel__input record-panel__product-name-input"
                        disabled={mode === 'ver'}
                    />

                    {erroresDeValidacionDelRol.nombre && (
                        <div style={{ color: 'red', marginTop: 6 }}>
                            {erroresDeValidacionDelRol.nombre}
                        </div>
                    )}
                </div>
            </div>

            {/* Campo Estado Activo */}
            <div className="record-panel__field">
                <label className="record-panel__label">Estado</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <InputSwitch
                        checked={
                            String((formularioDelRol as any)?.activoSn ?? (formularioDelRol as any)?.activo ?? '')
                                .toUpperCase() === 'S' || (formularioDelRol as any)?.activo === true
                        }
                        onChange={(evento: any) => {
                            // Actualizamos 'activoSn' y eliminamos 'activo' para evitar errores 422 por propiedades adicionales
                            establecerFormularioDelRol((formularioActual: any) => {
                                const formularioActualizado = {
                                    ...formularioActual,
                                    activoSn: evento.value ? 'S' : 'N',
                                }
                                if ('activo' in formularioActualizado) delete (formularioActualizado as any).activo
                                return formularioActualizado
                            })
                        }}
                        disabled={mode === 'ver'}
                    />
                    <span style={{ fontSize: 14 }}>
                        {String((formularioDelRol as any)?.activoSn ?? (formularioDelRol as any)?.activo ?? '')
                            .toUpperCase() === 'S' || (formularioDelRol as any)?.activo === true
                            ? 'Activo'
                            : 'Inactivo'
                        }
                    </span>
                </div>
            </div>
        </div>
    )
}