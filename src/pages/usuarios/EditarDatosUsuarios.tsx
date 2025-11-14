import React from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import '../../components/ui/GestorEditores.css';
import '../../styles/paneles/PanelUsuario.scss';

interface FormularioUsuario {
    id?: number | string;
    nombreUsuario?: string;
    apellidos?: string;
    email?: string;
    activoSn?: string;
    imagen?: string;
    password?: string;
    [clave: string]: any;
}

interface RolOption {
    label: string;
    value: string;
}

type PropsVistaUsuario = {
    modo: 'ver' | 'editar';
    esPanel: boolean;
    formulario: FormularioUsuario;
    errores: Record<string, string>;
    puedeEditarEstado: boolean;
    puedeEditarRol: boolean;
    mostrarImagen: boolean;
    urlImagen: string;
    urlVistaPrevia: string | null;
    estaActivo: boolean;
    estaSubiendoImagen: boolean;
    rolSeleccionado: string | null;
    opcionesRol: RolOption[];
    mostrarPasswordCrear: boolean;
    mostrarPasswordEditar: boolean;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onCampoChange: (campo: string, valor: any) => void;
    onGuardarClick: () => void;
    onCerrarClick?: () => void;
    onEstadoActivoChange: (valor: boolean) => void;
    onRolChange: (rolId: string | null) => void;
    onSeleccionarArchivo: (archivo?: File) => void;
    onEliminarImagenClick: () => void;
    onSubirImagenClick: () => void;
    onTogglePasswordCrear: () => void;
    onTogglePasswordEditar: () => void;
};

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
    onTogglePasswordEditar,
}: PropsVistaUsuario) {
    const esNuevo = !formulario?.id;
    const titulo = modo === 'ver' ? 'Ver usuario' : 'Editar usuario';
    const debeMostrarBloqueImagen = mostrarImagen || modo === 'ver';

    return (
        <div className="record-panel">
            <div className="record-panel__header">
                <strong className="record-panel__title">{titulo}</strong>
                <div className="record-panel__controls">
                    {modo === 'editar' && <Button label="Guardar" onClick={onGuardarClick} style={{ marginRight: 8 }} />}
                    {onCerrarClick && <Button label="Cerrar" onClick={onCerrarClick} className="p-button-secondary" />}
                </div>
            </div>

            {errores.general && (
                <div className="record-panel__error" style={{ marginBottom: 16 }}>
                    {errores.general}
                </div>
            )}

            <div className="record-panel__top" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {debeMostrarBloqueImagen && (
                    <div style={{ position: 'relative', width: 180 }}>
                        <div style={{ position: 'absolute', top: -20, left: 0 }}>
                            <span className={`badge-estado ${estaActivo ? 'badge-activo' : 'badge-inactivo'}`}>
                                {estaActivo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <div className="record-panel__image-box--static" style={{ width: 180, height: 180 }}>
                            {urlVistaPrevia ? (
                                <img
                                    src={urlVistaPrevia}
                                    alt="Vista previa"
                                    className="record-panel__thumbnail"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }}
                                />
                            ) : urlImagen ? (
                                <img
                                    src={urlImagen}
                                    alt="Imagen del usuario"
                                    className="record-panel__thumbnail"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }}
                                />
                            ) : (
                                <div
                                    className="record-panel__no-image"
                                    style={{
                                        backgroundColor: '#f2f2f2',
                                        color: '#6c757d',
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 6,
                                        textTransform: 'uppercase',
                                        fontWeight: 600,
                                    }}
                                >
                                    Sin imagen
                                </div>
                            )}
                            {modo === 'editar' && (urlVistaPrevia || urlImagen) && (
                                <div className="record-panel__image-delete">
                                    <Button
                                        icon="pi pi-trash"
                                        className="p-button-sm p-button-rounded p-button-danger"
                                        onClick={onEliminarImagenClick}
                                        title={urlVistaPrevia ? 'Quitar imagen seleccionada' : 'Eliminar imagen actual'}
                                    />
                                </div>
                            )}
                        </div>

                        {modo === 'editar' && (
                            // El botón de seleccionar archivo se muestra en la parte derecha (debajo de la contraseña)
                            // para mantener la imagen limpia a la izquierda.
                            <></>
                        )}
                    </div>
                )}

                <div className={`record-panel__main-title ${debeMostrarBloqueImagen ? '' : 'record-panel__main-title--full'}`}>
                    <label className="record-panel__label">Nombre de usuario</label>
                    <input
                        value={formulario?.nombreUsuario ?? ''}
                        onChange={(evento) => onCampoChange('nombreUsuario', evento.target.value)}
                        className={`record-panel__input ${errores.nombreUsuario ? 'record-panel__input--error' : ''}`}
                        disabled={modo === 'ver'}
                    />
                    {errores.nombreUsuario && <div className="record-panel__error">{errores.nombreUsuario}</div>}

                    {modo === 'editar' && (
                        <div style={{ marginTop: 12 }}>
                            {esNuevo ? (
                                <div className="record-panel__field">
                                    <label className="record-panel__label">Contraseña (mínimo 8 caracteres)</label>
                                    <span className="p-input-icon-right" style={{ width: '100%', display: 'block' }}>
                                        <i
                                            className={mostrarPasswordCrear ? 'pi pi-eye-slash' : 'pi pi-eye'}
                                            onClick={onTogglePasswordCrear}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <InputText
                                            type={mostrarPasswordCrear ? 'text' : 'password'}
                                            value={(formulario as any)?.password || ''}
                                            onChange={(evento: React.ChangeEvent<HTMLInputElement>) => onCampoChange('password', evento.target.value)}
                                            className="record-panel__input"
                                            style={{ width: '100%' }}
                                            placeholder="Introduce una contraseña segura"
                                        />
                                    </span>
                                    {errores.password && <div className="record-panel__error">{errores.password}</div>}
                                </div>
                            ) : (
                                <div className="record-panel__field">
                                    <label className="record-panel__label">Nueva contraseña (opcional)</label>
                                    <span className="p-input-icon-right" style={{ width: '100%', display: 'block' }}>
                                        <i
                                            className={mostrarPasswordEditar ? 'pi pi-eye-slash' : 'pi pi-eye'}
                                            onClick={onTogglePasswordEditar}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <InputText
                                            type={mostrarPasswordEditar ? 'text' : 'password'}
                                            value={(formulario as any)?.password || ''}
                                            onChange={(evento: React.ChangeEvent<HTMLInputElement>) => onCampoChange('password', evento.target.value)}
                                            className="record-panel__input"
                                            style={{ width: '100%' }}
                                            placeholder="Déjalo vacío para mantener la actual"
                                        />
                                    </span>
                                    {errores.password && <div className="record-panel__error">{errores.password}</div>}
                                    <div style={{ fontSize: '0.85em', color: '#6c757d', marginTop: 4 }}>
                                        Por seguridad no mostramos la contraseña actual. Solo escribe algo si deseas cambiarla.
                                    </div>
                                </div>
                            )}

                            {/* Botón de seleccionar imagen + nombre de archivo: colocado debajo de la contraseña según petición */}
                            <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'nowrap' }}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(evento) => onSeleccionarArchivo(evento.target.files ? evento.target.files[0] : undefined)}
                                />
                                <Button
                                    icon="pi pi-upload"
                                    label="Seleccionar imagen"
                                    className="p-button-outlined"
                                    onClick={() => fileInputRef.current?.click()}
                                />
                                {/* Mostrar nombre de archivo de forma segura (con fondo gris y comportamiento responsive) */}
                                {(() => {
                                    const fichero = (formulario as any)?._imagenFile
                                    if (!fichero) return <span style={{ color: '#999' }}>Ningún archivo seleccionado</span>
                                    try {
                                        const nombre = typeof fichero === 'object' && 'name' in fichero ? String((fichero as File).name) : String(fichero)
                                        return (
                                            <span
                                                style={{
                                                    fontSize: '0.9em',
                                                    color: '#495057',
                                                    flex: '0 0 auto',
                                                    backgroundColor: '#f0f0f0',
                                                    padding: '6px 10px',
                                                    borderRadius: 6,
                                                    display: 'inline-block',
                                                    whiteSpace: 'normal',
                                                    overflowWrap: 'anywhere',
                                                    marginLeft: 6
                                                }}
                                                title={nombre}
                                            >
                                                {nombre}
                                            </span>
                                        )
                                    } catch (e) {
                                        return <span style={{ color: '#999' }}>Nombre no disponible</span>
                                    }
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="record-panel__grid">
                <div className="record-panel__field">
                    <label className="record-panel__label">Apellidos</label>
                    <input
                        value={formulario?.apellidos ?? ''}
                        onChange={(evento) => onCampoChange('apellidos', evento.target.value)}
                        className={`record-panel__input ${errores.apellidos ? 'record-panel__input--error' : ''}`}
                        disabled={modo === 'ver'}
                    />
                    {errores.apellidos && <div className="record-panel__error">{errores.apellidos}</div>}
                </div>

                <div className="record-panel__field">
                    <label className="record-panel__label">Correo electrónico</label>
                    <input
                        type="email"
                        value={formulario?.email ?? ''}
                        onChange={(evento) => onCampoChange('email', evento.target.value)}
                        className={`record-panel__input ${errores.email ? 'record-panel__input--error' : ''}`}
                        disabled={modo === 'ver'}
                    />
                    {errores.email && <div className="record-panel__error">{errores.email}</div>}
                </div>

                <div className="record-panel__field record-panel__field--switch">
                    <label className="record-panel__label">Estado</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <InputSwitch
                            checked={estaActivo}
                            onChange={(evento: any) => onEstadoActivoChange(!!evento.value)}
                            disabled={modo === 'ver' || !puedeEditarEstado}
                        />
                    </div>
                </div>
            </div>

            <div className="record-panel__grid">
                <div className="record-panel__field" style={{ marginTop: 8 }}>
                    <label className="record-panel__label">Rol</label>
                    <select
                        value={rolSeleccionado || ''}
                        onChange={(evento) => onRolChange(evento.target.value || null)}
                        disabled={modo === 'ver' || !puedeEditarRol}
                        className={`record-panel__input ${errores.rolId ? 'record-panel__input--error' : ''}`}
                    >
                        <option value="">-- Selecciona un rol --</option>
                        {opcionesRol.map((opcion) => (
                            <option key={opcion.value} value={opcion.value}>
                                {opcion.label}
                            </option>
                        ))}
                    </select>
                    {errores.rolId && <div className="record-panel__error">{errores.rolId}</div>}
                </div>
            </div>
        </div>
    );
}
