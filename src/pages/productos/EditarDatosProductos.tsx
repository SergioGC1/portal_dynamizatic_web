import React from 'react'
import Button from '../../components/ui/Button'
import '../../components/ui/GestorEditores.css'
import '../../styles/paneles/PanelProducto.scss'
import '../../styles/pages/EditarDatosProductos.scss'

type Modo = 'ver' | 'editar'

type CampoRenderizado = {
    key: string
    label: string
    contenido: React.ReactNode
}

type ImagenProps = {
    mostrar: boolean
    vistaPreviaLocal: string | null
    urlActual?: string
    subiendo: boolean
    nombreArchivo?: string
    tieneId: boolean
    fileInputRef?: React.RefObject<HTMLInputElement | null>
    onSeleccionarArchivo?: (archivo?: File) => void
    onSubirImagen?: () => void
    onEliminarImagen?: () => void
    onImagenError?: () => void
}

type PropsVistaProducto = {
    modo: Modo
    esPanel: boolean
    cargando: boolean
    valorNombre: string
    errores: Record<string, string>
    puedeEditarNombre: boolean
    imagen: ImagenProps
    camposDinamicos: CampoRenderizado[]
    descripcionCampo?: React.ReactNode
    panelFases?: React.ReactNode
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
    onCerrarClick,
}: PropsVistaProducto) {
    const panelClassName = `record-panel${modo === 'ver' ? ' record-panel--readonly' : ''}`

    return (
        <div className={panelClassName}>
            <div className="record-panel__header">
                <strong className="record-panel__title">{modo === 'ver' ? 'Ver producto' : 'Editar producto'}</strong>
                <div className="record-panel__controls">
                    {modo === 'editar' && (
                        <Button
                            label="Guardar"
                            onClick={onGuardarClick}
                            disabled={cargando}
                            className="productos-editar__guardar-btn"
                        />
                    )}
                    {esPanel && <Button label="Cerrar" onClick={onCerrarClick} className="p-button-secondary" />}
                </div>
            </div>

            <div className="record-panel__top">
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

                        {modo === 'editar' && (
                            <div className="productos-editar__upload-section">
                                <input
                                    ref={imagen.fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="productos-editar__file-input"
                                    onChange={(evento) =>
                                        imagen.onSeleccionarArchivo?.(evento.target.files ? evento.target.files[0] : undefined)
                                    }
                                />
                                <div className="productos-editar__upload-row">
                                    <Button
                                        icon="pi pi-upload"
                                        label="Seleccionar"
                                        className="p-button-outlined"
                                        onClick={() => imagen.fileInputRef?.current?.click()}
                                    />
                                    {imagen.nombreArchivo && (
                                        <span
                                            className="productos-editar__file-badge"
                                            title={imagen.nombreArchivo}
                                        >
                                            {imagen.nombreArchivo}
                                        </span>
                                    )}
                                    {!imagen.nombreArchivo && (
                                        <span className="productos-editar__file-placeholder">
                                            Ningún archivo seleccionado
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className={`record-panel__main-title ${imagen.mostrar ? '' : 'record-panel__main-title--full'}`}>
                    <label className="record-panel__label">Nombre</label>
                    {modo === 'ver' ? (
                        <div className="record-panel__value record-panel__value--view">{valorNombre}</div>
                    ) : (
                        <>
                            <input
                                value={valorNombre}
                                onChange={(e) => onNombreChange(e.target.value)}
                                className={`record-panel__input record-panel__product-name-input ${errores.nombre ? 'record-panel__input--error' : ''
                                    }`}
                                disabled={!puedeEditarNombre}
                            />
                            {errores.nombre && <div className="record-panel__error">{errores.nombre}</div>}
                        </>
                    )}
                </div>
            </div>

            <div className="record-panel__grid">
                {camposDinamicos.map((campo) => (
                    <div key={campo.key} className="record-panel__field">
                        <label className="record-panel__label">{campo.label}</label>
                        {campo.contenido}
                    </div>
                ))}
                {descripcionCampo}
            </div>

            {panelFases}
        </div>
    )
}
