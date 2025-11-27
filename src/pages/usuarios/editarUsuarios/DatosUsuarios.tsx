import React from 'react'
import { Button } from 'primereact/button'
import { InputSwitch } from 'primereact/inputswitch'
import { InputText } from 'primereact/inputtext'
import '../../../components/ui/GestorEditores.css'
import '../../../styles/paneles/PanelUsuario.scss'
import '../../../styles/pages/EditarDatosUsuarios.scss'

// Estructura base del formulario de usuario que maneja la vista
interface FormularioUsuario {
    id?: number | string
    nombreUsuario?: string
    apellidos?: string
    email?: string
    activoSn?: string
    imagen?: string
    password?: string
    [clave: string]: any
}

// Opción del selector de roles
interface RolOption {
    label: string
    value: string
}

// Props que recibe la vista de edición / visualización de usuario
type PropsVistaUsuario = {
    modo: 'ver' | 'editar'
    esPanel: boolean
    formulario: FormularioUsuario
    errores: Record<string, string>
    puedeEditarEstado: boolean
    puedeEditarRol: boolean
    mostrarImagen: boolean
    urlImagen: string
    urlVistaPrevia: string | null
    estaActivo: boolean
    estaSubiendoImagen: boolean
    rolSeleccionado: string | null
    opcionesRol: RolOption[]
    mostrarPasswordCrear: boolean
    mostrarPasswordEditar: boolean
    fileInputRef: React.RefObject<HTMLInputElement>
    onCampoChange: (campo: string, valor: any) => void
    onGuardarClick: () => void
    onCerrarClick?: () => void
    onEstadoActivoChange: (valor: boolean) => void
    onRolChange: (rolId: string | null) => void
    onSeleccionarArchivo: (archivo?: File) => void
    onEliminarImagenClick: () => void
    onSubirImagenClick: () => void
    onTogglePasswordCrear: () => void
    onTogglePasswordEditar: () => void
}

