import React, { useEffect, useRef, useState } from 'react'
import { ColumnDef } from '../../../components/data-table/DataTable' // (actualmente no se usa, pero lo dejo por si el panel lo necesita)
import { confirmDialog } from 'primereact/confirmdialog'
import EditarDatosUsuariosVista from './DatosUsuarios'
import usePermisos from '../../../hooks/usePermisos'
import UsuariosAPI from '../../../api-endpoints/usuarios/index'
import RolesAPI from '../../../api-endpoints/roles/index'


//Recibe distintas formas de respuesta del backend y devuelve siempre un array plano de roles.
const normalizarRoles = (respuesta: any) =>
  Array.isArray(respuesta?.data)
    ? respuesta.data
    : Array.isArray(respuesta)
      ? respuesta
      : []


//Representa un usuario en el formulario.
interface Usuario {
  id?: number | string
  nombreUsuario?: string
  email?: string
  apellidos?: string
  rolId?: number | string
  activoSn?: string
  imagen?: string
  password?: string
  [clave: string]: any
}

//Props cuando el componente se usa como panel embebido (drawer / modal).

interface PropiedadesPanelUsuario {
  mode?: 'ver' | 'editar'
  record?: Usuario | null
  columns?: ColumnDef<any>[] // no se usa directamente aquí, pero se deja por compatibilidad
  onClose?: () => void
  onSave?: (usuarioActualizado: Usuario) => Promise<any>
  onUploadSuccess?: (idUsuario: number) => void
}

//Props cuando el componente se usa como página completa (ej: /usuarios/:id).
type PropsPagina = { userId?: string }

// Union de ambas formas de uso: como página o como panel.
type PropsEditarUsuario = PropsPagina | PropiedadesPanelUsuario

//Opción de un select de roles.
interface OpcionRol {
  label: string
  value: string
}


/**
 * Componente Editar
 * - Se puede usar como:
 *   * Página de edición de usuario (recibiendo userId).
 *   * Panel/drawer de edición (recibiendo props de panel).
 * - Gestiona:
 *   * Carga de usuario (si viene de página).
 *   * Carga de roles disponibles.
 *   * Formulario de datos básicos (nombre, email, apellidos, rol, activo, etc.).
 *   * Gestión de imagen de perfil (previsualización, subida, eliminación).
 *   * Validación básica de formulario y envío a la API.
 */
