import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toast } from 'primereact/toast'
import estadosAPI from '../../../api-endpoints/estados'
import fasesAPI from '../../../api-endpoints/fases'
import productosAPI from '../../../api-endpoints/productos'
import productosFasesTareasAPI from '../../../api-endpoints/productos-fases-tareas'
import RolesAPI from '../../../api-endpoints/roles'
import tareasFasesAPI from '../../../api-endpoints/tareas-fases'
import { useAuth } from '../../../contexts/AuthContext'
import usePermisos from '../../../hooks/usePermisos'

// ------------------------------------------------------
// Tipos locales
// ------------------------------------------------------

// Tipo de una tarea asociada a una fase
export type TareaFase = { id: number; faseId: number; nombre: string }

// Tipo de una fase de producto
export type Fase = { id: number; codigo?: string; nombre?: string }

// Tipo del estado del selector de correos (modal)
export type EmailPickerState = {
  visible: boolean
  destinatarios: string[]
  fase: Fase | null
  siguiente: Fase | undefined
  completadas: string[]
}

// Parámetros de entrada del hook principal
export type EditarFaseTareasProductoParams = {
  productId?: string | number
  productName?: string
  selectedEstadoId?: string | number
  onEstadoChange?: (nuevoNombre: string, nuevoId?: string | number) => void
  readOnly?: boolean
}

// Estado interno para envío de correo / cambio de estado
type PendingEnvioEstado = {
  fase: Fase
  siguiente: Fase
  completadas: string[]
  matchEstado: any
}

// ------------------------------------------------------
// Constantes de entorno
// ------------------------------------------------------

const emailSupervisorEnv = process.env.REACT_APP_SUPERVISOR_EMAIL

// ------------------------------------------------------
// Helpers puros
// ------------------------------------------------------

/**
 * normalizarListaFases
 * Adapta distintas formas de respuesta del backend a un array plano.
 */
const normalizarListaFases = (entrada: any): any[] => {
  if (Array.isArray(entrada)) return entrada
  if (!entrada) return []
  if (Array.isArray(entrada.data)) return entrada.data
  if (entrada.data && Array.isArray(entrada.data.data)) return entrada.data.data
  if (Array.isArray(entrada.rows)) return entrada.rows
  if (Array.isArray(entrada.items)) return entrada.items
  if (Array.isArray(entrada.result)) return entrada.result
  if (Array.isArray(entrada.results)) return entrada.results
  return []
}