// Vista “tonta” de edición/ver usuario: solo se encarga de pintar y disparar callbacks
export default function EditarDatosUsuariosVista({
    modo,
    esPanel,
    formulario,
    errores,
    puedeEditarEstado,
    puedeEditarRol,
    mostrarImagen,
    urlImagen,
    urlVistaPrevia,
    estaActivo,
    estaSubiendoImagen,
    rolSeleccionado,
    opcionesRol,
    mostrarPasswordCrear,
    mostrarPasswordEditar,
    fileInputRef,
    onCampoChange,
    onGuardarClick,
    onCerrarClick,
    onEstadoActivoChange,
    onRolChange,
    onSeleccionarArchivo,
    onEliminarImagenClick,
    onSubirImagenClick,
    onTogglePasswordCrear,
    onTogglePasswordEditar
}: PropsVistaUsuario) {
    const esNuevo = !formulario?.id
    const titulo = modo === 'ver' ? 'Ver usuario' : 'Editar usuario'
    // Si hay imagen o estamos en modo ver, mostramos el bloque de foto / estado
    const debeMostrarBloqueImagen = mostrarImagen || modo === 'ver'

    return (
        <div className="record-panel">
            <div className="record-panel__header">
                <strong className="record-panel__title">{titulo}</strong>
                <div className="record-panel__controls">
                    {modo === 'editar' && (
                        <Button
                            label="Guardar"
                            onClick={onGuardarClick}
                            className="usuarios-editar-datos__guardar-btn"
                        />
                    )}
                    {onCerrarClick && (
                        <Button
                            label="Cerrar"
                            onClick={onCerrarClick}
                            className="p-button-secondary"
                        />
                    )}
                </div>
            </div>

            {errores.general && (
                <div className="record-panel__error usuarios-editar-datos__error-general">
                    {errores.general}
                </div>
            )}

            <div className="record-panel__top usuarios-editar-datos__top">
                {debeMostrarBloqueImagen && (
                    <div className="usuarios-editar-datos__image-wrapper">
                        {/* Badge de estado Activo / Inactivo sobre la imagen */}
                        <div className="usuarios-editar-datos__badge-container">
                            <span
                                className={`badge-estado ${estaActivo ? 'badge-activo' : 'badge-inactivo'
                                    }`}
                            >
                                {estaActivo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>

                        {/* Contenedor de la imagen del usuario */}
                        <div className="record-panel__image-box--static usuarios-editar-datos__image-box">
                            {urlVistaPrevia ? (
                                // Vista previa local (imagen recién seleccionada)
                                <img
                                    src={urlVistaPrevia}
                                    alt="Vista previa"
                                    className="record-panel__thumbnail usuarios-editar-datos__image usuarios-editar-datos__image--contain"
                                />
                            ) : urlImagen ? (
                                // Imagen ya guardada en servidor
                                <img
                                    src={urlImagen}
                                    alt="Imagen del usuario"
                                    className="record-panel__thumbnail usuarios-editar-datos__image usuarios-editar-datos__image--cover"
                                />
                            ) : (
                                // Estado sin imagen
                                <div className="record-panel__no-image usuarios-editar-datos__no-image">
                                    Sin imagen
                                </div>
                            )}

                            {/* Botón de borrar imagen si estamos en modo edición */}
                            {modo === 'editar' && (urlVistaPrevia || urlImagen) && (
                                <div className="record-panel__image-delete">
                                    <Button
                                        icon="pi pi-trash"
                                        className="p-button-sm p-button-rounded p-button-danger"
                                        onClick={onEliminarImagenClick}
                                        title={
                                            urlVistaPrevia
                                                ? 'Quitar imagen seleccionada'
                                                : 'Eliminar imagen actual'
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        {/* El botón de seleccionar archivo se muestra a la derecha, junto al bloque de contraseña */}
                        {modo === 'editar' && <></>}
                    </div>
                )}

                {/* Columna principal con nombre de usuario, password y subida de imagen */}
                <div
                    className={`record-panel__main-title ${debeMostrarBloqueImagen ? '' : 'record-panel__main-title--full'
                        }`}
                >
                    <label className="record-panel__label">Nombre de usuario</label>
                    <input
                        value={formulario?.nombreUsuario ?? ''}
                        onChange={(evento) =>
                            onCampoChange('nombreUsuario', evento.target.value)
                        }
                        className={`record-panel__input ${errores.nombreUsuario ? 'record-panel__input--error' : ''
                            }`}
                        disabled={modo === 'ver'}
                    />
                    {errores.nombreUsuario && (
                        <div className="record-panel__error">
                            {errores.nombreUsuario}
                        </div>
                    )}

                    {modo === 'editar' && (
                        <div className="usuarios-editar-datos__password-section">
                            {/* Bloque de contraseña: cambia si es usuario nuevo o existente */}
                            {esNuevo ? (
                                <div className="record-panel__field">
                                    <label className="record-panel__label">
                                        Contraseña (mínimo 8 caracteres)
                                    </label>
                                    <span className="p-input-icon-right usuarios-editar-datos__input-icon-wrapper">
                                        <i
                                            className={`${mostrarPasswordCrear ? 'pi pi-eye-slash' : 'pi pi-eye'
                                                } usuarios-editar-datos__icon-toggle`}
                                            onClick={onTogglePasswordCrear}
                                        />
                                        <InputText
                                            type={mostrarPasswordCrear ? 'text' : 'password'}
                                            value={(formulario as any)?.password || ''}
                                            onChange={(
                                                evento: React.ChangeEvent<HTMLInputElement>
                                            ) =>
                                                onCampoChange('password', evento.target.value)
                                            }
                                            className={`record-panel__input usuarios-editar-datos__text-input ${errores.password ? 'record-panel__input--error' : ''
                                                }`}
                                            placeholder="Introduce una contraseña segura"
                                        />
                                    </span>
                                    {errores.password && (
                                        <div className="record-panel__error">
                                            {errores.password}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="record-panel__field">
                                    <label className="record-panel__label">
                                        Nueva contraseña (opcional)
                                    </label>
                                    <span className="p-input-icon-right usuarios-editar-datos__input-icon-wrapper">
                                        <i
                                            className={`${mostrarPasswordEditar ? 'pi pi-eye-slash' : 'pi pi-eye'
                                                } usuarios-editar-datos__icon-toggle`}
                                            onClick={onTogglePasswordEditar}
                                        />
                                        <InputText
                                            type={mostrarPasswordEditar ? 'text' : 'password'}
                                            value={(formulario as any)?.password || ''}
                                            onChange={(
                                                evento: React.ChangeEvent<HTMLInputElement>
                                            ) =>
                                                onCampoChange('password', evento.target.value)
                                            }
                                            className={`record-panel__input usuarios-editar-datos__text-input ${errores.password ? 'record-panel__input--error' : ''
                                                }`}
                                            placeholder="Deja vacío para mantener la actual"
                                        />
                                    </span>
                                    {errores.password && (
                                        <div className="record-panel__error">
                                            {errores.password}
                                        </div>
                                    )}
                                    <div className="usuarios-editar-datos__helper-text">
                                        Por seguridad no mostramos la contraseña actual. Solo
                                        escribe algo si deseas cambiarla.
                                    </div>
                                </div>
                            )}

                            {/* Subida de imagen: input de fichero + botón + nombre de archivo seleccionado */}
                            <div className="usuarios-editar-datos__upload-row">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="usuarios-editar-datos__file-input"
                                    onChange={(evento) =>
                                        onSeleccionarArchivo(
                                            evento.target.files
                                                ? evento.target.files[0]
                                                : undefined
                                        )
                                    }
                                />
                                <Button
                                    icon="pi pi-upload"
                                    label="Seleccionar imagen"
                                    className="p-button-outlined"
                                    onClick={() => fileInputRef.current?.click()}
                                />
                                {/* Nombre del archivo seleccionado, con badge y manejo defensivo */}
                                {(() => {
                                    const fichero = (formulario as any)?._imagenFile
                                    if (!fichero) {
                                        return (
                                            <span className="usuarios-editar-datos__file-placeholder">
                                                Ningún archivo seleccionado
                                            </span>
                                        )
                                    }
                                    try {
                                        const nombre =
                                            typeof fichero === 'object' && 'name' in fichero
                                                ? String((fichero as File).name)
                                                : String(fichero)
                                        return (
                                            <span
                                                className="usuarios-editar-datos__file-badge"
                                                title={nombre}
                                            >
                                                {nombre}
                                            </span>
                                        )
                                    } catch (e) {
                                        return (
                                            <span className="usuarios-editar-datos__file-placeholder">
                                                Nombre no disponible
                                            </span>
                                        )
                                    }
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Grid principal de datos personales + estado */}
            <div className="record-panel__grid">
                <div className="record-panel__field">
                    <label className="record-panel__label">Apellidos</label>
                    <input
                        value={formulario?.apellidos ?? ''}
                        onChange={(evento) =>
                            onCampoChange('apellidos', evento.target.value)
                        }
                        className={`record-panel__input ${errores.apellidos ? 'record-panel__input--error' : ''
                            }`}
                        disabled={modo === 'ver'}
                    />
                    {errores.apellidos && (
                        <div className="record-panel__error">{errores.apellidos}</div>
                    )}
                </div>

                <div className="record-panel__field">
                    <label className="record-panel__label">Correo electrónico</label>
                    <input
                        type="email"
                        value={formulario?.email ?? ''}
                        onChange={(evento) => onCampoChange('email', evento.target.value)}
                        className={`record-panel__input ${errores.email ? 'record-panel__input--error' : ''
                            }`}
                        disabled={modo === 'ver'}
                    />
                    {errores.email && (
                        <div className="record-panel__error">{errores.email}</div>
                    )}
                </div>

                <div className="record-panel__field record-panel__field--switch">
                    <label className="record-panel__label">Estado</label>
                    <div className="usuarios-editar-datos__switch-row">
                        <InputSwitch
                            checked={estaActivo}
                            onChange={(evento: any) =>
                                onEstadoActivoChange(!!evento.value)
                            }
                            disabled={modo === 'ver' || !puedeEditarEstado}
                        />
                    </div>
                </div>
            </div>

            {/* Selector de rol */}
            <div className="record-panel__grid">
                <div className="record-panel__field usuarios-editar-datos__field-margin">
                    <label className="record-panel__label">Rol</label>
                    <select
                        value={rolSeleccionado || ''}
                        onChange={(evento) => onRolChange(evento.target.value || null)}
                        disabled={modo === 'ver' || !puedeEditarRol}
                        className={`record-panel__input ${errores.rolId ? 'record-panel__input--error' : ''
                            }`}
                    >
                        <option value="">-- Selecciona un rol --</option>
                        {opcionesRol.map((opcion) => (
                            <option key={opcion.value} value={opcion.value}>
                                {opcion.label}
                            </option>
                        ))}
                    </select>
                    {errores.rolId && (
                        <div className="record-panel__error">{errores.rolId}</div>
                    )}
                </div>
            </div>
        </div>
    )
}
