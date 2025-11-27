import React from 'react'
import Button from '../../../components/ui/Button'
import '../../../components/ui/GestorEditores.css'
import '../../../styles/paneles/PanelProducto.scss'
import '../../../styles/pages/EditarDatosProductos.scss'

// Modo de uso del formulario: solo lectura o edición
type Modo = 'ver' | 'editar'

// Descripción genérica de un campo que se pinta dinámicamente en la rejilla
type CampoRenderizado = {
    key: string
    label: string
    contenido: React.ReactNode
}

// Props relacionadas con la imagen del producto
type ImagenProps = {
    // Si se muestra o no el bloque de imagen
    mostrar: boolean
    // URL local de vista previa (URL.createObjectURL)
    vistaPreviaLocal: string | null
    // URL actual desde el backend (si existe)
    urlActual?: string
    // Indicador de subida en curso
    subiendo: boolean
    // Nombre del archivo seleccionado (si hay)
    nombreArchivo?: string
    // Indica si el producto ya tiene ID (ya existe en BD)
    tieneId: boolean
    // Ref al input file
    fileInputRef?: React.RefObject<HTMLInputElement | null>
    // Callbacks de interacción con la imagen
    onSeleccionarArchivo?: (archivo?: File) => void
    onSubirImagen?: () => void
    onEliminarImagen?: () => void
    onImagenError?: () => void
}

// Props de la vista de edición de producto (solo presentación, sin lógica de negocio)
type PropsVistaProducto = {
    modo: Modo
    esPanel: boolean
    cargando: boolean

    // Nombre del producto y validación asociada
    valorNombre: string
    errores: Record<string, string>
    puedeEditarNombre: boolean

    // Bloque de imagen (datos + callbacks)
    imagen: ImagenProps

    // Otros campos que se pintan de forma dinámica en la rejilla
    camposDinamicos: CampoRenderizado[]

    // Campo de descripción (o similar) que puede ser un bloque más complejo
    descripcionCampo?: React.ReactNode

    // Panel de fases / tareas asociado al producto
    panelFases?: React.ReactNode

    // Callbacks de eventos
    onNombreChange: (valor: string) => void
    onGuardarClick: () => void
    onCerrarClick?: () => void
}

export default function EditarDatosProductosVista({
    modo,
    esPanel,
    cargando,
    valorNombre,
    errores,
    puedeEditarNombre,
    imagen,
    camposDinamicos,
    descripcionCampo,
    panelFases,
    onNombreChange,
    onGuardarClick,
    onCerrarClick
}: PropsVistaProducto) {
    // Clase base del panel + estado readonly si está en modo "ver"
    const panelClassName = `record-panel${modo === 'ver' ? ' record-panel--readonly' : ''}`

    return (
        <div className={panelClassName}>
            {/* Cabecera: título + botones de acción */}
            <div className="record-panel__header">
                <strong className="record-panel__title">
                    {modo === 'ver' ? 'Ver producto' : 'Editar producto'}
                </strong>

                <div className="record-panel__controls">
                    {modo === 'editar' && (
                        <Button
                            label="Guardar"
                            onClick={onGuardarClick}
                            disabled={cargando}
                            className="productos-editar__guardar-btn"
                        />
                    )}

                    {esPanel && (
                        <Button
                            label="Cerrar"
                            onClick={onCerrarClick}
                            className="p-button-secondary"
                        />
                    )}
                </div>
            </div>

            {/* Parte superior: imagen + nombre */}
            <div className="record-panel__top">
                {/* Bloque de imagen del producto */}
                {imagen.mostrar && (
                    <div className="productos-editar__image-wrapper">
                        <div className="record-panel__image-box--static productos-editar__image-box">
                            {imagen.vistaPreviaLocal ? (
                                <img
                                    src={imagen.vistaPreviaLocal}
                                    alt="Vista previa"
                                    className="record-panel__thumbnail productos-editar__image productos-editar__image--contain"
                                />
                            ) : imagen.urlActual ? (
                                <img
                                    src={imagen.urlActual}
                                    alt="Imagen del producto"
                                    className="record-panel__thumbnail productos-editar__image productos-editar__image--contain"
                                    onError={imagen.onImagenError}
                                />
                            ) : (
                                <div className="record-panel__no-image">Sin imagen</div>
                            )}

                            {/* Botón para eliminar la imagen actual (solo en edición) */}
                            {modo === 'editar' && imagen.urlActual && !imagen.vistaPreviaLocal && (
                                <div className="record-panel__image-delete">
                                    <Button
                                        icon="pi pi-trash"
                                        className="p-button-sm p-button-rounded p-button-danger"
                                        onClick={imagen.onEliminarImagen}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Sección para seleccionar archivo de imagen (solo en edición) */}
                        {modo === 'editar' && (
                            <div className="productos-editar__upload-section">
                                <input
                                    ref={imagen.fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="productos-editar__file-input"
                                    onChange={(evento) =>
                                        imagen.onSeleccionarArchivo?.(
                                            evento.target.files ? evento.target.files[0] : undefined
                                        )
                                    }
                                />

                                <div className="productos-editar__upload-row">
                                    <Button
                                        icon="pi pi-upload"
                                        label="Seleccionar"
                                        className="p-button-outlined"
                                        onClick={() => imagen.fileInputRef?.current?.click()}
                                    />

                                    {imagen.nombreArchivo ? (
                                        <span
                                            className="productos-editar__file-badge"
                                            title={imagen.nombreArchivo}
                                        >
                                            {imagen.nombreArchivo}
                                        </span>
                                    ) : (
                                        <span className="productos-editar__file-placeholder">
                                            Ningún archivo seleccionado
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Bloque de nombre del producto */}
                <div
                    className={`record-panel__main-title ${imagen.mostrar ? '' : 'record-panel__main-title--full'
                        }`}
                >
                    <label className="record-panel__label">Nombre</label>

                    {modo === 'ver' ? (
                        // Modo solo lectura: se muestra el valor como texto
                        <div className="record-panel__value record-panel__value--view">
                            {valorNombre}
                        </div>
                    ) : (
                        // Modo edición: input editable + errores
                        <>
                            <input
                                value={valorNombre}
                                onChange={(evento) => onNombreChange(evento.target.value)}
                                className={`record-panel__input record-panel__product-name-input ${errores.nombre ? 'record-panel__input--error' : ''
                                    }`}
                                disabled={!puedeEditarNombre}
                            />
                            {errores.nombre && (
                                <div className="record-panel__error">{errores.nombre}</div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Rejilla de campos dinámicos + descripción */}
            <div className="record-panel__grid">
                {camposDinamicos.map((campo) => (
                    <div key={campo.key} className="record-panel__field">
                        <label className="record-panel__label">{campo.label}</label>
                        {campo.contenido}
                    </div>
                ))}

                {/* Bloque opcional adicional (p.ej. descripción larga) */}
                {descripcionCampo}
            </div>

            {/* Panel de fases/tareas del producto (si se ha pasado desde el contenedor) */}
            {panelFases}
        </div>
    )
}
