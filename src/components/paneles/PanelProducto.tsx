import React, { useEffect, useRef, useState } from 'react'
import { InputSwitch } from 'primereact/inputswitch'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { ColumnDef } from '../../components/data-table/DataTable'
import Button from '../ui/Button'
import ProductPhasesPanel from '../../components/product/ProductPhasesPanel'
import usePermisos from '../../hooks/usePermisos'
import '../ui/GestorPaneles.css'
import './PanelProducto.scss'
import productosAPI from '../../api-endpoints/productos/index'


/* === Tipos === */
interface Producto {
    id?: number | string
    nombre?: string
    descripcion?: string
    precio?: number
    categoria?: string
    stock?: number
    activo?: string // 'S' | 'N'
    codigoBarras?: string
    peso?: number
    dimensiones?: string
    imagen?: string
    [k: string]: any
}

type Modo = 'ver' | 'editar'

interface PropiedadesPanelProducto {
    mode: Modo
    record: Producto | null
    columns?: ColumnDef<any>[]
    onClose: () => void
    onSave?: (producto: Producto) => Promise<void>
    onUploadSuccess?: (idProducto: number) => void
    entityType?: string // opcional, compatibilidad
}

/* === Componente === */
export default function PanelProducto({
    mode,
    record = null,
    columns = [],
    onClose,
    onSave,
    onUploadSuccess,
    entityType = 'producto'
}: PropiedadesPanelProducto) {
    // Formulario local
    const [formulario, setFormulario] = useState<Producto | Record<string, any>>({})
    const [errores, setErrores] = useState<Record<string, string>>({})

    // Imagen: estados y refs para objectURL
    const [subiendoImagen, setSubiendoImagen] = useState(false)
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const currentObjectUrlRef = useRef<string | null>(null)

    // Permisos
    const { hasPermission: tienePermiso } = usePermisos()
    const pantalla = entityType === 'usuario' ? 'Usuarios' : entityType === 'rol' ? 'Roles' : `${entityType?.charAt(0).toUpperCase()}${entityType?.slice(1)}s`

    useEffect(() => {
        setFormulario((record as any) || {})
    }, [record])

    // Helper para actualizar campo
    const actualizarCampoDelFormulario = (clave: string, valor: any) =>
        setFormulario((formularioActual: any) => ({ ...formularioActual, [clave]: valor }))

    // Construcción de URL de imagen según API base
    const baseDeApi = (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) || 'http://127.0.0.1:3000'
    const construirUrlDeImagen = (rutaImagen?: string) => {
        if (!rutaImagen) return ''
        const ruta = String(rutaImagen)
        if (ruta.startsWith('http://') || ruta.startsWith('https://')) return ruta
        if (ruta.startsWith('/')) return `${baseDeApi}${ruta}`
        return `${baseDeApi}/${ruta}`
    }

    // Preview que mostramos (priorizar backend _imagenUrl)
    const urlVistaPrevia = (formulario as any)?._imagenUrl || ((formulario as any)?.imagen ? construirUrlDeImagen((formulario as any).imagen) : '')
    const vistaPreviaLocal = localPreviewUrl

    // Detectar si la tabla incluye columna 'imagen'
    const tieneColumnaImagen = (columns || []).some((c) => String(c.key).toLowerCase() === 'imagen')

    // Heurística para producto (mantener compatibilidad)
    const esRegistroDeProducto = Boolean(
        (entityType === 'producto') ||
        ((formulario && (formulario as any).estadoId !== undefined) &&
            ((columns || []).some(c => String(c.key).toLowerCase() === 'tamao') ||
                (columns || []).some(c => String(c.key).toLowerCase() === 'anyo') ||
                (formulario && (formulario as any).anyo !== undefined)))
    )

    // Permisos de edición de 'Activo' (control granular)
    const puedeEditarActivo = () => {
        if (!tienePermiso) return false
        return (
            tienePermiso(pantalla, 'ActivoSN') ||
            tienePermiso(pantalla, 'ActivoSn') ||
            tienePermiso(pantalla, 'Activo')
        )
    }

    // Columnas a mostrar en grid (excluir imagen, título y acciones)
    const claveTitulo = (() => {
        if (!columns || columns.length === 0) return 'nombre'
        for (const definicionColumna of columns) {
            const claveColumnaNormalizada = String(definicionColumna.key).toLowerCase()
            if (
                claveColumnaNormalizada.includes('nombre') ||
                claveColumnaNormalizada.includes('name') ||
                claveColumnaNormalizada.includes('titulo') ||
                claveColumnaNormalizada.includes('title')
            ) {
                return definicionColumna.key
            }
        }
        return columns[0].key || 'nombre'
    })()

    const columnasDeLaCuadricula = (columns || []).filter((definicionColumna) => {
        const claveNormalizada = String(definicionColumna.key).toLowerCase()
        if (claveNormalizada.includes('accion') || claveNormalizada.includes('acciones')) return false
        if (String(definicionColumna.key).toLowerCase() === 'imagen') return false
        if (definicionColumna.key === claveTitulo) return false
        return true
    })

    /* === Manejo de selección de fichero === */
    const alSeleccionarArchivo = (archivo?: File) => {
        if (!archivo) return
        try {
            if (currentObjectUrlRef.current) {
                URL.revokeObjectURL(currentObjectUrlRef.current)
                currentObjectUrlRef.current = null
            }
        } catch (err) {
            // ignore
        }
        const urlObjetoLocal = URL.createObjectURL(archivo)
        currentObjectUrlRef.current = urlObjetoLocal
        setLocalPreviewUrl(urlObjetoLocal)
        actualizarCampoDelFormulario('_imagenFile', archivo)
    }

    useEffect(() => {
        return () => {
            try {
                if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current)
            } catch (e) {
                // ignore
            }
        }
    }, [])

    /* === Subida de imagen al backend (delegada a ProductosAPI) === */
    const subirImagenDelProducto = async (archivoArg?: File, productoIdArg?: number | string) => {
        const archivo: File | undefined = archivoArg || (formulario as any)?._imagenFile
        let productoId = productoIdArg || (formulario as any)?.id
        if (!archivo) return alert('Selecciona un archivo antes de subir')
        if (!productoId) return alert('Guarda el producto primero para subir la imagen')

        try {
            setSubiendoImagen(true)

            const nombreOriginal = archivo.name || 'img'
            const coincidenciaExtension = nombreOriginal.match(/(\.[0-9a-zA-Z]+)$/)
            const extension = coincidenciaExtension ? coincidenciaExtension[1] : '.jpg'
            const nombreDeArchivoDeseado = `${productoId}${extension}`

            let data = null
            try {
                // intentar método consolidado
                if (productosAPI && typeof (productosAPI as any).uploadProductoImagen === 'function') {
                    data = await (productosAPI as any).uploadProductoImagen(productoId, archivo, nombreDeArchivoDeseado)
                } else {
                    // fallback muy básico: intentar endpoint genérico (puede fallar si no existe)
                    throw new Error('Método uploadProductoImagen no disponible en ProductosAPI')
                }
            } catch (errorSubida) {
                // relanzamos para manejar abajo
                throw errorSubida
            }

            if (data && data.path) {
                actualizarCampoDelFormulario('imagen', data.path)
                if (data.url) actualizarCampoDelFormulario('_imagenUrl', data.url)

                // limpiar fichero temporal del form
                setFormulario((s: any) => {
                    const copy = { ...s }
                    delete copy._imagenFile
                    return copy
                })

                try {
                    if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current)
                } catch (e) {
                    // ignore
                }
                currentObjectUrlRef.current = null
                setLocalPreviewUrl(null)

                // Notificar al padre
                try {
                    if (onUploadSuccess) {
                        const maybeId = Number(productoId)
                        if (!Number.isNaN(maybeId)) onUploadSuccess(maybeId)
                    }
                } catch (er) {
                    // ignore
                }
            } else {
                throw new Error('Respuesta del servidor sin path/url')
            }
        } catch (error: any) {
            console.error('Error subiendo imagen de producto', error)
            alert('Error subiendo la imagen: ' + (error?.message || error))
        } finally {
            setSubiendoImagen(false)
        }
    }

    /* === Eliminación de imagen (confirmación y llamada API) === */
    const eliminarImagenDelProductoConConfirmacion = () => {
        confirmDialog({
            message: '¿Estás seguro de que quieres eliminar esta imagen? Esta acción no se puede deshacer.',
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    if ((formulario as any)?.id && (formulario as any).imagen) {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        if (productosAPI && typeof productosAPI.updateProductoById === 'function') {
                            await productosAPI.updateProductoById((formulario as any).id, { imagen: null })
                        }
                    }
                    actualizarCampoDelFormulario('imagen', '')
                    console.log('Imagen eliminada correctamente')
                } catch (error) {
                    console.error('Error al eliminar la imagen:', error)
                    alert('Error al eliminar la imagen. Inténtalo de nuevo.')
                }
            },
            reject: () => { /* cancel */ },
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptClassName: 'p-button-danger',
            rejectClassName: 'p-button-secondary'
        })
    }

    /* === Subida automática tras guardar === */
    const intentarSubirImagenDespuesDeGuardar = async (archivo?: File) => {
        const archivoPendiente: File | undefined = archivo || (formulario as any)?._imagenFile
        if (!archivoPendiente) return

        let productoId = (formulario as any)?.id
        const maxRetries = 10
        let intentoActual = 0
        while ((!productoId || Number.isNaN(Number(productoId))) && intentoActual < maxRetries) {
            // esperar 100ms
            // eslint-disable-next-line no-await-in-loop
            await new Promise((res) => setTimeout(res, 100))
            productoId = (formulario as any)?.id
            intentoActual += 1
        }

        if (!productoId) {
            alert('Producto guardado pero no se ha podido subir la imagen automáticamente porque el registro no tiene id. Abre el registro y sube la imagen.')
            return
        }

        try {
            await subirImagenDelProducto(archivoPendiente, productoId)
        } catch (errorSubidaAutomatica) {
            // La función de subida ya muestra errores, no repetimos alerta
        }
    }

    /* === Guardar/validaciones === */
    const guardarProductoConValidaciones = async () => {
        setErrores({})
        // Validaciones básicas (extiéndelas según necesites)
        const nombre = String((formulario as any).nombre || '').trim()
        if (!nombre) {
            setErrores({ nombre: 'El nombre del producto es obligatorio' })
            return
        }

        const archivoPendiente: File | undefined = (formulario as any)?._imagenFile

        // construir payload limpio
        const payload: any = { ...(formulario as any) }
        delete payload._imagenFile
        delete payload._imagenPreview
        delete payload._imagenUrl
        if (payload._cb !== undefined) delete payload._cb

        if (onSave) {
            await onSave(payload as Producto)
        }

        // intentar subir imagen pendiente
        try {
            await intentarSubirImagenDespuesDeGuardar(archivoPendiente)
        } catch (e) {
            // ya gestionado
        }
    }

    /* === Render === */
    if (!record) return null

    const valorTitulo = (formulario as any)?.[claveTitulo]

    const debeMostrarImagen = Boolean((formulario as any)?.imagen || (mode === 'editar' && tieneColumnaImagen))

    return (
        <div className="record-panel">
            <div className="record-panel__header">
                <strong className="record-panel__title">{mode === 'ver' ? 'Ver producto' : 'Editar producto'}</strong>
                <div className="record-panel__controls">
                    {mode === 'editar' && (
                        <Button label="Guardar" onClick={guardarProductoConValidaciones} style={{ marginRight: 8 }} />
                    )}
                    <Button label="Cerrar" onClick={onClose} className="p-button-secondary" />
                </div>
            </div>

            {/* Top: imagen + título */}
            <div className="record-panel__top">
                {debeMostrarImagen && (
                    <div className="record-panel__image-box--static" style={{ position: 'relative', width: 160, height: 160 }}>
                        {urlVistaPrevia ? (
                            <img
                                src={urlVistaPrevia}
                                alt="imagen"
                                className="record-panel__thumbnail"
                                onError={() => actualizarCampoDelFormulario('imagen', '')}
                                style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 6 }}
                            />
                        ) : (
                            <div className="record-panel__no-image">Sin imagen</div>
                        )}

                        {/* overlay preview local */}
                        {vistaPreviaLocal && (
                            <>
                                <img
                                    src={vistaPreviaLocal}
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
                                {mode === 'editar' && (
                                    <div className="record-panel__image-delete">
                                        <Button
                                            label=""
                                            icon="pi pi-times"
                                            onClick={() => {
                                                setFormulario((s: any) => {
                                                    const copia = { ...s }
                                                    delete copia._imagenFile
                                                    return copia
                                                })
                                                try {
                                                    if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current)
                                                } catch (e) {
                                                    // ignore
                                                }
                                                currentObjectUrlRef.current = null
                                                setLocalPreviewUrl(null)
                                            }}
                                            className="p-button-sm p-button-rounded p-button-secondary"
                                            tooltip="Descartar imagen nueva"
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* botón borrar imagen existente */}
                        {mode === 'editar' && urlVistaPrevia && !vistaPreviaLocal && (
                            <div className="record-panel__image-delete">
                                <Button label="" icon="pi pi-trash" onClick={eliminarImagenDelProductoConConfirmacion} className="p-button-sm p-button-rounded p-button-danger" />
                            </div>
                        )}
                    </div>
                )}

                <div className={`record-panel__main-title ${debeMostrarImagen ? '' : 'record-panel__main-title--full'}`}>
                    {mode === 'editar' ? (
                        <>
                            <label className="record-panel__label">Nombre</label>
                            <input
                                value={valorTitulo ?? ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => actualizarCampoDelFormulario(claveTitulo || 'nombre', e.target.value)}
                                className="record-panel__input record-panel__product-name-input"
                            />
                            {errores.nombre && <div style={{ color: 'red', marginTop: 6 }}>{errores.nombre}</div>}

                            {/* Upload UI */}
                            {debeMostrarImagen && mode === 'editar' && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ marginTop: 12 }}>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            style={{ display: 'none' }}
                                            accept="image/*"
                                            onChange={(e) => alSeleccionarArchivo(e.target.files ? e.target.files[0] : undefined)}
                                        />
                                        <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <Button icon="pi pi-upload" label="Seleccionar imagen" onClick={() => fileInputRef.current && fileInputRef.current.click()} className="p-button-outlined" />
                                            {(formulario as any)?._imagenFile && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '6px 12px',
                                                    backgroundColor: '#f0f0f0',
                                                    borderRadius: '4px',
                                                    fontSize: '0.9em'
                                                }}>
                                                    <i className="pi pi-file" style={{ color: '#6c757d' }}></i>
                                                    <span style={{ color: '#495057' }}>{((formulario as any)._imagenFile as File).name}</span>
                                                </div>
                                            )}
                                            {subiendoImagen && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <i className="pi pi-spin pi-spinner" style={{ color: '#007bff' }}></i>
                                                    <span style={{ color: '#007bff' }}>Subiendo imagen...</span>
                                                </div>
                                            )}
                                            {!formulario?.id && (
                                                <div style={{ color: '#6c757d', fontSize: '0.85em', fontStyle: 'italic' }}>
                                                    Guarda el producto primero para confirmar el archivo
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="record-panel__label">Nombre</div>
                            <div className="record-panel__value record-panel__value--view">{String(valorTitulo ?? '')}</div>
                        </>
                    )}
                </div>
            </div>

            {/* Grid dinámico */}
            <div className="record-panel__grid">
                {columnasDeLaCuadricula.map((col) => {
                    const key = col.key
                    const label = (col as any).title || (col as any).label || key
                    const value = (formulario as any)?.[key]
                    const isActivo = key.toLowerCase().includes('activo') || key.toLowerCase().includes('activoSn') || key.toLowerCase() === 'activo'

                    return (
                        <div key={key} className="record-panel__field">
                            <label className="record-panel__label">{label}</label>
                            {mode === 'ver' ? (
                                isActivo ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <InputSwitch checked={String(value ?? '').toUpperCase() === 'S'} disabled />
                                        <span style={{ fontSize: 14 }}>{String(value ?? '').toUpperCase() === 'S' ? 'Activo' : 'Inactivo'}</span>
                                    </div>
                                ) : (
                                    <div className="record-panel__value record-panel__Value--view">{String(value ?? '')}</div>
                                )
                            ) : (
                                isActivo ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <InputSwitch
                                            checked={String(value ?? '').toUpperCase() === 'S'}
                                            onChange={(e: any) => actualizarCampoDelFormulario(key, e.value ? 'S' : 'N')}
                                            disabled={!puedeEditarActivo()}
                                        />
                                        <span style={{ fontSize: 14 }}>{String(value ?? '').toUpperCase() === 'S' ? 'Activo' : 'Inactivo'}</span>
                                    </div>
                                ) : (
                                    <input value={value ?? ''} onChange={(e) => actualizarCampoDelFormulario(key, (e.target as HTMLInputElement).value)} className="record-panel__input" />
                                )
                            )}
                        </div>
                    )
                })}

                {/* Campos específicos del producto (fallback si no están en columns) */}
                {/* Descripción */}
                {!columnasDeLaCuadricula.some((col) => col.key === 'descripcion') && (
                    <div className="record-panel__field">
                        <label className="record-panel__label">Descripción</label>
                        <input value={formulario?.descripcion ?? ''} onChange={(e) => actualizarCampoDelFormulario('descripcion', e.target.value)} className="record-panel__input" disabled={mode === 'ver'} />
                    </div>
                )}

            </div>

            {/* Panel de fases (si es producto y tiene id) */}
            {esRegistroDeProducto && (formulario as any)?.id && (
                <ProductPhasesPanel productId={(formulario as any).id} />
            )}

            <ConfirmDialog />
        </div>
    )
}