export default function Editar(props: PropsEditarUsuario) {

  // esPanel = true si se reciben props típicas de panel (mode, record, onClose, onSave)
  const esPanel =
    'mode' in props || 'record' in props || 'onClose' in props || 'onSave' in props

  // Props específicas de panel (si aplica)
  const propsPanel = esPanel ? (props as PropiedadesPanelUsuario) : null

  // Id de usuario cuando se usa como página
  const userIdDesdePagina = !esPanel ? (props as PropsPagina).userId : undefined

  // Modo de trabajo: 'ver' o 'editar'
  const modo = esPanel ? propsPanel?.mode ?? 'ver' : 'editar'

  // Registro inicial cuando viene desde el panel
  const registroPanel = propsPanel?.record ?? null

  // Callbacks que puede inyectar el panel
  const onClose = propsPanel?.onClose
  const onSave = propsPanel?.onSave
  const onUploadSuccess = propsPanel?.onUploadSuccess


  /*
   * - Contiene todos los campos que se editan (nombreUsuario, email, apellidos, rolId, etc.).
   * - También puede contener campos "internos" como _imagenFile, _imagenUrl, etc.
   */
  const [formulario, setFormulario] = useState<Usuario | Record<string, any>>({})

  /*
   * - Mapa campo -> mensaje de error.
   * - Se usa para mostrar validaciones en la UI.
   */
  const [errores, setErrores] = useState<Record<string, string>>({})

  /*
   * - Lista de roles disponibles para el select.
   */
  const [opcionesRoles, setOpcionesRoles] = useState<OpcionRol[]>([])

  /**
   * rolSeleccionado
   * - Valor seleccionado en el dropdown (string id del rol).
   * - Se mantiene sincronizado con formulario.rolId.
   */
  const [rolSeleccionado, setRolSeleccionado] = useState<string | null>(null)

  /*
   * estaSubiendoImagen
   * - Indica si está en curso una subida de imagen al servidor.
   */
  const [estaSubiendoImagen, setEstaSubiendoImagen] = useState(false)

  /*
   * urlVistaPrevia
   * - URL local (ObjectURL) para previsualizar la imagen seleccionada antes de subir.
   */
  const [urlVistaPrevia, setUrlVistaPrevia] = useState<string | null>(null)

  /*
   * mostrarPasswordCrear / mostrarPasswordEditar
   * - Controlan si se muestran los campos de contraseña (modo creación / edición).
   */
  const [mostrarPasswordCrear, setMostrarPasswordCrear] = useState(false)
  const [mostrarPasswordEditar, setMostrarPasswordEditar] = useState(false)

  /*
   * Referencia al input type="file" para poder disparar el selector de archivos desde la UI.
   */
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  /*
   * objectUrlRef
   * - Guarda la URL local (ObjectURL) de la imagen de vista previa para poder liberarla (revokeObjectURL).
   */
  const objectUrlRef = useRef<string | null>(null)

  // Hook de permisos
  const { hasPermission } = usePermisos()

  // --------------------------------------------------
  // Efecto: cargar usuario (modo página o panel)
  // --------------------------------------------------

  useEffect(() => {
    let componenteActivo = true

    const cargarUsuario = async () => {
      // Caso 1: usado como panel (record viene desde fuera)
      if (esPanel) {
        if (registroPanel) {
          setFormulario((registroPanel as any) || {})
        } else {
          setFormulario({})
        }
        setUrlVistaPrevia(null)
        return
      }

      // Caso 2: usado como página pero sin userId -> formulario vacío
      if (!userIdDesdePagina) {
        setFormulario({})
        setUrlVistaPrevia(null)
        return
      }

      // Caso 3: usado como página con userId -> cargar desde API
      try {
        const usuarioRemoto = await UsuariosAPI.getUsuarioById(userIdDesdePagina)
        if (componenteActivo) {
          setFormulario((usuarioRemoto as any) || {})
          setUrlVistaPrevia(null)
        }
      } catch (error) {
        console.error('Error cargando usuario por id', error)
      }
    }

    cargarUsuario()

    return () => {
      componenteActivo = false
    }
  }, [esPanel, registroPanel, userIdDesdePagina])

  // --------------------------------------------------
  // Efecto: cargar roles disponibles desde API
  // --------------------------------------------------

  useEffect(() => {
    let montado = true

    const cargarRoles = async () => {
      try {
        const respuestaRoles = await RolesAPI.findRoles({ fetchAll: true })
        if (!montado) return

        const listaRolesNormalizada = normalizarRoles(respuestaRoles)
        const opciones = (listaRolesNormalizada || []).map((rol: any) => ({
          label: rol.nombre || rol.name || String(rol.id),
          value: String(rol.id)
        }))
        setOpcionesRoles(opciones)
      } catch (error) {
        console.error('Error cargando opciones de roles:', error)
      }
    }

    cargarRoles()

    return () => {
      montado = false
    }
  }, [])

  // --------------------------------------------------
  // Efecto: sincronizar rolSeleccionado con formulario.rolId / formulario.rol
  // --------------------------------------------------

  useEffect(() => {
    const rolId = (formulario as any)?.rolId ?? (formulario as any)?.rol
    if (rolId === undefined || rolId === null || rolId === '') {
      setRolSeleccionado(null)
    } else {
      setRolSeleccionado(String(rolId))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(formulario as any)?.rolId, (formulario as any)?.rol])

  // --------------------------------------------------
  // Efecto: limpieza de ObjectURL de imagen al desmontar
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      try {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      } catch {
        // ignorar errores al liberar el ObjectURL
      }
    }
  }, [])

  // --------------------------------------------------
  // Helpers de actualización de formulario
  // --------------------------------------------------

  const actualizarCampoDelFormulario = (campo: string, valor: any) => {
    setFormulario((estadoActual: any) => ({ ...estadoActual, [campo]: valor }))

    setErrores((erroresPrevios) => {
      if (!erroresPrevios || !erroresPrevios[campo]) return erroresPrevios
      const erroresActualizados = { ...erroresPrevios }
      delete erroresActualizados[campo]
      return erroresActualizados
    })
  }

  const manejarRolChange = (rolId: string | null) => {
    setRolSeleccionado(rolId)

    // Campo auxiliar para backends que esperan _assignedRoles
    actualizarCampoDelFormulario('_assignedRoles', rolId ? [rolId] : [])

    if (rolId === null) {
      actualizarCampoDelFormulario('rolId', null)
      return
    }

    const rolIdNumerico = Number(rolId)
    actualizarCampoDelFormulario('rolId', Number.isNaN(rolIdNumerico) ? rolId : rolIdNumerico)
  }

  const manejarSeleccionDeArchivo = (archivo?: File) => {
    if (!archivo) return

    try {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    } catch (error) {
      console.error('Error limpiando URL anterior:', error)
    }

    const nuevaUrlVistaPrevia = URL.createObjectURL(archivo)
    objectUrlRef.current = nuevaUrlVistaPrevia
    setUrlVistaPrevia(nuevaUrlVistaPrevia)

    actualizarCampoDelFormulario('_imagenFile', archivo)
  }

  const eliminarImagenEnServidor = async () => {
    try {
      if ((formulario as any)?.id) {
        await UsuariosAPI.updateUsuarioById((formulario as any).id, { imagen: null })
      }
      actualizarCampoDelFormulario('imagen', '')
    } catch (error) {
      console.error('Error eliminando imagen:', error)
      alert('Error al eliminar la imagen. Inténtalo nuevamente.')
    }
  }

  const manejarEliminarImagen = () => {
    // Caso 1: hay una imagen seleccionada sin subir (solo vista previa local)
    if (urlVistaPrevia) {
      try {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      } catch (error) {
        console.error('Error limpiando URL de vista previa:', error)
      }

      objectUrlRef.current = null
      setUrlVistaPrevia(null)

      setFormulario((estadoAnterior: any) => {
        const copiaFormulario = { ...estadoAnterior }
        delete copiaFormulario._imagenFile
        return copiaFormulario
      })
      return
    }

    // Caso 2: imagen ya subida en servidor -> confirmar eliminación
    confirmDialog({
      message:
        '¿Estás seguro de que deseas eliminar esta imagen? Esta acción no se puede deshacer.',
      header: 'Confirmar eliminación de imagen',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      rejectClassName: 'p-button-secondary',
      accept: eliminarImagenEnServidor
    })
  }

  // --------------------------------------------------
  // Helpers de imagen: construcción de URL
  // --------------------------------------------------

  const baseApi = process.env.REACT_APP_API_BASE_URL

  const construirUrlDeImagen = (ruta?: string) => {
    if (!ruta) return ''
    const rutaTexto = String(ruta)

    if (rutaTexto.startsWith('http://') || rutaTexto.startsWith('https://')) return rutaTexto
    if (rutaTexto.startsWith('/')) return `${baseApi}${rutaTexto}`
    return `${baseApi}/${rutaTexto}`
  }

  const valorImagen = (formulario as any)?.imagen
  const urlImagen =
    urlVistaPrevia ||
    (formulario as any)?._imagenUrl ||
    (valorImagen ? construirUrlDeImagen(valorImagen) : '')

  const mostrarImagen = modo === 'editar' || Boolean(valorImagen || urlVistaPrevia)

  const estaActivo = String((formulario as any)?.activoSn ?? '').toUpperCase() === 'S'

  // --------------------------------------------------
  // Permisos derivados
  // --------------------------------------------------

  const puedeEditarEstado =
    !!hasPermission &&
    (hasPermission('Usuarios', 'ActivoSN') ||
      hasPermission('Usuarios', 'ActivoSn') ||
      hasPermission('Usuarios', 'Activo'))

  const puedeEditarRol =
    !!hasPermission &&
    (hasPermission('Usuarios', 'Rol') ||
      hasPermission('Usuarios', 'EditarRol') ||
      hasPermission('Usuarios', 'Editar Rol'))

  // --------------------------------------------------
  // Gestión de activoSn (activar / desactivar usuario)
  // --------------------------------------------------

  const manejarCambioEstadoActivo = (valor: boolean) => {
    const nuevoValor = valor ? 'S' : 'N'
    const estaActualmenteActivo = String((formulario as any)?.activoSn ?? '').toUpperCase() === 'S'
    const esDesactivacion =
      estaActualmenteActivo && nuevoValor === 'N' && (formulario as any)?.id

    if (modo === 'editar' && esDesactivacion) {
      confirmDialog({
        message: 'Si desactivas al usuario no podrá iniciar sesión. ¿Estás seguro?',
        header: 'Confirmar desactivación',
        acceptLabel: 'Desactivar',
        rejectLabel: 'Cancelar',
        acceptClassName: 'p-button-danger',
        rejectClassName: 'p-button-secondary',
        accept: () => actualizarCampoDelFormulario('activoSn', 'N')
      })
      return
    }

    actualizarCampoDelFormulario('activoSn', nuevoValor)
  }

  // --------------------------------------------------
  // Subida de imagen después de guardar usuario
  // --------------------------------------------------

  const intentarSubirImagenDespuesDeGuardar = async (archivoPendiente?: File) => {
    const archivo = archivoPendiente || (formulario as any)?._imagenFile
    if (!archivo) return

    let idDelUsuario = (formulario as any)?.id
    const maxReintentos = 10
    let intento = 0

    // Espera a que el id del usuario aparezca en el formulario (útil tras un register)
    while ((!idDelUsuario || Number.isNaN(Number(idDelUsuario))) && intento < maxReintentos) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 100))
      idDelUsuario = (formulario as any)?.id
      intento += 1
    }

    if (!idDelUsuario) {
      alert(
        'Usuario guardado, pero no se pudo subir la imagen automáticamente. Inténtalo manualmente.'
      )
      return
    }

    try {
      await subirImagenDelUsuario(archivo, idDelUsuario)
    } catch (error) {
      console.error('Error en subida automática:', error)
    }
  }

  const subirImagenDelUsuario = async (
    archivo?: File,
    idUsuarioEspecifico?: number | string
  ) => {
    const archivoASubir: File | undefined = archivo || (formulario as any)?._imagenFile
    let idDelUsuario = idUsuarioEspecifico || (formulario as any)?.id

    if (!archivoASubir) {
      alert('Selecciona un archivo antes de subir')
      return
    }
    if (!idDelUsuario) {
      alert('Guarda el usuario primero para poder subir la imagen')
      return
    }

    try {
      setEstaSubiendoImagen(true)

      const nombreOriginal = archivoASubir.name || 'imagen'
      const coincidenciaExtension = nombreOriginal.match(/(\.[0-9a-zA-Z]+)$/)
      const extension = coincidenciaExtension ? coincidenciaExtension[1] : '.jpg'
      const nombreDeseado = `${idDelUsuario}${extension}`

      const respuesta = await UsuariosAPI.uploadUsuarioImagen(
        idDelUsuario,
        archivoASubir,
        nombreDeseado
      )

      if (respuesta && respuesta.path) {
        actualizarCampoDelFormulario('imagen', respuesta.path)
        if (respuesta.url) actualizarCampoDelFormulario('_imagenUrl', respuesta.url)

        setFormulario((estadoAnterior: any) => {
          const copiaFormulario = { ...estadoAnterior }
          delete copiaFormulario._imagenFile
          return copiaFormulario
        })

        try {
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        } catch (error) {
          console.error('Error limpiando URL:', error)
        }
        objectUrlRef.current = null
        setUrlVistaPrevia(null)

        if (onUploadSuccess) {
          const idNumero = Number(idDelUsuario)
          if (!Number.isNaN(idNumero)) onUploadSuccess(idNumero)
        }
      } else {
        throw new Error('Respuesta del servidor sin ruta válida')
      }
    } catch (error: any) {
      console.error('Error subiendo imagen del usuario:', error)
      alert('Error subiendo la imagen: ' + (error?.message || error))
    } finally {
      setEstaSubiendoImagen(false)
    }
  }

  // --------------------------------------------------
  // Guardado de usuario con validaciones
  // --------------------------------------------------

  const guardarUsuarioConValidaciones = async () => {
    setErrores({})
    const nuevosErrores: Record<string, string> = {}

    const nombre = String((formulario as any)?.nombreUsuario || '').trim()
    if (!nombre) nuevosErrores.nombreUsuario = 'El nombre es obligatorio'

    const correo = String((formulario as any)?.email || '').trim()
    if (!correo) nuevosErrores.email = 'El correo electrónico es obligatorio'

    const apellidos = String((formulario as any)?.apellidos || '').trim()
    if (!apellidos) nuevosErrores.apellidos = 'Los apellidos son obligatorios'

    const esNuevo = !(formulario as any)?.id
    const passwordActual = String((formulario as any)?.password || '')

    if (esNuevo) {
      if (!passwordActual || passwordActual.length < 8) {
        nuevosErrores.password = 'La contraseña debe tener al menos 8 caracteres'
      }
    } else if (passwordActual && passwordActual.length < 8) {
      nuevosErrores.password = 'La nueva contraseña debe tener al menos 8 caracteres'
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    const archivoPendiente: File | undefined = (formulario as any)?._imagenFile
    const payload: any = { ...(formulario as any) }

    // 🔹 Aseguramos que activoSn exista y esté sincronizado con el switch (estaActivo)
    if (
      payload.activoSn === undefined ||
      payload.activoSn === null ||
      payload.activoSn === ''
    ) {
      // si el switch está encendido -> 'S', si está apagado -> 'N'
      payload.activoSn = estaActivo ? 'S' : 'N'
    }

    delete payload._imagenFile
    delete payload._imagenPreview
    delete payload._imagenUrl
    if (payload._cb !== undefined) delete payload._cb

    if (!esNuevo && Object.prototype.hasOwnProperty.call(payload, 'password')) {
      delete payload.password
    }

    let resultadoGuardado: any = null

    try {
      if (esPanel && onSave) {
        resultadoGuardado = await onSave(payload as Usuario)
      } else if (esNuevo) {
        resultadoGuardado = await UsuariosAPI.register(payload)
        if (resultadoGuardado?.id) {
          setFormulario((estadoAnterior: any) => ({
            ...estadoAnterior,
            id: resultadoGuardado.id
          }))
        }
      } else if (payload.id) {
        await UsuariosAPI.updateUsuarioById(payload.id, payload)
        resultadoGuardado = { id: payload.id }
      }
    } catch (errorGuardado: any) {
      const erroresGuardado: Record<string, string> = {}
      const mensajeError = errorGuardado?.message || ''
      let mensajeBackend: string | null = null
      let detallesBackend: any = null

      const indiceJson = mensajeError.indexOf('{')
      if (indiceJson >= 0) {
        try {
          const jsonStr = mensajeError.slice(indiceJson)
          const jsonParseado = JSON.parse(jsonStr)
          mensajeBackend = jsonParseado?.error?.message || null
          detallesBackend = jsonParseado?.error?.details || null
        } catch {
          // ignorar errores de parseo
        }
      }

      const mensajeBase = (mensajeBackend || mensajeError).toLowerCase()

      if (/correo|email/.test(mensajeBase)) {
        erroresGuardado.email = 'Este correo ya está en uso'
      }
      if (/usuario|nombre\s*de\s*usuario/.test(mensajeBase)) {
        erroresGuardado.nombreUsuario = 'Este nombre de usuario ya está en uso'
      }

      if (/additionalproperties/.test(mensajeBase) && /password/.test(mensajeBase)) {
        erroresGuardado.password = 'No se puede cambiar la contraseña desde este formulario.'
      }

      if (!erroresGuardado.password && Array.isArray(detallesBackend)) {
        const conflictoPassword = detallesBackend.find(
          (detalle: any) =>
            (detalle?.code === 'additionalProperties' ||
              /additionalproperties/i.test(String(detalle?.code))) &&
            detalle?.info?.additionalProperty === 'password'
        )
        if (conflictoPassword) {
          erroresGuardado.password = 'No se puede cambiar la contraseña desde este formulario.'
        }
      }

      if (Object.keys(erroresGuardado).length === 0) {
        erroresGuardado.general = mensajeBackend || 'Revisa los datos enviados'
      }

      setErrores(erroresGuardado)
      return
    }

    try {
      const idNuevo =
        (resultadoGuardado && (resultadoGuardado.id || resultadoGuardado?.data?.id)) ||
        (formulario as any)?.id

      if (archivoPendiente && idNuevo) {
        await subirImagenDelUsuario(archivoPendiente, idNuevo)
      } else {
        await intentarSubirImagenDespuesDeGuardar(archivoPendiente)
      }
    } catch (error) {
      console.error('Error en subida automática de imagen:', error)
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  if (esPanel && !registroPanel) return null

  return (
    <div>
      {!esPanel && <h2>Editar usuario</h2>}

      <EditarDatosUsuariosVista
        modo={modo}
        esPanel={esPanel}
        formulario={formulario}
        errores={errores}
        puedeEditarEstado={puedeEditarEstado}
        puedeEditarRol={puedeEditarRol}
        mostrarImagen={mostrarImagen}
        urlImagen={urlImagen}
        urlVistaPrevia={urlVistaPrevia}
        estaActivo={estaActivo}
        estaSubiendoImagen={estaSubiendoImagen}
        rolSeleccionado={rolSeleccionado}
        opcionesRol={opcionesRoles}
        mostrarPasswordCrear={mostrarPasswordCrear}
        mostrarPasswordEditar={mostrarPasswordEditar}
        fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
        onCampoChange={actualizarCampoDelFormulario}
        onGuardarClick={guardarUsuarioConValidaciones}
        onCerrarClick={onClose}
        onEstadoActivoChange={manejarCambioEstadoActivo}
        onRolChange={manejarRolChange}
        onSeleccionarArchivo={manejarSeleccionDeArchivo}
        onEliminarImagenClick={manejarEliminarImagen}
        onSubirImagenClick={() => subirImagenDelUsuario()}
        onTogglePasswordCrear={() => setMostrarPasswordCrear((prev) => !prev)}
        onTogglePasswordEditar={() => setMostrarPasswordEditar((prev) => !prev)}
      />
    </div>
  )
}
