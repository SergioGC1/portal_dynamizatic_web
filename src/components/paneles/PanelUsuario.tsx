import React, { useState, useEffect, useRef } from 'react'
import { InputSwitch } from 'primereact/inputswitch'
import { InputText } from 'primereact/inputtext'
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog'
import { ColumnDef } from '../../components/data-table/DataTable'
import { Button } from 'primereact/button'
import usePermisos from '../../hooks/usePermisos'
import '../ui/GestorPaneles.css'
import './PanelUsuario.scss'
import UsuariosAPI from '../../api-endpoints/usuarios/index'

export interface Usuario {
    id?: number
    nombreUsuario: string
    email: string
    apellidos?: string
    rolId?: number
    activoSn?: string
    imagen?: string
    password?: string
}

export interface PropiedadesPanelUsuario {
    mode: 'ver' | 'editar'
    record?: Usuario | null
    columns?: ColumnDef<any>[]
    onClose: () => void
    // onSave debe devolver el usuario persistido (especialmente en creación) para obtener el id
    onSave?: (usuarioActualizado: Usuario) => Promise<any>
    onUploadSuccess?: (idUsuario: number) => void
}


export default function PanelUsuario({
    mode,
    record = null,
    columns = [],
    onClose,
    onSave,
    onUploadSuccess
}: PropiedadesPanelUsuario) {

    // Estados del formulario con nombres descriptivos
    const [formularioDelUsuario, establecerFormularioDelUsuario] = useState<Usuario | Record<string, any>>({})
    const [erroresDeValidacion, establecerErroresDeValidacion] = useState<Record<string, string>>({})

    // Estados para manejo de roles
    const [opcionesDeRoles, establecerOpcionesDeRoles] = useState<Array<any>>([])
    const [rolSeleccionado, establecerRolSeleccionado] = useState<string | null>(null)
    // Ya no se otorga permiso implícito por rol (p.ej., 'supervisor');
    // se respetan únicamente los permisos declarados.

    // Estados para manejo de imágenes
    const [estaSubiendoImagen, establecerEstaSubiendoImagen] = useState(false)
    const [urlDeVistaPrevia, establecerUrlDeVistaPrevia] = useState<string | null>(null)
    const referenciaDelInputArchivo = useRef<HTMLInputElement | null>(null)
    const referenciaUrlObjetoActual = useRef<string | null>(null)
    const [mostrarPasswordCrear, establecerMostrarPasswordCrear] = useState(false)
    const [mostrarPasswordEditar, establecerMostrarPasswordEditar] = useState(false)

    // Hook de permisos
    const { hasPermission: tienePermiso } = usePermisos()

    // Inicializar formulario cuando cambie el registro
    useEffect(() => {
        establecerFormularioDelUsuario((record as any) || {})
    }, [record])

    // Actualiza un campo específico del formulario
    const actualizarCampoDelFormulario = (claveCampo: string, valorDelCampo: any) => {
        establecerFormularioDelUsuario((formularioActual: any) => ({
            ...formularioActual,
            [claveCampo]: valorDelCampo
        }))
        // Limpiar error específico al modificar el campo
        establecerErroresDeValidacion((prev) => {
            if (!prev || !prev[claveCampo]) return prev
            const { [claveCampo]: _omit, ...rest } = prev
            return rest
        })
    }

    // Validar y guardar el usuario
    const guardarUsuarioConValidaciones = async () => {
        establecerErroresDeValidacion({})

        // Validaciones de campos obligatorios (crear y editar)
        const errores: Record<string, string> = {}

        const nombre = String((formularioDelUsuario as any)?.nombreUsuario || '').trim()
        if (!nombre) errores.nombreUsuario = 'El nombre es obligatorio'

        const correo = String((formularioDelUsuario as any)?.email || '').trim()
        if (!correo) errores.email = 'El correo electrónico es obligatorio'

        const apes = String((formularioDelUsuario as any)?.apellidos || '').trim()
        if (!apes) errores.apellidos = 'Los apellidos son obligatorios'

        // Nota: rol y estado activo NO son obligatorios según el requerimiento actual

        const esUsuarioNuevo = !formularioDelUsuario?.id
        if (esUsuarioNuevo) {
            const contrasenaIngresada = String((formularioDelUsuario as any)?.password || '')
            if (!contrasenaIngresada || contrasenaIngresada.length < 8) {
                errores.password = 'La contraseña debe tener al menos 8 caracteres'
            }
        } else {
            // En edición: si se proporciona nueva contraseña, validar mínimo 8
            const contrasenaIngresada = String((formularioDelUsuario as any)?.password || '')
            if (contrasenaIngresada && contrasenaIngresada.length < 8) {
                errores.password = 'La nueva contraseña debe tener al menos 8 caracteres'
            }
        }

        if (Object.keys(errores).length > 0) {
            establecerErroresDeValidacion(errores)
            return
        }

        // Capturar archivo de imagen pendiente antes de limpiar el formulario
        const archivoImagenPendiente: File | undefined = (formularioDelUsuario as any)._imagenFile

        // Limpiar datos temporales antes de enviar al servidor
        const datosLimpiosParaGuardar: any = { ...formularioDelUsuario }
        delete datosLimpiosParaGuardar._imagenFile
        delete datosLimpiosParaGuardar._imagenPreview
        delete datosLimpiosParaGuardar._imagenUrl
        if (datosLimpiosParaGuardar._cb !== undefined) delete datosLimpiosParaGuardar._cb
        // En edición, el backend no acepta 'password' en PATCH; nunca lo enviamos
        if (!esUsuarioNuevo) {
            if ((datosLimpiosParaGuardar as any)?.password !== undefined) {
                delete (datosLimpiosParaGuardar as any).password
            }
        }

        // Intentar guardar y capturar errores de unicidad (email/nombre de usuario ya en uso)
        let resultadoGuardado: any = null
        try {
            if (onSave) resultadoGuardado = await onSave(datosLimpiosParaGuardar as Usuario)
        } catch (e: any) {
            const errores: Record<string, string> = {}
            const msg: string = e?.message || ''
            // Intentar extraer JSON de error (si viene embebido en message)
            let mensajeBackend: string | null = null
            let detalles: any = null
            const i = msg.indexOf('{')
            if (i >= 0) {
                try {
                    const jsonStr = msg.slice(i)
                    const parsed = JSON.parse(jsonStr)
                    mensajeBackend = parsed?.error?.message || null
                    detalles = parsed?.error?.details || null
                } catch { }
            }
            const base = (mensajeBackend || msg).toLowerCase()
            // Heurísticas para mapear a campos conocidos
            if (/correo|email/.test(base)) {
                errores.email = 'Este correo ya está en uso'
            }
            if (/usuario|nombre\s*de\s*usuario/.test(base)) {
                errores.nombreUsuario = 'Este nombre de usuario ya está en uso'
            }
            // Caso específico: PATCH rechaza 'password' como propiedad adicional
            if (/additionalproperties/.test(base) && /password/.test(base)) {
                errores.password = 'No se puede cambiar la contraseña desde este formulario.'
            }
            // También mirar estructura details para detectar propiedad adicional 'password'
            if (!errores.password && Array.isArray(detalles)) {
                const encontrado = detalles.find((d: any) =>
                    (d?.code === 'additionalProperties' || /additionalproperties/i.test(String(d?.code))) &&
                    (d?.info?.additionalProperty === 'password')
                )
                if (encontrado) {
                    errores.password = 'No se puede cambiar la contraseña desde este formulario.'
                }
            }
            // Fallback genérico (caso más común: email)
            if (Object.keys(errores).length === 0) {
                errores.email = mensajeBackend || 'Revisa los datos enviados'
            }
            establecerErroresDeValidacion(errores)
            return
        }

        try {
            // Si hay archivo pendiente e id disponible (del resultado del guardado o del formulario), subir imagen
            const idNuevo = (resultadoGuardado && (resultadoGuardado.id || resultadoGuardado?.data?.id)) || formularioDelUsuario?.id
            if (archivoImagenPendiente && idNuevo) {
                await subirImagenDelUsuario(archivoImagenPendiente, idNuevo)
            } else {
                // Mantener compatibilidad: intentamos el flujo existente por si el id llega con retraso
                await intentarSubirImagenDespuesDeGuardar(archivoImagenPendiente)
            }
        } catch (error) {
            console.error('Error en subida automática de imagen:', error)
        }
    }

    // Sube imagen automáticamente después de guardar exitosamente
    const intentarSubirImagenDespuesDeGuardar = async (archivoDeImagen?: File) => {
        const archivoImagenPendiente: File | undefined = archivoDeImagen || (formularioDelUsuario as any)?._imagenFile
        if (!archivoImagenPendiente) return

        let idDelUsuario = formularioDelUsuario?.id
        const maximosReintentos = 10
        let contadorDeReintentos = 0

        // Esperar a que el ID se actualice después del guardado
        while ((!idDelUsuario || Number.isNaN(Number(idDelUsuario))) && contadorDeReintentos < maximosReintentos) {
            await new Promise((resolver) => setTimeout(resolver, 100))
            idDelUsuario = formularioDelUsuario?.id
            contadorDeReintentos += 1
        }

        if (!idDelUsuario) {
            alert('Usuario guardado exitosamente, pero no se pudo subir la imagen automáticamente. Abre el usuario y sube la imagen manualmente.')
            return
        }

        try {
            await subirImagenDelUsuario(archivoImagenPendiente, idDelUsuario)
        } catch (error) {
            console.error('Error en subida automática:', error)
        }
    }

    // Eliminar imagen con confirmación
    const eliminarImagenConConfirmacion = () => {
        confirmDialog({
            message: '¿Estás seguro de que deseas eliminar esta imagen? Esta acción no se puede deshacer.',
            header: 'Confirmar eliminación de imagen',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    if (formularioDelUsuario?.id && formularioDelUsuario.imagen) {
                        const UsuariosAPI = require('../../api-endpoints/usuarios/index')
                        await UsuariosAPI.updateUsuarioById(formularioDelUsuario.id, { imagen: null })
                    }

                    actualizarCampoDelFormulario('imagen', '')
                    console.log('Imagen eliminada exitosamente')
                } catch (error) {
                    console.error('Error al eliminar imagen:', error)
                    alert('Error al eliminar la imagen. Inténtalo nuevamente.')
                }
            },
            acceptLabel: 'Sí, eliminar imagen',
            rejectLabel: 'Cancelar',
            acceptClassName: 'p-button-danger',
            rejectClassName: 'p-button-secondary'
        })
    }

    // Cargar opciones de roles
    useEffect(() => {
        const cargarOpcionesDeRoles = async () => {
            try {
                const RolesAPI = require('../../api-endpoints/roles/index')
                const todosLosRoles = await RolesAPI.findRoles()
                const opcionesFormateadas = (todosLosRoles || []).map((rol: any) => ({
                    label: rol.nombre || rol.name || String(rol.id),
                    value: String(rol.id)
                }))
                establecerOpcionesDeRoles(opcionesFormateadas)

                // Preseleccionar rol existente
                const rolIdDelFormulario = formularioDelUsuario?.rolId
                const rolDelFormulario = (formularioDelUsuario as any)?.rol
                const rolIdActual = String(rolIdDelFormulario || rolDelFormulario || '') || null
                if (rolIdActual) {
                    establecerRolSeleccionado(rolIdActual)
                    actualizarCampoDelFormulario('_assignedRoles', [rolIdActual])
                } else {
                    establecerRolSeleccionado(null)
                }

                // No otorgar permisos implícitos por nombre de rol.
                // La edición de rol se regirá solo por permisos explícitos.
            } catch (error) {
                console.error('Error cargando opciones de roles:', error)
            }
        }
        cargarOpcionesDeRoles()
    }, [formularioDelUsuario?.rolId, formularioDelUsuario?.id, formularioDelUsuario])

    // Gestión de imágenes
    const valorDeLaImagen = formularioDelUsuario?.imagen
    const urlBaseDeAPI = (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) || 'http://127.0.0.1:3000'

    const construirUrlDeImagen = (rutaDeImagen?: string) => {
        if (!rutaDeImagen) return ''
        const rutaComoTexto = String(rutaDeImagen)
        if (rutaComoTexto.startsWith('http://') || rutaComoTexto.startsWith('https://')) return rutaComoTexto
        if (rutaComoTexto.startsWith('/')) return `${urlBaseDeAPI}${rutaComoTexto}`
        return `${urlBaseDeAPI}/${rutaComoTexto}`
    }

    const urlDeVistaPreviaFinal = (formularioDelUsuario as any)?._imagenUrl ||
        (valorDeLaImagen ? construirUrlDeImagen(valorDeLaImagen) : '')
    const tieneColumnaDeImagen = (columns || []).some((columna) =>
        String(columna.key).toLowerCase() === 'imagen')
    const deberíaMostrarImagen = Boolean(valorDeLaImagen || (mode === 'editar' && tieneColumnaDeImagen))

    // Manejo de selección de archivos
    const manejarSeleccionDeArchivo = (archivo?: File) => {
        if (!archivo) return

        try {
            if (referenciaUrlObjetoActual.current) {
                URL.revokeObjectURL(referenciaUrlObjetoActual.current)
                referenciaUrlObjetoActual.current = null
            }
        } catch (error) {
            console.error('Error limpiando URL anterior:', error)
        }

        const nuevaUrl = URL.createObjectURL(archivo)
        referenciaUrlObjetoActual.current = nuevaUrl
        establecerUrlDeVistaPrevia(nuevaUrl)
        actualizarCampoDelFormulario('_imagenFile', archivo)
    }

    // Limpiar URLs de objetos al desmontar
    useEffect(() => {
        return () => {
            try {
                if (referenciaUrlObjetoActual.current) {
                    URL.revokeObjectURL(referenciaUrlObjetoActual.current)
                }
            } catch (error) {
                console.error('Error limpiando URL al desmontar:', error)
            }
        }
    }, [])

    // Subir imagen del usuario
    const subirImagenDelUsuario = async (archivo?: File, idUsuarioEspecifico?: number | string) => {
        const archivoASubir: File | undefined = archivo || (formularioDelUsuario as any)?._imagenFile
        let idDelUsuario = idUsuarioEspecifico || formularioDelUsuario?.id

        if (!archivoASubir) {
            alert('Selecciona un archivo antes de subir')
            return
        }
        if (!idDelUsuario) {
            alert('Guarda el usuario primero para poder subir la imagen')
            return
        }

        try {
            establecerEstaSubiendoImagen(true)

            const nombreOriginal = archivoASubir.name || 'imagen'
            const coincidenciaExtension = nombreOriginal.match(/(\.[0-9a-zA-Z]+)$/)
            const extension = coincidenciaExtension ? coincidenciaExtension[1] : '.jpg'
            const nombreDeseadoDelArchivo = `${idDelUsuario}${extension}`

            const datosDelFormulario = new FormData()
            datosDelFormulario.append('file', archivoASubir)
            datosDelFormulario.append('filename', nombreDeseadoDelArchivo)

            const respuestaDelServidor = await UsuariosAPI.uploadUsuarioImagen(
                idDelUsuario,
                archivoASubir,
                nombreDeseadoDelArchivo
            )

            if (respuestaDelServidor && respuestaDelServidor.path) {
                actualizarCampoDelFormulario('imagen', respuestaDelServidor.path)
                if (respuestaDelServidor.url) {
                    actualizarCampoDelFormulario('_imagenUrl', respuestaDelServidor.url)
                }

                // Limpiar archivo temporal
                establecerFormularioDelUsuario((formularioActual: any) => {
                    const formularioLimpio = { ...formularioActual }
                    delete formularioLimpio._imagenFile
                    return formularioLimpio
                })

                // Limpiar vista previa
                try {
                    if (referenciaUrlObjetoActual.current) {
                        URL.revokeObjectURL(referenciaUrlObjetoActual.current)
                    }
                } catch (error) {
                    console.error('Error limpiando URL:', error)
                }
                referenciaUrlObjetoActual.current = null
                establecerUrlDeVistaPrevia(null)

                // Notificar éxito
                try {
                    if (onUploadSuccess) {
                        const idComoNumero = Number(idDelUsuario)
                        if (!Number.isNaN(idComoNumero)) {
                            onUploadSuccess(idComoNumero)
                        }
                    }
                } catch (error) {
                    console.error('Error en callback de éxito:', error)
                }
            } else {
                throw new Error('Respuesta del servidor sin ruta de imagen válida')
            }
        } catch (error: any) {
            console.error('Error subiendo imagen del usuario:', error)
            alert('Error subiendo la imagen: ' + (error?.message || error))
        } finally {
            establecerEstaSubiendoImagen(false)
        }
    }

    // Verificar permisos específicos
    const puedeEditarEstadoActivo = () => {
        if (!tienePermiso) return false
        return (
            tienePermiso('Usuarios', 'ActivoSN') ||
            tienePermiso('Usuarios', 'ActivoSn') ||
            tienePermiso('Usuarios', 'Activo')
        )
    }

    const puedeEditarRol = () => {
        if (!tienePermiso) return false
        return (
            tienePermiso('Usuarios', 'Rol') ||
            tienePermiso('Usuarios', 'EditarRol') ||
            tienePermiso('Usuarios', 'Editar Rol')
        )
    }

    // No renderizar si no hay registro
    if (!record) return null

    return (
        <div className="record-panel">
            <div className="record-panel__header">
                <strong className="record-panel__title">
                    {mode === 'ver' ? 'Ver usuario' : 'Editar usuario'}
                </strong>
                <div className="record-panel__controls">
                    {mode === 'editar' && (
                        <Button
                            label="Guardar"
                            onClick={guardarUsuarioConValidaciones}
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

            {/* Sección superior: imagen + datos principales */}
            <div className="record-panel__top">
                {deberíaMostrarImagen && (
                    <div className="record-panel__image-box--static" style={{ position: 'relative', width: 160, height: 160 }}>
                        {urlDeVistaPreviaFinal ? (
                            <img
                                src={urlDeVistaPreviaFinal}
                                alt="imagen del usuario"
                                className="record-panel__thumbnail"
                                onError={() => actualizarCampoDelFormulario('imagen', '')}
                                style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 6 }}
                            />
                        ) : (
                            <div className="record-panel__no-image">Sin imagen</div>
                        )}

                        {/* Botón eliminar imagen existente */}
                        {mode === 'editar' && urlDeVistaPreviaFinal && !urlDeVistaPrevia && (
                            <div className="record-panel__image-delete">
                                <Button
                                    label=""
                                    icon="pi pi-trash"
                                    onClick={eliminarImagenConConfirmacion}
                                    className="p-button-sm p-button-rounded p-button-danger"
                                />
                            </div>
                        )}
                    </div>
                )}

                <div className={`record-panel__main-title ${deberíaMostrarImagen ? '' : 'record-panel__main-title--full'}`}>
                    {/* Campo nombre de usuario */}
                    <label className="record-panel__label">Nombre de Usuario</label>
                    <input
                        value={formularioDelUsuario?.nombreUsuario ?? ''}
                        onChange={(evento: React.ChangeEvent<HTMLInputElement>) =>
                            actualizarCampoDelFormulario('nombreUsuario', evento.target.value)
                        }
                        className={`record-panel__input record-panel__product-name-input ${erroresDeValidacion.nombreUsuario ? 'record-panel__input--error' : ''}`}
                        disabled={mode === 'ver'}
                    />
                    {erroresDeValidacion.nombreUsuario && (
                        <div className="record-panel__error">{erroresDeValidacion.nombreUsuario}</div>
                    )}



                    {/* Campo contraseña - creación: con icono ojo */}
                    {mode === 'editar' && !formularioDelUsuario?.id && (
                        <div style={{ marginTop: 8 }}>
                            <label className="record-panel__label">
                                Contraseña (mínimo 8 caracteres)
                            </label>
                            <span className="p-input-icon-right" style={{ width: '100%' }}>
                                <i
                                    className={mostrarPasswordCrear ? 'pi pi-eye-slash' : 'pi pi-eye'}
                                    onClick={() => establecerMostrarPasswordCrear(v => !v)}
                                    style={{ cursor: 'pointer' }}
                                    title={mostrarPasswordCrear ? 'Ocultar contraseña' : 'Ver contraseña'}
                                />
                                <InputText
                                    type={mostrarPasswordCrear ? 'text' : 'password'}
                                    value={formularioDelUsuario.password || ''}
                                    onChange={(evento: React.ChangeEvent<HTMLInputElement>) =>
                                        actualizarCampoDelFormulario('password', evento.target.value)
                                    }
                                    className="record-panel__input"
                                    style={{ width: '100%' }}
                                />
                            </span>
                            {erroresDeValidacion.password && (
                                <div style={{ color: 'red', marginTop: 6 }}>
                                    {erroresDeValidacion.password}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Campo cambiar contraseña - edición existente: opcional */}
                    {mode === 'editar' && !!formularioDelUsuario?.id && (
                        <div style={{ marginTop: 8 }}>
                            <label className="record-panel__label">
                                Nueva contraseña (opcional, mínimo 8 caracteres)
                            </label>
                            <span className="p-input-icon-right" style={{ width: '100%' }}>
                                <i
                                    className={mostrarPasswordEditar ? 'pi pi-eye-slash' : 'pi pi-eye'}
                                    onClick={() => establecerMostrarPasswordEditar(v => !v)}
                                    style={{ cursor: 'pointer' }}
                                    title={mostrarPasswordEditar ? 'Ocultar contraseña' : 'Ver contraseña'}
                                />
                                <InputText
                                    type={mostrarPasswordEditar ? 'text' : 'password'}
                                    value={(formularioDelUsuario as any)?.password || ''}
                                    onChange={(evento: React.ChangeEvent<HTMLInputElement>) =>
                                        actualizarCampoDelFormulario('password', evento.target.value)
                                    }
                                    className="record-panel__input"
                                    style={{ width: '100%' }}
                                    placeholder="Déjalo vacío para mantener la actual"
                                />
                            </span>
                            {erroresDeValidacion.password && (
                                <div style={{ color: 'red', marginTop: 6 }}>
                                    {erroresDeValidacion.password}
                                </div>
                            )}
                            <div style={{ color: '#6c757d', fontSize: '0.85em', marginTop: 4 }}>
                                Por seguridad no mostramos la contraseña actual. Si decides cambiarla, usa al menos 8 caracteres.
                            </div>
                        </div>
                    )}

                    {/* Subida de imagen - mover debajo del/los inputs de contraseña */}
                    {mode === 'editar' && deberíaMostrarImagen && (
                        <div style={{ marginTop: 12 }}>
                            <input
                                ref={referenciaDelInputArchivo}
                                type="file"
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={(evento) =>
                                    manejarSeleccionDeArchivo(evento.target.files ? evento.target.files[0] : undefined)
                                }
                            />

                            <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                                <Button
                                    icon="pi pi-upload"
                                    label="Seleccionar imagen"
                                    onClick={() => referenciaDelInputArchivo.current?.click()}
                                    className="p-button-outlined"
                                />

                                {/* Mostrar archivo seleccionado */}
                                {(formularioDelUsuario as any)?._imagenFile && (
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
                                        <span style={{ color: '#495057' }}>
                                            {((formularioDelUsuario as any)._imagenFile as File).name}
                                        </span>
                                    </div>
                                )}

                                {/* Indicador de subida */}
                                {estaSubiendoImagen && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="pi pi-spin pi-spinner" style={{ color: '#007bff' }}></i>
                                        <span style={{ color: '#007bff' }}>Subiendo imagen...</span>
                                    </div>
                                )}

                                {/* Mensaje informativo */}
                                {!formularioDelUsuario?.id && (
                                    <div style={{
                                        color: '#6c757d',
                                        fontSize: '0.85em',
                                        fontStyle: 'italic'
                                    }}>
                                        Guarda el usuario primero para confirmar el archivo
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Campos específicos de usuarios */}
            <div className="record-panel__grid">

                {/* Campo Apellidos */}
                <div className="record-panel__field">
                    <label className="record-panel__label">Apellidos</label>
                    <input
                        value={formularioDelUsuario?.apellidos ?? ''}
                        onChange={(evento) =>
                            actualizarCampoDelFormulario('apellidos', evento.target.value)
                        }
                        className={`record-panel__input ${erroresDeValidacion.apellidos ? 'record-panel__input--error' : ''}`}
                        disabled={mode === 'ver'}
                    />
                    {erroresDeValidacion.apellidos && (
                        <div className="record-panel__error">{erroresDeValidacion.apellidos}</div>
                    )}
                </div>

                {/* Campo Email */}
                <div className="record-panel__field">
                    <label className="record-panel__label">Correo Electrónico</label>
                    <input
                        type="email"
                        value={formularioDelUsuario?.email ?? ''}
                        onChange={(evento) =>
                            actualizarCampoDelFormulario('email', evento.target.value)
                        }
                        className={`record-panel__input ${erroresDeValidacion.email ? 'record-panel__input--error' : ''}`}
                        disabled={mode === 'ver'}
                    />
                    {erroresDeValidacion.email && (
                        <div className="record-panel__error">{erroresDeValidacion.email}</div>
                    )}
                </div>

                {/* Estado Activo */}
                <div className="record-panel__field record-panel__field--switch">
                    <div className="record-panel__field-content">
                        <label className="record-panel__label record-panel__label--switch">
                            Estado del Usuario
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <InputSwitch
                                checked={String(formularioDelUsuario?.activoSn ?? '').toUpperCase() === 'S'}
                                onChange={(evento: any) =>
                                    actualizarCampoDelFormulario('activoSn', evento.value ? 'S' : 'N')
                                }
                                disabled={mode === 'ver' || !puedeEditarEstadoActivo()}
                            />
                            <span style={{ fontSize: 14 }}>
                                {String(formularioDelUsuario?.activoSn ?? '').toUpperCase() === 'S'
                                    ? 'Usuario Activo'
                                    : 'Usuario Inactivo'
                                }
                            </span>
                            {erroresDeValidacion.activoSn && (
                                <div className="record-panel__error">{erroresDeValidacion.activoSn}</div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Selector de Rol */}
            <div className="record-panel__grid">
                <div className="record-panel__field">
                    <label className="record-panel__label">Rol del Usuario</label>
                    <select
                        value={rolSeleccionado || ''}
                        onChange={(evento) => {
                            const valorSeleccionado = evento.target.value || null
                            establecerRolSeleccionado(valorSeleccionado)
                            actualizarCampoDelFormulario('_assignedRoles', valorSeleccionado ? [valorSeleccionado] : [])
                            actualizarCampoDelFormulario('rolId', valorSeleccionado ?
                                (isNaN(Number(valorSeleccionado)) ? valorSeleccionado : Number(valorSeleccionado)) :
                                valorSeleccionado
                            )
                        }}
                        disabled={mode === 'ver' || !puedeEditarRol()}
                        className={`record-panel__input ${erroresDeValidacion.rolId ? 'record-panel__input--error' : ''}`}
                        style={{ width: '100%', padding: 8, borderRadius: 6 }}
                    >
                        <option value="">-- Selecciona un rol --</option>
                        {opcionesDeRoles.map((opcion) => (
                            <option key={opcion.value} value={opcion.value}>
                                {opcion.label}
                            </option>
                        ))}
                    </select>
                    {erroresDeValidacion.rolId && (
                        <div className="record-panel__error">{erroresDeValidacion.rolId}</div>
                    )}
                </div>
            </div>

            {/* Diálogo de confirmación */}
            <ConfirmDialog />
        </div>
    )
}