// ------------------------------------------------------
// Hook principal
// ------------------------------------------------------
export function EditarFaseTareasProducto({
  productId,
  productName,
  selectedEstadoId,
  onEstadoChange,
  readOnly = false
}: EditarFaseTareasProductoParams) {
  // --------------------------------------------------
  // Referencias y contexto
  // --------------------------------------------------

  const toastRef = useRef<Toast | null>(null)
  const { user } = useAuth()
  const { hasPermission } = usePermisos()

  // --------------------------------------------------
  // Estado principal
  // --------------------------------------------------

  const [listaDeFases, setListaDeFases] = useState<Fase[]>([])
  const [faseActivaId, setFaseActivaId] = useState<number | null>(null)
  const [tareasFaseActiva, setTareasFaseActiva] = useState<TareaFase[]>([])
  const [registrosProductosTareas, setRegistrosProductosTareas] = useState<Record<number, any>>({})
  const [estadoGuardandoTareas, setEstadoGuardandoTareas] = useState<Record<number, boolean>>({})
  const [correosEnviadosPorFase, setCorreosEnviadosPorFase] = useState<Record<number, boolean>>({})
  const [emailPicker, setEmailPicker] = useState<EmailPickerState>({
    visible: false,
    destinatarios: [],
    fase: null,
    siguiente: undefined,
    completadas: []
  })
  const [envioEstadoPendiente, setEnvioEstadoPendiente] = useState<PendingEnvioEstado | null>(null)
  const [estaCargando, setEstaCargando] = useState(false)
  const [mensajeDeError, setMensajeDeError] = useState<string | null>(null)
  const [rolActivo, setRolActivo] = useState<boolean | null>(null)
  const [esSupervisor, setEsSupervisor] = useState(false)

  // --------------------------------------------------
  // Helper UI: Toast
  // --------------------------------------------------

  const mostrarToast = (
    severity: 'success' | 'info' | 'warn' | 'error',
    summary: string,
    detail = '',
    life = 4000
  ) => {
    toastRef.current?.show({ severity, summary, detail, life })
  }

  // --------------------------------------------------
  // Permisos derivados
  // --------------------------------------------------

  // Solo puede ver la sección si tiene permiso de ver ProductosFasesTareas
  const puedeVerTareas = useMemo(
    () => hasPermission('ProductosFasesTareas', 'Ver'),
    [hasPermission]
  )

  // Solo puede actualizar si no es readOnly y tiene permiso de actualizar ProductosFasesTareas
  const puedeActualizarTareas = useMemo(
    () => !readOnly && hasPermission('ProductosFasesTareas', 'Actualizar'),
    [hasPermission, readOnly]
  )

  // Si no puede ver tareas, nos aseguramos de que no se quede en "Cargando..."
  useEffect(() => {
    if (!puedeVerTareas) {
      setEstaCargando(false)
    }
  }, [puedeVerTareas])

  // --------------------------------------------------
  // Resolución de rol activo / supervisor
  // --------------------------------------------------

  useEffect(() => {
    let montado = true

    const comprobarRol = async () => {
      try {
        let rolId =
          (user as any)?.rolId ||
          (user as any)?.roleId ||
          (() => {
            try {
              const stored = localStorage.getItem('user')
              const parsed = stored ? JSON.parse(stored) : null
              return parsed?.rolId || parsed?.roleId
            } catch {
              return null
            }
          })()

        if (!rolId) {
          if (montado) {
            setRolActivo(true)
            setEsSupervisor(false)
          }
          return
        }

        const rol = await RolesAPI.getRoleById(rolId)
        const activo = rol?.activoSn ?? rol?.activoSN ?? rol?.activo ?? 'S'

        if (montado) {
          setRolActivo(String(activo).toUpperCase() === 'S')
          const nombreRol = (rol?.nombre || rol?.name || '').toString().trim().toLowerCase()
          setEsSupervisor(nombreRol.includes('supervisor'))
        }
      } catch {
        if (montado) {
          setRolActivo(true)
          setEsSupervisor(false)
        }
      }
    }

    comprobarRol()

    return () => {
      montado = false
    }
  }, [user])

  // --------------------------------------------------
  // Helpers para nombres de campos dinámicos
  // --------------------------------------------------

  const detectCompletadaKey = useCallback(
    (registro: any) =>
      (registro ? Object.keys(registro).find((campo) => /complet/i.test(campo)) : undefined) ||
      'completadaSn',
    []
  )

  const detectarClaveValidada = useCallback(
    (registro: any) =>
      (registro
        ? Object.keys(registro).find((campo) => /validada|supervisor/i.test(campo))
        : undefined) || 'validadaSupervisrSN',
    []
  )

  // --------------------------------------------------
  // Emails de supervisor (ENV)
  // --------------------------------------------------

  const supervisorEmails = useMemo(() => {
    const posibles = [
      emailSupervisorEnv,
      (typeof process !== 'undefined' &&
        (process as any).env?.NEXT_PUBLIC_SUPERVISOR_EMAIL) || undefined,
      (typeof window !== 'undefined' &&
        (window as any).process?.env?.REACT_APP_SUPERVISOR_EMAIL) || undefined,
      (typeof window !== 'undefined' &&
        (window as any).process?.env?.NEXT_PUBLIC_SUPERVISOR_EMAIL) || undefined
    ].filter(Boolean) as string[]

    const raw = posibles.length ? posibles[0] : ''
    return raw
      .split(/[;,]/)
      .map((email) => email.trim())
      .filter((email) => email)
  }, [])

  const recalcularEstadoCorreoEnviado = useCallback(
    (faseId: number, tareas: TareaFase[], registros: Record<number, any>): boolean => {
      if (!Array.isArray(tareas) || tareas.length === 0) return false
      return tareas.every((tarea) => {
        if (Number(tarea.faseId) !== Number(faseId)) return true
        const registro = registros[tarea.id]
        const claveValidada = detectarClaveValidada(registro)
        return registro && String(registro[claveValidada] ?? '').toUpperCase() === 'S'
      })
    },
    [detectarClaveValidada]
  )

  // --------------------------------------------------
  // Carga inicial de fases y selección de fase activa
  // --------------------------------------------------

  useEffect(() => {
    // Si no tiene permiso de ver tareas, no cargamos nada
    if (!puedeVerTareas) return

    let montado = true

    const cargarFases = async () => {
      try {
        const invocarFindFases = async (params?: any) => {
          if (typeof (fasesAPI as any).findFases === 'function')
            return (fasesAPI as any).findFases(params)
          if (typeof (fasesAPI as any).find === 'function')
            return (fasesAPI as any).find(params)
          return []
        }

        const respuestaRemota: any = await invocarFindFases().catch(() => [])
        const listaNormalizada = normalizarListaFases(respuestaRemota)
        if (!montado) return

        const listaInvertida = Array.isArray(listaNormalizada)
          ? listaNormalizada.slice().reverse()
          : []
        const fasesMapeadas: Fase[] = listaInvertida.map((fase: any) => ({
          id: Number(fase.id),
          codigo: fase.codigo,
          nombre: fase.nombre
        }))

        setListaDeFases(fasesMapeadas)
        if (!fasesMapeadas.length) return

        if (selectedEstadoId !== undefined && selectedEstadoId !== null) {
          try {
            const estadoRemoto =
              typeof (estadosAPI as any).getEstadoById === 'function'
                ? await (estadosAPI as any).getEstadoById(selectedEstadoId)
                : null
            const nombreEstado = estadoRemoto ? estadoRemoto.nombre || estadoRemoto.name || '' : ''
            const textoBuscado = String(nombreEstado || selectedEstadoId).toLowerCase()

            const faseCoincidente = fasesMapeadas.find((fase) => {
              const codigo = String(fase.codigo || '').toLowerCase()
              const nombreFase = String(fase.nombre || '').toLowerCase()
              return (
                codigo === textoBuscado ||
                nombreFase.includes(textoBuscado) ||
                String(fase.id) === String(selectedEstadoId)
              )
            })

            setFaseActivaId(faseCoincidente ? faseCoincidente.id : fasesMapeadas[0].id)
          } catch {
            setFaseActivaId(fasesMapeadas[0].id)
          }
        } else {
          setFaseActivaId(fasesMapeadas[0].id)
        }
      } catch (error: any) {
        if (montado) setMensajeDeError(error?.message || 'Error cargando fases')
      }
    }

    cargarFases()
    return () => {
      montado = false
    }
  }, [selectedEstadoId, puedeVerTareas])

  // --------------------------------------------------
  // Carga de tareas al cambiar de fase activa
  // --------------------------------------------------

  useEffect(() => {
    // Sin permiso de ver, no hacemos peticiones ni mostramos loading
    if (!puedeVerTareas) return
    if (!faseActivaId || !productId) return

    let montado = true

    const cargarTareasPorFase = async (faseIdDestino: number) => {
      setEstaCargando(true)
      setMensajeDeError(null)
      try {
        const parametrosFiltroTareas = {
          filter: JSON.stringify({ where: { faseId: Number(faseIdDestino) } })
        }
        const respuestaTareas = await (tareasFasesAPI as any).findTareasFases(parametrosFiltroTareas)
        const listaTareas = Array.isArray(respuestaTareas) ? respuestaTareas : []
        const tareasMapeadas: TareaFase[] = listaTareas.map((t: any) => ({
          id: Number(t.id),
          faseId: Number(t.faseId),
          nombre: t.nombre
        }))
        if (!montado) return
        setTareasFaseActiva(tareasMapeadas)

        try {
          const filtroRelaciones = {
            filter: JSON.stringify({
              where: { productoId: Number(productId), faseId: Number(faseIdDestino) }
            })
          }
          const respuestaRelaciones =
            await (productosFasesTareasAPI as any).findProductosFasesTareas(filtroRelaciones)
          const listaRelaciones = Array.isArray(respuestaRelaciones)
            ? respuestaRelaciones
            : []
          const mapaRegistrosPorTarea: Record<number, any> = {}

          for (const relacion of listaRelaciones) {
            const tareaIdRelacion = Number(relacion.tareaFaseId)
            if (!Number.isNaN(tareaIdRelacion)) mapaRegistrosPorTarea[tareaIdRelacion] = relacion
          }

          if (!montado) return
          setRegistrosProductosTareas(mapaRegistrosPorTarea)

          const todosValidados = recalcularEstadoCorreoEnviado(
            faseIdDestino,
            tareasMapeadas,
            mapaRegistrosPorTarea
          )
          setCorreosEnviadosPorFase((estadoPrevio) => ({
            ...estadoPrevio,
            [faseIdDestino]: todosValidados
          }))
        } catch (err) {
          console.error('Error cargando productos_fases_tareas', err)
        }
      } catch (error: any) {
        console.error('Error cargando tareas por fase', error)
        if (montado) setMensajeDeError(error?.message || 'Error cargando tareas de la fase')
      } finally {
        if (montado) setEstaCargando(false)
      }
    }

    cargarTareasPorFase(faseActivaId)
    return () => {
      montado = false
    }
  }, [faseActivaId, productId, puedeVerTareas, recalcularEstadoCorreoEnviado])

  // --------------------------------------------------
  // Helpers de validación en memoria / backend
  // --------------------------------------------------

  function esFaseValidadaSupervisorEnMemoria(faseId: number) {
    if (!Array.isArray(tareasFaseActiva) || tareasFaseActiva.length === 0) return false
    for (const tarea of tareasFaseActiva) {
      if (Number(tarea.faseId) !== Number(faseId)) continue
      const registro = registrosProductosTareas[tarea.id]
      const claveValidada = detectarClaveValidada(registro)
      if (!registro || String(registro[claveValidada] ?? '').toUpperCase() !== 'S') return false
    }
    return true
  }

  async function esFaseValidadaPorSupervisorEnBackend(faseId: number) {
    const filtro = {
      filter: JSON.stringify({ where: { productoId: Number(productId), faseId: Number(faseId) } })
    }
    const respuesta = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
    const registros = Array.isArray(respuesta) ? respuesta : []
    if (!registros.length) return false

    for (const registro of registros) {
      const claveValidada = detectarClaveValidada(registro)
      if (String(registro[claveValidada] ?? '').toUpperCase() !== 'S') return false
    }
    return true
  }

  // --------------------------------------------------
  // Función: cambiarAFase (solo navegación visual, sin avanzar hacia delante)
  // --------------------------------------------------

  async function cambiarAFase(idFaseDestino: number) {
    // Sin permiso de ver, no hacemos nada
    if (!puedeVerTareas) return
    if (idFaseDestino === faseActivaId) return

    const indiceDestino = listaDeFases.findIndex((fase) => fase.id === idFaseDestino)
    const indiceActual = listaDeFases.findIndex((fase) => fase.id === faseActivaId)

    if (indiceDestino === -1) {
      setMensajeDeError('Fase no encontrada')
      return
    }

    // Movimiento hacia atrás: bloqueado (solo se permite en Editar Producto por supervisor)
    if (indiceActual !== -1 && indiceDestino < indiceActual) {
      setMensajeDeError(
        esSupervisor
          ? 'No retrocedas fases aquí. Hazlo desde "Editar datos del producto" para mantener la consistencia.'
          : 'No puedes retroceder fases. Solicítalo a un supervisor desde "Editar datos del producto".'
      )
      return
    }

    // Movimiento hacia adelante: solo si ya se envió correo (validación previa)
    if (indiceActual !== -1 && indiceDestino > indiceActual) {
      const correoEnviado = faseActivaId ? correosEnviadosPorFase[faseActivaId] === true : false
      if (!correoEnviado) {
        setMensajeDeError(
          esSupervisor
            ? 'No puedes avanzar de fase aquí. Envía el correo y cambia el estado desde "Editar datos del producto".'
            : 'No puedes avanzar de fase. Envía el correo a supervisores y pide a un supervisor que cambie el estado.'
        )
        return
      }
      // Si ya se envió el correo, permitimos cambiar solo para visualización
      setMensajeDeError(null)
      setFaseActivaId(idFaseDestino)
      return
    }


    // Cambio lateral o inicial (casos raros)
    setMensajeDeError(null)
    setFaseActivaId(idFaseDestino)
  }

  // --------------------------------------------------
  // Función: abrirMailto + envío a supervisores
  // --------------------------------------------------

  function abrirMailto(
    destinatario: string,
    fase: Fase,
    siguiente: Fase | undefined,
    completadas: string[]
  ) {
    const asunto = siguiente
      ? `Producto ${productName?.toString()} - Fase completada: ${fase.nombre || fase.id}`
      : `Producto ${productName?.toString()} - Última fase completada: ${fase.nombre || fase.id}`

    const cuerpoLineas = [
      `Producto: ${productName}`,
      `Fase completada: ${fase.nombre}`,
      `Tareas completadas: ${completadas.join(', ') || 'N/A'}`,
      siguiente ? `Próxima fase: ${siguiente.nombre || siguiente.id}` : 'No hay fase siguiente',
      `Fecha de notificación: ${new Date().toLocaleString()}`
    ]

    const mailto = `mailto:${encodeURIComponent(destinatario)}?subject=${encodeURIComponent(
      asunto
    )}&body=${encodeURIComponent(cuerpoLineas.join('\n'))}`

    try {
      window.location.href = mailto
      mostrarToast(
        'success',
        'Correo preparado',
        `Se abrió el cliente de correo para: ${destinatario}`,
        4000
      )
      return true
    } catch (err) {
      console.error('Error abriendo mailto', err)
      mostrarToast(
        'warn',
        'Aviso',
        'No se pudo abrir el correo. Comprueba que tienes un cliente de email configurado.',
        5000
      )
      return false
    }
  }

  async function continuarEnvioCorreo(
    destinatario: string,
    datos?: { fase: Fase; siguiente: Fase; completadas: string[]; matchEstado: any }
  ) {
    const info = datos || envioEstadoPendiente
    if (!info) return

    const { fase, siguiente, completadas, matchEstado } = info
    const okCorreo = abrirMailto(destinatario, fase, siguiente, completadas)
    if (!okCorreo) return

    try {
      await (productosAPI as any).updateProductoById(productId, { estadoId: Number(matchEstado.id) })
      mostrarToast(
        'success',
        'Estado actualizado',
        `Producto actualizado al estado: ${matchEstado.nombre || matchEstado.name}`,
        4000
      )

      try {
        const listaRegistros = Object.values(registrosProductosTareas)
        for (const registro of listaRegistros) {
          const claveValidada = detectarClaveValidada(registro)
          if (registro && registro.id) {
            await (productosFasesTareasAPI as any).updateProductosFasesTareasById(registro.id, {
              [claveValidada]: 'S'
            })
          }
        }

        setCorreosEnviadosPorFase((estadoPrevio) => ({
          ...estadoPrevio,
          [fase.id]: true
        }))

      setRegistrosProductosTareas((estadoPrevio) => {
        const copia = { ...estadoPrevio }
        for (const idTareaStr of Object.keys(copia)) {
          const idTarea = Number(idTareaStr)
          const registro = copia[idTarea]
          const claveValidada = detectarClaveValidada(registro)
          copia[idTarea][claveValidada] = 'S'
        }
        return copia
      })
    } catch (errValida) {
      console.error('Error marcando validación de supervisor', errValida)
    }

      if (typeof onEstadoChange === 'function') {
        onEstadoChange(matchEstado.nombre || matchEstado.name || String(matchEstado.id), matchEstado.id)
      }

    // Avanzar la fase activa localmente para que se refleje en ambos componentes
    try {
      const indiceActual = listaDeFases.findIndex((f) => f.id === fase.id)
      const faseSiguienteLocal = listaDeFases[indiceActual + 1]
      if (faseSiguienteLocal && faseSiguienteLocal.id) {
        setFaseActivaId(faseSiguienteLocal.id)
      }
    } catch {
      /* ignore avance local */
    }
  } catch (errUpd: any) {
    mostrarToast(
      'error',
      'Error',
      'No se pudo actualizar el estado del producto en el servidor.',
      6000
    )
    } finally {
      setEnvioEstadoPendiente(null)
      setEmailPicker({
        visible: false,
        destinatarios: [],
        fase: null,
        siguiente: undefined,
        completadas: []
      })
    }
  }

  // --------------------------------------------------
  // Función: sendToSupervisors
  // --------------------------------------------------

  async function sendToSupervisors(fase: Fase) {
    if (fase.id !== faseActivaId) return
    if (!puedeVerTareas) return
    if (!puedeActualizarTareas) return

    let faseValidadaLocal = esFaseValidadaSupervisorEnMemoria(fase.id)
    try {
      const validadaEnBackend = await esFaseValidadaPorSupervisorEnBackend(fase.id)
      if (!validadaEnBackend) {
        setCorreosEnviadosPorFase((estadoPrevio) => ({ ...estadoPrevio, [fase.id]: false }))
      }
      faseValidadaLocal = validadaEnBackend
    } catch {
      // si la validación remota falla, usamos la local
    }

    if (correosEnviadosPorFase[fase.id] && faseValidadaLocal) {
      mostrarToast(
        'info',
        'Correo ya enviado',
        'Ya has notificado a los supervisores en esta fase.',
        3000
      )
      return
    }

    const claveCompletadaPorDefecto = detectCompletadaKey(null)
    const listaTareasCompletadas = tareasFaseActiva
      .filter((tarea) => {
        const registro = registrosProductosTareas[tarea.id]
        return registro && String(registro[claveCompletadaPorDefecto] ?? '').toUpperCase() === 'S'
      })
      .map((tarea) => tarea.nombre || `Tarea ${tarea.id}`)

    const indiceFaseActual = listaDeFases.findIndex((f) => f.id === fase.id)
    const faseSiguiente = listaDeFases[indiceFaseActual + 1]

    if (!faseSiguiente) {
      mostrarToast(
        'info',
        'Enviar notificación',
        'Esta es la última fase; no hay fase siguiente para mapear a un estado.',
        5000
      )
      console.log(
        `Notificación a supervisores: fase completada ${fase.nombre || fase.id
        }. Tareas completadas: ${JSON.stringify(listaTareasCompletadas)}. No hay siguiente fase.`
      )
      return
    }

    try {
      const listaEstados =
        typeof (estadosAPI as any).findEstados === 'function'
          ? await (estadosAPI as any).findEstados()
          : await (typeof (estadosAPI as any).find === 'function'
            ? (estadosAPI as any).find()
            : [])

      const textoBuscado = String(
        faseSiguiente.nombre || faseSiguiente.codigo || faseSiguiente.id
      ).toLowerCase()

      const estadoCoincidente = listaEstados.find((estado: any) => {
        const nombre = String(estado.nombre || estado.name || estado.title || '').toLowerCase()
        const codigo = String(estado.codigo || estado.codigoEstado || '').toLowerCase()
        return nombre === textoBuscado || codigo === textoBuscado || nombre.includes(textoBuscado)
      })

      if (!estadoCoincidente) {
        mostrarToast(
          'warn',
          'Estado no encontrado',
          `No se encontró un estado que coincida con la fase siguiente: "${faseSiguiente.nombre}". No se actualizó el producto.`,
          6000
        )
        return
      }

      setEnvioEstadoPendiente({
        fase,
        siguiente: faseSiguiente,
        completadas: listaTareasCompletadas,
        matchEstado: estadoCoincidente
      })

      const destinatarios = supervisorEmails
      if (destinatarios.length === 1) {
        await continuarEnvioCorreo(destinatarios[0], {
          fase,
          siguiente: faseSiguiente,
          completadas: listaTareasCompletadas,
          matchEstado: estadoCoincidente
        })
      } else {
        setEmailPicker({
          visible: true,
          destinatarios,
          fase,
          siguiente: faseSiguiente,
          completadas: listaTareasCompletadas
        })
      }
    } catch (err: any) {
      console.error('Error buscando estados', err)
      mostrarToast(
        'error',
        'Error',
        'No se pudieron consultar los estados para mapear la siguiente fase.',
        6000
      )
    }
  }

  // --------------------------------------------------
  // Función: toggleCompletada
  // --------------------------------------------------

  async function toggleCompletada(tarea: TareaFase, checked: boolean) {
    if (!puedeVerTareas) return
    if (!puedeActualizarTareas) return

    const registroExistente = registrosProductosTareas[tarea.id]
    const claveCompletada = detectCompletadaKey(registroExistente)
    const copiaAnterior = registroExistente ? { ...registroExistente } : undefined

    setEstadoGuardandoTareas((estadoPrevio) => ({ ...estadoPrevio, [tarea.id]: true }))

    try {
      let registroCreado: any = null
      let payloadNuevoRegistro: any = null

      if (registroExistente && registroExistente.id) {
        await (productosFasesTareasAPI as any).updateProductosFasesTareasById(
          registroExistente.id,
          {
            [claveCompletada]: checked ? 'S' : 'N'
          }
        )
      } else {
        payloadNuevoRegistro = {
          productoId: Number(productId),
          faseId: Number(faseActivaId),
          tareaFaseId: Number(tarea.id),
          [claveCompletada]: checked ? 'S' : 'N'
        }
        const userId = (user as any)?.id ?? (user as any)?.usuarioId ?? (user as any)?.userId
        if (userId) payloadNuevoRegistro.usuarioId = Number(userId)
        registroCreado = await (productosFasesTareasAPI as any).createProductosFasesTareas(
          payloadNuevoRegistro
        )
      }

      let mapaRegistrosActualizado: Record<number, any> = {}
      setRegistrosProductosTareas((estadoPrevio) => {
        const siguienteEstado = { ...estadoPrevio }
        if (registroExistente && registroExistente.id) {
          siguienteEstado[tarea.id] = {
            ...(siguienteEstado[tarea.id] || {}),
            [claveCompletada]: checked ? 'S' : 'N'
          }
        } else {
          const baseRegistro =
            registroCreado && registroCreado.id ? registroCreado : registroCreado || payloadNuevoRegistro || {}
          siguienteEstado[tarea.id] = { ...(siguienteEstado[tarea.id] || {}), ...baseRegistro }
        }
        mapaRegistrosActualizado = siguienteEstado
        return siguienteEstado
      })

      const todosValidados = recalcularEstadoCorreoEnviado(
        Number(faseActivaId),
        tareasFaseActiva,
        mapaRegistrosActualizado
      )
      setCorreosEnviadosPorFase((estadoPrevio) => ({
        ...estadoPrevio,
        [Number(faseActivaId)]: todosValidados
      }))
    } catch (err: any) {
      console.error('Error guardando el estado de completada', err)
      setRegistrosProductosTareas((estadoPrevio) => {
        const copia = { ...estadoPrevio }
        if (copiaAnterior) copia[tarea.id] = copiaAnterior
        else delete copia[tarea.id]
        return copia
      })
      setMensajeDeError(err?.message || 'Error guardando la tarea')
    } finally {
      setEstadoGuardandoTareas((estadoPrevio) => ({ ...estadoPrevio, [tarea.id]: false }))
    }
  }

  // --------------------------------------------------
  // API pública del hook
  // --------------------------------------------------

  return {
    // Refs
    toastRef,

    // Estado principal
    listaDeFases,
    faseActivaId,
    tareasFaseActiva,
    registrosProductosTareas,
    updatingTareas: estadoGuardandoTareas,
    correosEnviados: correosEnviadosPorFase,
    emailPicker,

    // Estado auxiliar
    estaCargando,
    mensajeDeError,
    rolActivo,
    esSupervisor,

    // Permisos
    canViewTasks: puedeVerTareas,
    canUpdateTasks: puedeActualizarTareas,

    // Setters expuestos (para UI)
    setEmailPicker,
    setMensajeDeError,

    // Acciones principales
    cambiarAFase,
    sendToSupervisors,
    toggleCompletada,
    continuarEnvioCorreo,

    // Helper útil para la UI
    detectCompletadaKey
  }
}
