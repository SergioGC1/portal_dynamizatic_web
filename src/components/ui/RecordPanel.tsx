import React, { useState, useEffect } from 'react'
import { InputSwitch } from 'primereact/inputswitch'
import { ColumnDef } from '../../components/data-table/DataTable'
import Button from './Button'
import './RecordPanel.css'
// Componente de fases (solo para productos)
import ProductPhasesPanel from '../../components/product/ProductPhasesPanel'

// RecordPanel: componente reutilizable para ver/editar un registro.
// - Textos y comentarios en español.
// - Uso de genérico para soportar distintos tipos de registros.

type Modo = 'ver' | 'editar'

type Props<T = any> = {
    mode: Modo
    record?: T | null
    columns?: ColumnDef<any>[]
    onClose: () => void
    onSave?: (updated: T) => Promise<void>
    // tipo de entidad opcional (ej: 'producto') para forzar comportamientos específicos
    entityType?: string
}

export default function RecordPanel<T = any>({ mode, record = null, columns = [], onClose, onSave, entityType }: Props<T>) {
    // estado del formulario local
    const [form, setForm] = useState<T | Record<string, any>>({})
    const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({})

    useEffect(() => {
        setForm((record as any) || {})
    }, [record])

    // Cambia un campo del formulario
    const handleChange = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }))

    const save = async () => {
        // Validaciones específicas para ciertos tipos de entidad
        setFieldErrors({})
        if (entityType === 'usuario') {
            const isCreating = !(form as any)?.id
            if (isCreating) {
                const pw = String((form as any).password || '')
                if (!pw || pw.length < 8) {
                    setFieldErrors({ password: 'La contraseña debe tener al menos 8 caracteres' })
                    return
                }
            }
        }
        if (onSave) await onSave(form as T)
    }

    const removeImage = () => {
        handleChange('imagen', '')
        setForm((s: any) => {
            const copy = { ...s }
            delete copy._imagenFile
            return copy
        })
    }

    // Roles y permisos (solo para entidad 'usuario')
    const [rolesOptions, setRolesOptions] = useState<Array<any>>([])
    const [selectedRole, setSelectedRole] = useState<string | null>(null)
    const [rolePermisos, setRolePermisos] = useState<Array<any>>([])

    const formRolId = (form as any)?.rolId
    const formId = (form as any)?.id
    const formRol = (form as any)?.rol

    useEffect(() => {
        const load = async () => {
            if (entityType !== 'usuario') return
            try {
                const RolesAPI = require('../../api-endpoints/roles/index')
                const PermisosAPI = require('../../api-endpoints/permisos/index')
                const allRoles = await RolesAPI.findRoles()
                const opts = (allRoles || []).map((r: any) => ({ label: r.nombre || r.name || String(r.id), value: String(r.id) }))
                setRolesOptions(opts)

                // preseleccionar rol si viene en el form (compatibilidad con campos antiguos `rolId`)
                const currentRolId = String(formRolId || formRol || '') || null
                if (currentRolId) {
                    setSelectedRole(currentRolId)
                    handleChange('_assignedRoles', [currentRolId])
                    // cargar permisos asociados al rol seleccionado
                    try {
                        const perms = await PermisosAPI.findPermisos({ 'filter[where][rolId]': currentRolId })
                        setRolePermisos(perms || [])
                    } catch (e) {
                        console.error('Error loading permisos for role', e)
                        setRolePermisos([])
                    }
                } else {
                    // si no hay rol en el form, limpiamos selección
                    setSelectedRole(null)
                    setRolePermisos([])
                }
            } catch (e) {
                console.error('Error loading roles', e)
            }
        }
        load()
        // re-ejecutar cuando cambie entityType o el rol del formulario/registro
    }, [entityType, formRolId, formRol, formId])



    // Determinar la clave del título (por ejemplo el nombre del usuario o producto).
    // Estrategia sencilla y explícita (fácil de entender para un developer junior):
    // 1) Si no hay columnas definidas, usamos 'nombre' por defecto.
    // 2) Buscamos la primera columna cuya key incluya palabras típicas de título
    //    ('nombre', 'name', 'titulo', 'title').
    // 3) Si no encontramos ninguna, usamos la primera columna disponible.
    const titleKey = (() => {
        if (!columns || columns.length === 0) return 'nombre'
        for (const c of columns) {
            const k = String(c.key).toLowerCase()
            if (k.includes('nombre') || k.includes('name') || k.includes('titulo') || k.includes('title')) {
                return c.key
            }
        }
        return columns[0].key || 'nombre'
    })()

    // Simplificamos: el campo de imagen se llama siempre `imagen`.
    const imageValue = (form as any)?.imagen

    // Determinar si la tabla (columns) declara la columna 'imagen'
    const hasImagenColumn = (columns || []).some((c) => String(c.key).toLowerCase() === 'imagen')

    // Mostrar el bloque de imagen sólo si:
    // - el registro ya tiene imagen, o
    // - estamos en modo 'editar' y la definición de columnas incluye 'imagen'.
    // Esto evita que entidades como Roles muestren el input de imagen si no corresponde.
    const shouldShowImage = Boolean(imageValue || (mode === 'editar' && hasImagenColumn))

    // campos a renderizar en el grid: todos excepto imagen, título y acciones
    const gridColumns = (columns || []).filter((c) => {
        const k = c.key.toLowerCase()
        if (k.includes('accion') || k.includes('acciones')) return false
        if (c.key === 'imagen') return false
        if (titleKey && c.key === titleKey) return false
        return true
    })

    const titleValue = (form as any)?.[titleKey]

    // Si no hay registro, no renderizamos nada (comprobación después de invocar hooks)
    if (!record) return null

    // Detectar si este RecordPanel está mostrando un producto.
    // Heurística: productos suelen tener 'estadoId' y campos como 'tamaO' o 'anyo'.
    const isProductRecord = Boolean(
        // si nos pasan explícitamente el tipo, lo respetamos
        (entityType === 'producto')
        // si no, heurística basada en campos típicos de producto
        || (
            (form && (form as any).estadoId !== undefined)
            && ((columns || []).some(c => String(c.key).toLowerCase() === 'tamao') || (columns || []).some(c => String(c.key).toLowerCase() === 'anyo') || (form && (form as any).anyo !== undefined))
        )
    )

    return (
        <div className="record-panel">
            <div className="record-panel__header">
                <strong className="record-panel__title">{mode === 'ver' ? 'Ver registro' : 'Editar registro'}</strong>
                <div className="record-panel__controls">
                    {mode === 'editar' && (
                        <Button label="Guardar" onClick={save} style={{ marginRight: 8 }} />
                    )}
                    <Button label="Cerrar" onClick={onClose} className="p-button-secondary" />
                </div>
            </div>

            {/* Top: imagen (izquierda) + título (derecha) */}
            <div className="record-panel__top">
                {shouldShowImage && (
                    <div className="record-panel__image-box--static">
                        {imageValue ? (
                            <img src={String(imageValue)} alt="imagen" className="record-panel__thumbnail" />
                        ) : (
                            <div className="record-panel__no-image">Sin imagen</div>
                        )}
                        {/* Icono de borrar sobre la imagen */}
                        {mode === 'editar' && (
                            <div className="record-panel__image-delete">
                                <Button label="" icon="pi pi-trash" onClick={removeImage} className="p-button-sm p-button-rounded p-button-danger" />
                            </div>
                        )}
                    </div>
                )}
                <div className={`record-panel__main-title ${shouldShowImage ? '' : 'record-panel__main-title--full'}`}>
                    {mode === 'editar' ? (
                        <>
                            <label className="record-panel__label">Nombre</label>
                            <input value={titleValue ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(titleKey || (columns[0] && columns[0].key) || 'nombre', e.target.value)} className="record-panel__input record-panel__product-name-input" />
                            {shouldShowImage && (
                                <div style={{ marginTop: 8 }}>
                                    <label className="record-panel__label">URL de imagen</label>
                                    <input value={imageValue ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('imagen', e.target.value)} className="record-panel__input record-panel__input--imageurl" placeholder="Pega aquí la URL de la imagen" />
                                </div>
                            )}
                            {/* Si la entidad es 'usuario' y estamos creando (no tiene id) mostrar input de contraseña */}
                            {entityType === 'usuario' && !(form as any)?.id && (
                                <div style={{ marginTop: 8 }}>
                                    <label className="record-panel__label">Contraseña (mínimo 8 caracteres)</label>
                                    <input type="password" value={(form as any).password || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('password', e.target.value)} className="record-panel__input" />
                                    {fieldErrors.password && <div style={{ color: 'red', marginTop: 6 }}>{fieldErrors.password}</div>}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="record-panel__label">Nombre</div>
                            <div className="record-panel__value record-panel__value--view record-panel__product-name">{String(titleValue ?? '')}</div>
                            {imageValue && (
                                <div style={{ marginTop: 8 }}>
                                    <div className="record-panel__label">URL de imagen</div>
                                    <div className="record-panel__value record-panel__value--view">{String(imageValue ?? '')}</div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="record-panel__grid">
                {gridColumns.map((col) => {
                    const key = col.key
                    const label = (col as any).title || (col as any).label || key
                    const value = (form as any)?.[key]
                    const isActivo = key.toLowerCase().includes('activo')
                    return (
                        <div key={key} className="record-panel__field">
                            <label className="record-panel__label">{label}</label>
                            {mode === 'ver' ? (
                                isActivo ? (
                                    // En vista mostramos el switch en modo solo-lectura y la etiqueta
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <InputSwitch checked={String(value ?? '').toUpperCase() === 'S'} disabled />
                                        <span style={{ fontSize: 14 }}>{String(value ?? '').toUpperCase() === 'S' ? 'Activo' : 'Inactivo'}</span>
                                    </div>
                                ) : (
                                    <div className="record-panel__value record-panel__value--view">{String(value ?? '')}</div>
                                )
                            ) : (
                                isActivo ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <InputSwitch checked={String(value ?? '').toUpperCase() === 'S'} onChange={(e: any) => handleChange(key, e.value ? 'S' : 'N')} />
                                        <span style={{ fontSize: 14 }}>{String(value ?? '').toUpperCase() === 'S' ? 'Activo' : 'Inactivo'}</span>
                                    </div>
                                ) : (
                                    <input value={value ?? ''} onChange={(e) => handleChange(key, (e.target as HTMLInputElement).value)} className="record-panel__input" />
                                )
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Rol para usuarios: selector de rol y listado de permisos del rol */}
            {entityType === 'usuario' && (
                <div className="record-panel__grid">
                    <div className="record-panel__field">
                        <label className="record-panel__label">Rol</label>
                        {mode === 'ver' ? (
                            <div className="record-panel__value record-panel__value--view">
                                {selectedRole ? (
                                    <div style={{ color: '#333' }}>{rolesOptions.find(o => o.value === selectedRole)?.label || selectedRole}</div>
                                ) : (
                                    <div style={{ color: '#999' }}>Sin rol asignado</div>
                                )}
                                {/* Mostrar los permisos del rol */}
                                <div style={{ marginTop: 8 }}>
                                    {(rolePermisos && rolePermisos.length) ? (
                                        rolePermisos.map((p) => (
                                            <div key={`${p.pantalla}-${p.accion}`} style={{ color: '#666', marginBottom: 4 }}>{p.pantalla} / {p.accion}</div>
                                        ))
                                    ) : (
                                        <div style={{ color: '#999' }}>No hay permisos para este rol</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <select value={selectedRole || ''} onChange={async (e) => {
                                    const val = e.target.value || null
                                    setSelectedRole(val)
                                    handleChange('_assignedRoles', val ? [val] : [])
                                    // actualizar rolId real para compatibilidad con payloads existentes
                                    handleChange('rolId', val ? (isNaN(Number(val)) ? val : Number(val)) : val)
                                    // cargar permisos del rol seleccionado
                                    try {
                                        const PermisosAPI = require('../../api-endpoints/permisos/index')
                                        if (val) {
                                            const perms = await PermisosAPI.findPermisos({ 'filter[where][rolId]': val })
                                            setRolePermisos(perms || [])
                                        } else {
                                            setRolePermisos([])
                                        }
                                    } catch (err) {
                                        console.error('Error loading permisos for role', err)
                                        setRolePermisos([])
                                    }
                                }} style={{ width: '100%', padding: 8, borderRadius: 6 }}>
                                    <option value="">-- Selecciona un rol --</option>
                                    {rolesOptions.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                {/* Mostrar permisos del rol seleccionado */}
                                <div style={{ marginTop: 8 }}>
                                    {(rolePermisos && rolePermisos.length) ? (
                                        rolePermisos.map((p) => (
                                            <div key={`${p.pantalla}-${p.accion}`} style={{ color: '#666', marginBottom: 4 }}>{p.pantalla} / {p.accion}</div>
                                        ))
                                    ) : (
                                        <div style={{ color: '#999' }}>No hay permisos para este rol</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Si es un producto existente (tiene id) mostramos el panel de fases */}
            {isProductRecord && (form as any)?.id && (
                <ProductPhasesPanel productId={(form as any).id} />
            )}
        </div>
    )
}
