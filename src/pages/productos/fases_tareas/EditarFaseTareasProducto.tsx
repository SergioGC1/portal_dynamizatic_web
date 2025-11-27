import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toast } from 'primereact/toast'
import { confirmDialog } from 'primereact/confirmdialog'
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
  onEstadoChange?: (nuevoNombre: string) => void
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

// Email(s) de supervisores desde variables de entorno
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
  const [updatingTareas, setUpdatingTareas] = useState<Record<number, boolean>>({})
  const [correosEnviados, setCorreosEnviados] = useState<Record<number, boolean>>({})
  const [emailPicker, setEmailPicker] = useState<EmailPickerState>({
    visible: false,
    destinatarios: [],
    fase: null,
    siguiente: undefined,
    completadas: []
  })
  const [pendingEnvioEstado, setPendingEnvioEstado] = useState<PendingEnvioEstado | null>(null)
  const [estaCargando, setEstaCargando] = useState(false)
  const [mensajeDeError, setMensajeDeError] = useState<string | null>(null)
  const [rolActivo, setRolActivo] = useState<boolean | null>(null)
  const [esSupervisor, setEsSupervisor] = useState(false)

  // --------------------------------------------------
  // Helper UI: Toast
  // --------------------------------------------------

  const showToast = (
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
  const canViewTasks = useMemo(
    () => hasPermission('ProductosFasesTareas', 'Ver'),
    [hasPermission]
  )

  // Solo puede actualizar si no es readOnly y tiene permiso de actualizar ProductosFasesTareas
  const canUpdateTasks = useMemo(
    () => !readOnly && hasPermission('ProductosFasesTareas', 'Actualizar'),
    [hasPermission, readOnly]
  )

  // Si no puede ver tareas, nos aseguramos de que no se quede en "Cargando..."
  useEffect(() => {
    if (!canViewTasks) {
      setEstaCargando(false)
    }
  }, [canViewTasks])

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
    (rec: any) => (rec ? Object.keys(rec).find((k) => /complet/i.test(k)) : undefined) || 'completadaSn',
    []
  )

  const detectValidadaKey = useCallback(
    (rec: any) =>
      (rec ? Object.keys(rec).find((k) => /validada|supervisor/i.test(k)) : undefined) || 'validadaSupervisrSN',
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
      .map((e) => e.trim())
      .filter((e) => e)
  }, [])

  const recomputeCorreoEnviadoFlag = useCallback(
    (faseId: number, tareas: TareaFase[], registros: Record<number, any>): boolean => {
      if (!Array.isArray(tareas) || tareas.length === 0) return false
      return tareas.every((t) => {
        if (Number(t.faseId) !== Number(faseId)) return true
        const rec = registros[t.id]
        const keyVal = detectValidadaKey(rec)
        return rec && String(rec[keyVal] ?? '').toUpperCase() === 'S'
      })
    },
    [detectValidadaKey]
  )

  // --------------------------------------------------
  // Carga inicial de fases y selección de fase activa
  // --------------------------------------------------

  useEffect(() => {
    // Si no tiene permiso de ver tareas, no cargamos nada
    if (!canViewTasks) return

    let mounted = true

    const cargarFases = async () => {
      try {
        const invokeFind = async (params?: any) => {
          if (typeof (fasesAPI as any).findFases === 'function')
            return (fasesAPI as any).findFases(params)
          if (typeof (fasesAPI as any).find === 'function')
            return (fasesAPI as any).find(params)
          return []
        }

        const listaRemota: any = await invokeFind().catch(() => [])
        const lista = normalizarListaFases(listaRemota)
        if (!mounted) return

        const listaInvertida = Array.isArray(lista) ? lista.slice().reverse() : []
        const listaMapeada: Fase[] = listaInvertida.map((fase: any) => ({
          id: Number(fase.id),
          codigo: fase.codigo,
          nombre: fase.nombre
        }))

        setListaDeFases(listaMapeada)
        if (!listaMapeada.length) return

        if (selectedEstadoId !== undefined && selectedEstadoId !== null) {
          try {
            const estadoRemoto =
              typeof (estadosAPI as any).getEstadoById === 'function'
                ? await (estadosAPI as any).getEstadoById(selectedEstadoId)
                : null
            const nombreEstado = estadoRemoto ? estadoRemoto.nombre || estadoRemoto.name || '' : ''
            const buscado = String(nombreEstado || selectedEstadoId).toLowerCase()

            const match = listaMapeada.find((fase) => {
              const codigo = String(fase.codigo || '').toLowerCase()
              const nombreFase = String(fase.nombre || '').toLowerCase()
              return (
                codigo === buscado ||
                nombreFase.includes(buscado) ||
                String(fase.id) === String(selectedEstadoId)
              )
            })

            setFaseActivaId(match ? match.id : listaMapeada[0].id)
          } catch {
            setFaseActivaId(listaMapeada[0].id)
          }
        } else {
          setFaseActivaId(listaMapeada[0].id)
        }
      } catch (error: any) {
        if (mounted) setMensajeDeError(error?.message || 'Error cargando fases')
      }
    }

    cargarFases()
    return () => {
      mounted = false
    }
  }, [selectedEstadoId, canViewTasks])

  // --------------------------------------------------
  // Carga de tareas al cambiar de fase activa
  // --------------------------------------------------

  useEffect(() => {
    // Sin permiso de ver, no hacemos peticiones ni mostramos loading
    if (!canViewTasks) return
    if (!faseActivaId || !productId) return

    let mounted = true

    const cargarTareasPorFase = async (identificadorDeFase: number) => {
      setEstaCargando(true)
      setMensajeDeError(null)
      try {
        const parametros = {
          filter: JSON.stringify({ where: { faseId: Number(identificadorDeFase) } })
        }
        const resultado = await (tareasFasesAPI as any).findTareasFases(parametros)
        const arreglo = Array.isArray(resultado) ? resultado : []
        const mapeadas: TareaFase[] = arreglo.map((t: any) => ({
          id: Number(t.id),
          faseId: Number(t.faseId),
          nombre: t.nombre
        }))
        if (!mounted) return
        setTareasFaseActiva(mapeadas)

        try {
          const filtro = {
            filter: JSON.stringify({
              where: { productoId: Number(productId), faseId: Number(identificadorDeFase) }
            })
          }
          const rp = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
          const arrRp = Array.isArray(rp) ? rp : []
          const mapa: Record<number, any> = {}
          for (const r of arrRp) {
            const tareaId = Number(r.tareaFaseId)
            if (!Number.isNaN(tareaId)) mapa[tareaId] = r
          }
          if (!mounted) return
          setRegistrosProductosTareas(mapa)

          const todosValidados = recomputeCorreoEnviadoFlag(
            identificadorDeFase,
            mapeadas,
            mapa
          )
          setCorreosEnviados((prev) => ({ ...prev, [identificadorDeFase]: todosValidados }))
        } catch (err) {
          console.error('Error cargando productos_fases_tareas', err)
        }
      } catch (error: any) {
        console.error('Error cargando tareas por fase', error)
        if (mounted) setMensajeDeError(error?.message || 'Error cargando tareas de la fase')
      } finally {
        if (mounted) setEstaCargando(false)
      }
    }

    cargarTareasPorFase(faseActivaId)
    return () => {
      mounted = false
    }
  }, [faseActivaId, productId, canViewTasks, recomputeCorreoEnviadoFlag])

  // --------------------------------------------------
  // Helpers de validación en memoria
  // --------------------------------------------------

  function isPhaseValidatedBySupervisorLocal(faseId: number) {
    if (!Array.isArray(tareasFaseActiva) || tareasFaseActiva.length === 0) return false
    for (const t of tareasFaseActiva) {
      if (Number(t.faseId) !== Number(faseId)) continue
      const rec = registrosProductosTareas[t.id]
      const keyVal = detectValidadaKey(rec)
      if (!rec || String(rec[keyVal] ?? '').toUpperCase() !== 'S') return false
    }
    return true
  }

  // --------------------------------------------------
  // Funciones auxiliares: backend
  // --------------------------------------------------

  async function contarPendientesFase(faseId: number) {
    const paramsT = { filter: JSON.stringify({ where: { faseId: Number(faseId) } }) }
    const resultadoT = await (tareasFasesAPI as any).findTareasFases(paramsT)
    const tareas = Array.isArray(resultadoT) ? resultadoT : []
    if (!tareas.length) return 0

    const filtro = {
      filter: JSON.stringify({ where: { productoId: Number(productId), faseId: Number(faseId) } })
    }
    const resultadoRp = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
    const rp = Array.isArray(resultadoRp) ? resultadoRp : []
    const mapa: Record<number, any> = {}
    for (const r of rp) {
      const tareaId = Number(r.tareaFaseId)
      if (!Number.isNaN(tareaId)) mapa[tareaId] = r
    }

    let pendientes = 0
    for (const t of tareas) {
      const r = mapa[Number((t as any).id)]
      const key = detectCompletadaKey(r)
      if (!r || String(r[key] ?? '').toUpperCase() !== 'S') pendientes += 1
    }
    return pendientes
  }

  async function resetearTareasFase(faseId: number) {
    try {
      const paramsT = { filter: JSON.stringify({ where: { faseId: Number(faseId) } }) }
      const tareas = await (tareasFasesAPI as any).findTareasFases(paramsT)
      const arreglo = Array.isArray(tareas) ? tareas : []

      for (const t of arreglo) {
        const filtro = {
          filter: JSON.stringify({
            where: {
              productoId: Number(productId),
              faseId: Number(faseId),
              tareaFaseId: Number((t as any).id)
            }
          })
        }
        const existentes = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
        const arrEx = Array.isArray(existentes) ? existentes : []
        const keyComp = detectCompletadaKey(arrEx[0])
        const keyVal = detectValidadaKey(arrEx[0])

        if (arrEx.length) {
          for (const ex of arrEx) {
            await (productosFasesTareasAPI as any).updateProductosFasesTareasById(ex.id, {
              [keyComp]: 'N',
              [keyVal]: 'N'
            })
          }
        } else {
          const payload: any = {
            productoId: Number(productId),
            faseId: Number(faseId),
            tareaFaseId: Number((t as any).id),
            [keyComp]: 'N',
            [keyVal]: 'N'
          }
          await (productosFasesTareasAPI as any).createProductosFasesTareas(payload)
        }
      }

      // Sincronizar estado local
      setRegistrosProductosTareas((p) => {
        const copia = { ...p }
        arreglo.forEach((t: any) => {
          const tid = Number(t.id)
          if (!Number.isNaN(tid) && copia[tid]) {
            const keyComp = detectCompletadaKey(copia[tid])
            const keyVal =
              detectValidadaKey(copia[tid])
            copia[tid][keyComp] = 'N'
            copia[tid][keyVal] = 'N'
          }
        })
        return copia
      })
    } catch (err) {
      console.error('No se pudieron resetear las tareas de la fase', err)
    }
  }

  async function isPhaseFullyCompleted(faseId: number) {
    const paramsT = { filter: JSON.stringify({ where: { faseId: Number(faseId) } }) }
    const resultadoT = await (tareasFasesAPI as any).findTareasFases(paramsT)
    const tareas = Array.isArray(resultadoT) ? resultadoT : []
    if (!tareas.length) return true

    const filtro = {
      filter: JSON.stringify({ where: { productoId: Number(productId), faseId: Number(faseId) } })
    }
    const resultadoRp = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
    const rp = Array.isArray(resultadoRp) ? resultadoRp : []
    const mapa: Record<number, any> = {}
    for (const r of rp) {
      const tareaId = Number(r.tareaFaseId)
      if (!Number.isNaN(tareaId)) mapa[tareaId] = r
    }

    for (const t of tareas) {
      const r = mapa[Number((t as any).id)]
      if (!r) return false
      const key = detectCompletadaKey(r)
      if (String(r[key] ?? '').toUpperCase() !== 'S') return false
    }
    return true
  }

  async function isPhaseValidatedBySupervisor(faseId: number) {
    const filtro = {
      filter: JSON.stringify({ where: { productoId: Number(productId), faseId: Number(faseId) } })
    }
    const resultado = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
    const registros = Array.isArray(resultado) ? resultado : []
    if (!registros.length) return false

    for (const r of registros) {
      const keyVal = detectValidadaKey(r)
      if (String(r[keyVal] ?? '').toUpperCase() !== 'S') return false
    }
    return true
  }

  // --------------------------------------------------
  // Helpers de confirmación (PrimeReact ConfirmDialog)
  // --------------------------------------------------

  const confirmarRetrocesoFase = (mensaje: string) =>
    new Promise<boolean>((resolve) => {
      confirmDialog({
        message: mensaje,
        header: 'Confirmar retroceso de fase',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, retroceder',
        rejectLabel: 'Cancelar',
        accept: () => resolve(true),
        reject: () => resolve(false),
        closeOnEscape: true
      })
    })

  const confirmarAvanceConPendientes = (mensaje: string) =>
    new Promise<boolean>((resolve) => {
      confirmDialog({
        message: mensaje,
        header: 'Confirmar avance de fase',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, avanzar',
        rejectLabel: 'Cancelar',
        accept: () => resolve(true),
        reject: () => resolve(false),
        closeOnEscape: true
      })
    })

  // --------------------------------------------------
  // Función: cambiarAFase
  // --------------------------------------------------

  async function cambiarAFase(identificadorDeFaseDestino: number) {
    if (readOnly) return
    if (!canViewTasks) return
    if (!canUpdateTasks) return
    if (identificadorDeFaseDestino === faseActivaId) return

    const indiceDestino = listaDeFases.findIndex((f) => f.id === identificadorDeFaseDestino)
    const indiceActual = listaDeFases.findIndex((f) => f.id === faseActivaId)

    if (indiceDestino === -1) {
      setMensajeDeError('Fase no encontrada')
      return
    }

    const estaRetrocediendo = indiceActual !== -1 && indiceDestino < indiceActual

    // --- Caso 1: RETROCESO DE FASE ---
    if (estaRetrocediendo) {
      if (!esSupervisor) {
        setMensajeDeError('Solo un supervisor puede retroceder la fase del producto.')
        return
      }

      const faseDestinoNombre =
        listaDeFases[indiceDestino]?.nombre || `Fase ${listaDeFases[indiceDestino]?.id}`
      const faseActualNombre =
        listaDeFases[indiceActual]?.nombre || `Fase ${listaDeFases[indiceActual]?.id}`

      const mensaje =
        `Vas a retroceder de "${faseActualNombre}" a "${faseDestinoNombre}".\n\n` +
        'Al retroceder, se reiniciarán las tareas y validaciones de la fase destino y los usuarios deberán revisarlas de nuevo.\n\n' +
        '¿Deseas continuar?'

      const ok = await confirmarRetrocesoFase(mensaje)
      if (!ok) {
        setMensajeDeError('Retroceso cancelado por el usuario')
        return
      }

      await resetearTareasFase(identificadorDeFaseDestino)
      setCorreosEnviados((prev) => ({ ...prev, [identificadorDeFaseDestino]: false }))

      setMensajeDeError(null)
      setFaseActivaId(identificadorDeFaseDestino)
      return
    }

    // --- Caso 2: AVANCE DE FASE ---
    const pendientesSupervisor: string[] = []

    for (let i = 0; i < indiceDestino; i++) {
      const fasePrev = listaDeFases[i]
      try {
        const completada = await isPhaseFullyCompleted(fasePrev.id)
        if (!completada) {
          if (esSupervisor && indiceDestino > indiceActual) {
            const pendientes = await contarPendientesFase(fasePrev.id)
            pendientesSupervisor.push(
              `${pendientes} pendientes en ${fasePrev.nombre || `Fase ${fasePrev.id}`}`
            )
          } else {
            setMensajeDeError(
              `No puedes pasar a la fase "${
                listaDeFases[indiceDestino].nombre
              }": la fase "${fasePrev.nombre || fasePrev.id}" no está completada.`
            )
            return
          }
        }

        const emailObligatorio = indiceActual === -1 ? true : i >= indiceActual
        if (emailObligatorio) {
          const faseValidada = await isPhaseValidatedBySupervisor(fasePrev.id)
          if (!faseValidada || !correosEnviados[fasePrev.id]) {
            if (esSupervisor && indiceDestino > indiceActual) {
              const pendientes = pendientesSupervisor.length
                ? pendientesSupervisor.join(', ')
                : `Pendiente validar correo en ${fasePrev.nombre || fasePrev.id}`
              pendientesSupervisor.push(pendientes)
            } else {
              const msgCorreo = `Debes enviar el correo a supervisores en la fase "${
                fasePrev.nombre || fasePrev.id
              }" antes de avanzar.`
              setMensajeDeError(msgCorreo)
              showToast('warn', 'Enviar correo', msgCorreo, 5000)
              return
            }
          }
        }
      } catch (err: any) {
        console.error('Error comprobando el estado de fases previas', err)
        setMensajeDeError('No se pudo comprobar el estado de las fases anteriores.')
        return
      }
    }

    if (pendientesSupervisor.length) {
      const msg =
        `Te quedan ${pendientesSupervisor.join(
          ' y '
        )}.\n\n¿Seguro que quieres avanzar a "${
          listaDeFases[indiceDestino].nombre || `Fase ${listaDeFases[indiceDestino].id}`
        }"?`
      const ok = await confirmarAvanceConPendientes(msg)
      if (!ok) {
        setMensajeDeError('Avance cancelado por tareas pendientes')
        return
      }
    }

    setMensajeDeError(null)
    setFaseActivaId(identificadorDeFaseDestino)
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
      showToast(
        'success',
        'Correo preparado',
        `Se abrió el cliente de correo para: ${destinatario}`,
        4000
      )
      return true
    } catch (err) {
      console.error('Error abriendo mailto', err)
      showToast(
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
    data?: { fase: Fase; siguiente: Fase; completadas: string[]; matchEstado: any }
  ) {
    const info = data || pendingEnvioEstado
    if (!info) return

    const { fase, siguiente, completadas, matchEstado } = info
    const okCorreo = abrirMailto(destinatario, fase, siguiente, completadas)
    if (!okCorreo) return

    try {
      await (productosAPI as any).updateProductoById(productId, { estadoId: Number(matchEstado.id) })
      showToast(
        'success',
        'Estado actualizado',
        `Producto actualizado al estado: ${matchEstado.nombre || matchEstado.name}`,
        4000
      )

      try {
        const registros = Object.values(registrosProductosTareas)
        for (const rec of registros) {
          const keyVal = detectValidadaKey(rec)
          if (rec && rec.id) {
            await (productosFasesTareasAPI as any).updateProductosFasesTareasById(rec.id, {
              [keyVal]: 'S'
            })
          }
        }

        setCorreosEnviados((prev) => ({ ...prev, [fase.id]: true }))

        setRegistrosProductosTareas((p) => {
          const copia = { ...p }
          for (const tid of Object.keys(copia)) {
            const keyVal = detectValidadaKey(copia[Number(tid)])
            copia[Number(tid)][keyVal] = 'S'
          }
          return copia
        })
      } catch (errValida) {
        console.error('Error marcando validación de supervisor', errValida)
      }

      if (typeof onEstadoChange === 'function') {
        onEstadoChange(matchEstado.nombre || matchEstado.name || String(matchEstado.id))
      }
    } catch (errUpd: any) {
      showToast(
        'error',
        'Error',
        'No se pudo actualizar el estado del producto en el servidor.',
        6000
      )
    } finally {
      setPendingEnvioEstado(null)
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
    if (!canViewTasks) return
    if (!canUpdateTasks) return

    let faseValidadaLocal = isPhaseValidatedBySupervisorLocal(fase.id)
    try {
      const remota = await isPhaseValidatedBySupervisor(fase.id)
      if (!remota) {
        setCorreosEnviados((prev) => ({ ...prev, [fase.id]: false }))
      }
      faseValidadaLocal = remota
    } catch {
      // si la validación remota falla, usamos la local
    }

    if (correosEnviados[fase.id] && faseValidadaLocal) {
      showToast(
        'info',
        'Correo ya enviado',
        'Ya has notificado a los supervisores en esta fase.',
        3000
      )
      return
    }

    const keyDefault = detectCompletadaKey(null)
    const completadas = tareasFaseActiva
      .filter((t) => {
        const rec = registrosProductosTareas[t.id]
        return rec && String(rec[keyDefault] ?? '').toUpperCase() === 'S'
      })
      .map((t) => t.nombre || `Tarea ${t.id}`)

    const faseIndex = listaDeFases.findIndex((f) => f.id === fase.id)
    const siguiente = listaDeFases[faseIndex + 1]

    if (!siguiente) {
      showToast(
        'info',
        'Enviar notificación',
        'Esta es la última fase; no hay fase siguiente para mapear a un estado.',
        5000
      )
      console.log(
        `Notificación a supervisores: fase completada ${
          fase.nombre || fase.id
        }. Tareas completadas: ${JSON.stringify(completadas)}. No hay siguiente fase.`
      )
      return
    }

    try {
      const arrEstados =
        typeof (estadosAPI as any).findEstados === 'function'
          ? await (estadosAPI as any).findEstados()
          : await (typeof (estadosAPI as any).find === 'function'
              ? (estadosAPI as any).find()
              : [])

      const buscado = String(siguiente.nombre || siguiente.codigo || siguiente.id).toLowerCase()
      const match = arrEstados.find((e: any) => {
        const nombre = String(e.nombre || e.name || e.title || '').toLowerCase()
        const codigo = String(e.codigo || e.codigoEstado || '').toLowerCase()
        return nombre === buscado || codigo === buscado || nombre.includes(buscado)
      })

      if (!match) {
        showToast(
          'warn',
          'Estado no encontrado',
          `No se encontró un estado que coincida con la fase siguiente: "${siguiente.nombre}". No se actualizó el producto.`,
          6000
        )
        return
      }

      setPendingEnvioEstado({ fase, siguiente, completadas, matchEstado: match })

      const destinatarios = supervisorEmails
      if (destinatarios.length === 1) {
        await continuarEnvioCorreo(destinatarios[0], {
          fase,
          siguiente,
          completadas,
          matchEstado: match
        })
      } else {
        setEmailPicker({ visible: true, destinatarios, fase, siguiente, completadas })
      }
    } catch (err: any) {
      console.error('Error buscando estados', err)
      showToast(
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
    if (!canViewTasks) return
    if (!canUpdateTasks) return

    const existente = registrosProductosTareas[tarea.id]
    const keyName = detectCompletadaKey(existente)
    const prev = existente ? { ...existente } : undefined

    setUpdatingTareas((u) => ({ ...u, [tarea.id]: true }))

    try {
      let creado: any = null
      let payload: any = null

      if (existente && existente.id) {
        await (productosFasesTareasAPI as any).updateProductosFasesTareasById(existente.id, {
          [keyName]: checked ? 'S' : 'N'
        })
      } else {
        payload = {
          productoId: Number(productId),
          faseId: Number(faseActivaId),
          tareaFaseId: Number(tarea.id),
          [keyName]: checked ? 'S' : 'N'
        }
        const userId = (user as any)?.id ?? (user as any)?.usuarioId ?? (user as any)?.userId
        if (userId) payload.usuarioId = Number(userId)
        creado = await (productosFasesTareasAPI as any).createProductosFasesTareas(payload)
      }

      let mapaActual: Record<number, any> = {}
      setRegistrosProductosTareas((p) => {
        const next = { ...p }
        if (existente && existente.id) {
          next[tarea.id] = { ...(next[tarea.id] || {}), [keyName]: checked ? 'S' : 'N' }
        } else {
          const base = creado && creado.id ? creado : creado || payload || {}
          next[tarea.id] = { ...(next[tarea.id] || {}), ...base }
        }
        mapaActual = next
        return next
      })

      const todosValidados = recomputeCorreoEnviadoFlag(
        Number(faseActivaId),
        tareasFaseActiva,
        mapaActual
      )
      setCorreosEnviados((prev) => ({ ...prev, [Number(faseActivaId)]: todosValidados }))
    } catch (err: any) {
      console.error('Error guardando el estado de completada', err)
      setRegistrosProductosTareas((p) => {
        const copy = { ...p }
        if (prev) copy[tarea.id] = prev
        else delete copy[tarea.id]
        return copy
      })
      setMensajeDeError(err?.message || 'Error guardando la tarea')
    } finally {
      setUpdatingTareas((u) => ({ ...u, [tarea.id]: false }))
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
    updatingTareas,
    correosEnviados,
    emailPicker,

    // Estado auxiliar
    estaCargando,
    mensajeDeError,
    rolActivo,
    esSupervisor,

    // Permisos
    canViewTasks,
    canUpdateTasks,

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
