import React, { useState, useEffect } from 'react'
import { Button } from 'primereact/button'
import { InputSwitch } from 'primereact/inputswitch'
import '../ui/GestorPaneles.css'
import './PanelRol.scss'
import RolesAPI from '../../api-endpoints/roles/index'

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

        // Validación de unicidad de nombre (pre-chequeo antes de llamar al backend)
        try {
            // No dependemos de cómo el backend interpreta "where"; filtramos en cliente
            const lista = await RolesAPI.findRoles()
            const esNuevo = !formularioDelRol?.id
            const idActual = (formularioDelRol as any)?.id
            const nombreNormalizado = nombreDelRol.toLowerCase()
            const existeOtroConMismoNombre = Array.isArray(lista) && lista.some((r: any) => {
                if (!r) return false
                const n = String(r.nombre || '').trim().toLowerCase()
                if (n !== nombreNormalizado) return false
                // Si estamos editando, ignorar el propio registro
                if (!esNuevo && Number(r.id) === Number(idActual)) return false
                return true
            })
            if (existeOtroConMismoNombre) {
                establecerErroresDeValidacionDelRol({ nombre: 'Este nombre de rol ya está en uso' })
                return
            }
        } catch (e) {
            // Si el pre-chequeo falla, continuamos y delegamos en el backend
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

        if (onSave) {
            try {
                await onSave(datosLimpiosDelRol as Rol)
            } catch (e: any) {
                // Mapear errores del backend (por ejemplo, unique constraint sobre nombre)
                const errores: Record<string, string> = {}
                const msg: string = e?.message || ''
                let mensajeBackend: string | null = null
                let detalles: any = null
                const i = msg.indexOf('{')
                if (i >= 0) {
                    try {
                        const jsonStr = msg.slice(i)
                        const parsed = JSON.parse(jsonStr)
                        mensajeBackend = parsed?.error?.message || null
                        detalles = parsed?.error?.details || null
                    } catch {}
                }
                const base = (mensajeBackend || msg).toLowerCase()
                if (/unique|duplicad/i.test(base) && /nombre/.test(base)) {
                    errores.nombre = 'Este nombre de rol ya está en uso'
                }
                if (!errores.nombre && Array.isArray(detalles)) {
                    const enNombre = detalles.find((d: any) => /nombre/i.test(String(d?.path || d?.message || '')) && /unique|duplicad/i.test(String(d?.code || d?.message || '')))
                    if (enNombre) errores.nombre = 'Este nombre de rol ya está en uso'
                }
                if (Object.keys(errores).length) {
                    establecerErroresDeValidacionDelRol(errores)
                    return
                }
                throw e
            }
        }
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
                        className={`record-panel__input record-panel__product-name-input ${erroresDeValidacionDelRol.nombre ? 'record-panel__input--error' : ''}`}
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