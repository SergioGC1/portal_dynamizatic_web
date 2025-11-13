import React from 'react'
import Button from '../../components/ui/Button'
import { ConfirmDialog } from 'primereact/confirmdialog'
import '../../components/ui/GestorEditores.css'
import '../../styles/paneles/PanelProducto.scss'

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
                        <Button label="Guardar" onClick={onGuardarClick} disabled={cargando} style={{ marginRight: 8 }} />
                    )}
                    {esPanel && <Button label="Cerrar" onClick={onCerrarClick} className="p-button-secondary" />}
                </div>
            </div>

            <div className="record-panel__top">
                {imagen.mostrar && (
                    <div style={{ position: 'relative', width: 180 }}>
                        <div className="record-panel__image-box--static" style={{ width: 180, height: 180 }}>
                            {imagen.vistaPreviaLocal ? (
                                <img
                                    src={imagen.vistaPreviaLocal}
                                    alt="Vista previa"
                                    className="record-panel__thumbnail"
                                    style={{ objectFit: 'contain' }}
                                />
                            ) : imagen.urlActual ? (
                                <img
                                    src={imagen.urlActual}
                                    alt="Imagen del producto"
                                    className="record-panel__thumbnail"
                                    style={{ objectFit: 'contain' }}
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
                            <div style={{ marginTop: 12 }}>
                                <input
                                    ref={imagen.fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(evento) =>
                                        imagen.onSeleccionarArchivo?.(evento.target.files ? evento.target.files[0] : undefined)
                                    }
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
                                    <Button
                                        icon="pi pi-upload"
                                        label="Seleccionar"
                                        className="p-button-outlined"
                                        onClick={() => imagen.fileInputRef?.current?.click()}
                                        style={{ flex: '0 0 auto', minWidth: 92 }}
                                    />
                                    {imagen.nombreArchivo && (
                                            <span
                                                style={{
                                                    fontSize: '0.85em',
                                                    color: '#495057',
                                                    flex: '0 0 auto',
                                                    backgroundColor: '#f0f0f0',
                                                    padding: '6px 10px',
                                                    borderRadius: 6,
                                                    marginLeft: 6,
                                                    display: 'inline-block',
                                                    whiteSpace: 'normal'
                                                }}
                                                title={imagen.nombreArchivo}
                                            >
                                                {imagen.nombreArchivo}
                                            </span>
                                        )}
                                </div>
                                {!imagen.tieneId && (
                                    <small style={{ color: '#6c757d', display: 'block', marginTop: 6 }}>
                                        Guarda el producto para poder adjuntar la imagen.
                                    </small>
                                )}
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

            <ConfirmDialog />
        </div>
    )
}
