import React, { useState, useEffect, useRef } from 'react'
import { InputSwitch } from 'primereact/inputswitch'
import { ColumnDef } from '../../components/data-table/DataTable'
import Button from './Button'
import './RecordPanel.css'
// Componente de fases (solo para productos)
import ProductPhasesPanel from '../../components/product/ProductPhasesPanel'
import usePermisos from '../../hooks/usePermisos'

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
    // Callback opcional que será invocado cuando una subida de imagen finalice correctamente.
    // Recibe el id del usuario cuyo archivo se subió (si está disponible).
    onUploadSuccess?: (userId: number) => void
    // tipo de entidad opcional (ej: 'producto') para forzar comportamientos específicos
    entityType?: string
}

export default function RecordPanel<T = any>({ mode, record = null, columns = [], onClose, onSave, onUploadSuccess, entityType }: Props<T>) {
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
        // Capturar fichero pendiente antes de limpiar el payload
        const pendingFile: File | undefined = (form as any)?._imagenFile

        // Construir payload sin propiedades temporales que el backend no acepta
        const payload: any = { ...(form as any) }
        delete payload._imagenFile
        delete payload._imagenPreview
        delete payload._imagenUrl
    // eliminar campos temporales usados por la UI que el backend no valida
    if (payload._cb !== undefined) delete payload._cb

        if (onSave) await onSave(payload as T)

        // después de guardar, intentar subir imagen pendiente (si existe)
        try {
            await tryUploadAfterSave(pendingFile)
        } catch (e) {
            // ya gestionado en tryUploadAfterSave/uploadImage
        }
    }

    // Subida automática tras guardar: si hay un fichero pendiente en _imagenFile,
    // intentamos subirlo después de que el registro tenga id. Esperamos hasta 1s
    // verificando si el id aparece (caso en que el padre actualiza el registro tras onSave).
    const tryUploadAfterSave = async (file?: File) => {
        const pendingFile: File | undefined = file || (form as any)?._imagenFile
        if (!pendingFile) return

        // intentar obtener id (esperar si el padre va a actualizarlo)
        let userId = (form as any)?.id
        const maxRetries = 10
        let i = 0
        while ((!userId || Number.isNaN(Number(userId))) && i < maxRetries) {
            // esperar 100ms
            // eslint-disable-next-line no-await-in-loop
            await new Promise((res) => setTimeout(res, 100))
            userId = (form as any)?.id
            i += 1
        }

        if (!userId) {
            // no podemos subir sin id; informar al usuario para que vuelva a abrir/editar
            alert('Registro guardado pero no se ha podido subir la imagen automáticamente porque el registro no tiene id. Abre el registro y sube la imagen.');
            return
        }

        try {
            await uploadImage(pendingFile, userId)
        } catch (e) {
            // uploadImage ya muestra errores
        }
    }

    const removeImage = () => {
        handleChange('imagen', '')
        setForm((s: any) => {
            const copy = { ...s }
            delete copy._imagenFile
            return copy
        })
        // limpiar preview local si existía
        try {
            if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current)
        } catch (e) {
            // ignore
        }
        currentObjectUrlRef.current = null
        setLocalPreviewUrl(null)
    }

    // Roles (solo para entidad 'usuario'). No mostramos ni cargamos permisos aquí.
    const [rolesOptions, setRolesOptions] = useState<Array<any>>([])
    const [selectedRole, setSelectedRole] = useState<string | null>(null)
    // Permisos del usuario actual: usamos el hook para conocer rolId del usuario
    const { rolId: miRolId } = usePermisos()
    const [puedeEditarRol, setPuedeEditarRol] = useState(false)

    const formRolId = (form as any)?.rolId
    const formId = (form as any)?.id
    const formRol = (form as any)?.rol

    useEffect(() => {
        const load = async () => {
            if (entityType !== 'usuario') return
            try {
                const RolesAPI = require('../../api-endpoints/roles/index')
                const allRoles = await RolesAPI.findRoles()
                const opts = (allRoles || []).map((r: any) => ({ label: r.nombre || r.name || String(r.id), value: String(r.id) }))
                setRolesOptions(opts)

                // preseleccionar rol si viene en el form (compatibilidad con campos antiguos `rolId`)
                const currentRolId = String(formRolId || formRol || '') || null
                if (currentRolId) {
                    setSelectedRole(currentRolId)
                    handleChange('_assignedRoles', [currentRolId])
                } else {
                    // si no hay rol en el form, limpiamos selección
                    setSelectedRole(null)
                }

                // Determinar si el usuario actual tiene el rol 'Supervisor' (sólo él podrá editar roles)
                if (miRolId) {
                    try {
                        const r = await RolesAPI.getRoleById(miRolId)
                        const nombre = String(r?.nombre || r?.name || '').trim().toLowerCase()
                        setPuedeEditarRol(nombre === 'supervisor')
                    } catch (e) {
                        console.error('Error checking supervisor role', e)
                        setPuedeEditarRol(false)
                    }
                } else {
                    setPuedeEditarRol(false)
                }
            } catch (e) {
                console.error('Error loading roles', e)
            }
        }
        load()
        // re-ejecutar cuando cambie entityType o el rol del formulario/registro o el rol del usuario actual
    }, [entityType, formRolId, formRol, formId, miRolId])

    



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

    // Base URL para recursos devuelta por backend (opcional).
    // Si no está configurada, usar 127.0.0.1:3000 como valor por defecto en dev
    // (este proyecto corre el backend en ese puerto en el entorno local).
    const apiBase = (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) || 'http://127.0.0.1:3000'
    const buildImageUrl = (imgPath?: string) => {
        if (!imgPath) return ''
        const s = String(imgPath)
        if (s.startsWith('http://') || s.startsWith('https://')) return s
        if (s.startsWith('/')) return `${apiBase}${s}`
        return `${apiBase}/${s}`
    }
    const [uploadingImage, setUploadingImage] = useState(false)

    // Preview a mostrar: preferir la URL que pueda devolver el backend -> ruta almacenada en imagen
    const previewUrl = (form as any)?._imagenUrl || (imageValue ? buildImageUrl(imageValue) : '')

    // Determinar si la tabla (columns) declara la columna 'imagen'
    const hasImagenColumn = (columns || []).some((c) => String(c.key).toLowerCase() === 'imagen')

    // Mostrar el bloque de imagen sólo si:
    // - el registro ya tiene imagen, o
    // - estamos en modo 'editar' y la definición de columnas incluye 'imagen'.
    // Esto evita que entidades como Roles muestren el input de imagen si no corresponde.
    const shouldShowImage = Boolean(imageValue || (mode === 'editar' && hasImagenColumn))

    // Referencia al input file (oculto). El botón 'Subir imagen' abrirá el diálogo.
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    // File handling: mantenemos un preview local (objectURL) que mostramos
    // en modo editar como overlay encima de la imagen actual.
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
    const currentObjectUrlRef = useRef<string | null>(null)

    // File seleccionado: crear objectURL y guardarlo temporalmente en form
    const onFileSelected = (f?: File) => {
        if (!f) return
        // revocar anterior si existe
        try {
            if (currentObjectUrlRef.current) {
                URL.revokeObjectURL(currentObjectUrlRef.current)
                currentObjectUrlRef.current = null
            }
        } catch (err) {
            // ignore
        }
        const url = URL.createObjectURL(f)
        currentObjectUrlRef.current = url
        setLocalPreviewUrl(url)
        handleChange('_imagenFile', f)
    }

    // limpiar objectURL al desmontar
    useEffect(() => {
        return () => {
            try {
                if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current)
            } catch (e) {
                // ignore
            }
        }
    }, [])

    const uploadImage = async (fileArg?: File, userIdArg?: number | string) => {
        const file: File | undefined = fileArg || (form as any)?._imagenFile
        let userId = userIdArg || (form as any)?.id
        if (!file) return alert('Selecciona un archivo antes de subir')
        if (!userId) return alert('Guarda el registro primero para subir la imagen')

        try {
            setUploadingImage(true)

            // Construir nombre deseado: usar el id como nombre + misma extensión
            const origName = file.name || 'img'
            const extMatch = origName.match(/(\.[0-9a-zA-Z]+)$/)
            const ext = extMatch ? extMatch[1] : '.jpg'
            const desiredFilename = `${userId}${ext}`

            const fd = new FormData()
            fd.append('file', file)
            // añadimos el filename solicitado; backend debe respetarlo
            fd.append('filename', desiredFilename)

            // Nota: autenticación y base URL las gestiona el adaptador `UsuariosAPI`.

            // Intentamos primero el endpoint consolidado en UsuariosController.
            // Si devuelve 404 intentamos la ruta antigua de uploads por compatibilidad.
            // Delegate upload logic to API adapter for cleanliness and testability
            const UsuariosAPI = require('../../api-endpoints/usuarios/index')
            let data = null
            try {
                data = await UsuariosAPI.uploadUsuarioImagen(userId, file, desiredFilename)
            } catch (err) {
                // Si la API adapter lanzó un error, relanzamos para atraparlo abajo
                throw err
            }

            // data.path debería contener la ruta que guardaremos en el usuario
            if (data && data.path) {
                handleChange('imagen', data.path)
                // si el backend devuelve url, guardamos también para preview inmediato
                if (data.url) handleChange('_imagenUrl', data.url)
                // limpiar fichero temporal
                setForm((s: any) => {
                    const copy = { ...s }
                    delete copy._imagenFile
                    return copy
                })
                // revocar y limpiar preview local si existía (ya tenemos la URL del backend)
                try {
                    if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current)
                } catch (e) {
                    // ignore
                }
                currentObjectUrlRef.current = null
                setLocalPreviewUrl(null)
                // Notificar al padre que la subida finalizó — por ejemplo la página de usuarios
                try {
                    if (onUploadSuccess) {
                        const maybeId = Number(userId)
                        if (!Number.isNaN(maybeId)) onUploadSuccess(maybeId)
                    }
                } catch (er) {
                    // ignore
                }
            } else {
                throw new Error('Respuesta del servidor sin path/url')
            }
        } catch (e: any) {
            console.error('Error uploading image', e)
            alert('Error subiendo la imagen: ' + (e?.message || e))
        } finally {
            setUploadingImage(false)
            // terminado
        }
    }

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
                    <div className="record-panel__image-box--static" style={{ position: 'relative', width: 160, height: 160 }}>
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="imagen"
                                        className="record-panel__thumbnail"
                                        onError={() => handleChange('imagen', '')}
                                        style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 6 }}
                                    />
                                ) : (
                            <div className="record-panel__no-image">Sin imagen</div>
                        )}
                        {/* overlay: si hay preview local, lo colocamos encima de la imagen */}
                        {localPreviewUrl && (
                            <img
                                src={localPreviewUrl}
                                alt="Vista previa"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: 160,
                                    height: 160,
                                    objectFit: 'cover',
                                    borderRadius: 6,
                                    boxShadow: '0 6px 18px rgba(0,0,0,0.18)'
                                }}
                            />
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

                                    {/* File upload UI */}
                                    <div style={{ marginTop: 12 }}>
                                        <label className="record-panel__label">Subir imagen</label>
                                        {/* input file oculto: lo abrimos con el botón */}
                                        <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => onFileSelected(e.target.files ? e.target.files[0] : undefined)} />

                                        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <Button label="Subir imagen" onClick={() => fileInputRef.current && fileInputRef.current.click()} />
                                            {uploadingImage && <div style={{ marginLeft: 8 }}>Subiendo...</div>}
                                            {!(form as any)?.id && <div style={{ marginLeft: 8, color: '#999' }}>Guarda el registro primero para confirmar el nombre del archivo</div>}
                                        </div>
                                    </div>
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

            {/* Rol para usuarios: selector de rol (no mostramos permisos) */}
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
                            </div>
                        ) : (
                            <div>
                                <select value={selectedRole || ''} onChange={(e) => {
                                    const val = e.target.value || null
                                    setSelectedRole(val)
                                    handleChange('_assignedRoles', val ? [val] : [])
                                    // actualizar rolId real para compatibilidad con payloads existentes
                                    handleChange('rolId', val ? (isNaN(Number(val)) ? val : Number(val)) : val)
                                }} disabled={mode === 'editar' && !puedeEditarRol} style={{ width: '100%', padding: 8, borderRadius: 6 }}>
                                    <option value="">-- Selecciona un rol --</option>
                                    {rolesOptions.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
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
