import React, { useEffect, useState, useCallback, useMemo } from 'react'
import estadosAPI from '../../api-endpoints/estados/index'
import productosAPI from '../../api-endpoints/productos/index'
import { useAuth } from '../../contexts/AuthContext'
import usePermisos from '../../hooks/usePermisos'
import RolesAPI from '../../api-endpoints/roles/index'
import { Toast } from 'primereact/toast'
import fasesAPI from '../../api-endpoints/fases'
import tareasFasesAPI from '../../api-endpoints/tareas-fases'
import productosFasesTareasAPI from '../../api-endpoints/productos-fases-tareas'

// Tipos locales alineados con PanelFase
type TareaFase = {
    id: number
    faseId: number
    nombre: string
}

type Fase = { id: number; codigo?: string; nombre?: string }
const emailSupervisorEnv = process.env.REACT_APP_SUPERVISOR_EMAIL

// Normaliza distintas formas de respuesta del backend a un arreglo
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

export default function PanelFasesProducto({
    productId,
    productName,
    selectedEstadoId,
    onEstadoChange,
    readOnly = false
}: {
    productId?: string | number
    productName?: string
    selectedEstadoId?: string | number
    onEstadoChange?: (nuevoNombre: string) => void
    readOnly?: boolean
}) {
    // -------------------------------
    // Estado local y referencias
    // -------------------------------
    const [listaDeFases, establecerListaDeFases] = useState<Fase[]>([])
    const [identificadorDeFaseActiva, establecerIdentificadorDeFaseActiva] = useState<number | null>(null)
    const [tareasDeLaFaseActiva, establecerTareasDeLaFaseActiva] = useState<TareaFase[]>([])
    const [estaCargando, establecerEstaCargando] = useState(false)
    const [mensajeDeError, establecerMensajeDeError] = useState<string | null>(null)
    const [registrosProductosTareas, establecerRegistrosProductosTareas] = useState<Record<number, any>>({})
    const [updatingTareas, setUpdatingTareas] = useState<Record<number, boolean>>({})
    const [correosEnviados, setCorreosEnviados] = useState<Record<number, boolean>>({})
    const [emailPicker, setEmailPicker] = useState<{ visible: boolean; destinatarios: string[]; fase: Fase | null; siguiente: Fase | undefined; completadas: string[] }>({
        visible: false,
        destinatarios: [],
        fase: null,
        siguiente: undefined,
        completadas: []
    })
    const [pendingEnvioEstado, setPendingEnvioEstado] = useState<{ fase: Fase; siguiente: Fase; completadas: string[]; matchEstado: any } | null>(null)
    const { user } = useAuth()
    const { hasPermission } = usePermisos()
    const [toast, setToast] = useState<any>(null)
    const [rolActivo, setRolActivo] = useState<boolean | null>(null)

    // compact toast helper
    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail = '', life = 4000) => void (toast && toast.show && toast.show({ severity, summary, detail, life }))

    useEffect(() => {
        let mounted = true
        const comprobarRol = async () => {
            try {
                let rolId = (user as any)?.rolId
                if (!rolId) {
                    try { rolId = JSON.parse(localStorage.getItem('user') || '{}').rolId } catch { /* ignore */ }
                }
                if (!rolId) { if (mounted) setRolActivo(true); return }
                const rol = await RolesAPI.getRoleById(rolId)
                const activo = rol?.activoSn ?? rol?.activoSN ?? rol?.activo ?? 'S'
                if (mounted) setRolActivo(String(activo).toUpperCase() === 'S')
            } catch (err) {
                if (mounted) setRolActivo(true)
            }
        }
        comprobarRol()
        return () => { mounted = false }
    }, [user])

    // Compatibilidad: algunos roles usan el recurso 'TareasFase' y otros 'TareasProducto'
    // Además permitimos ver las fases si el usuario tiene permisos generales sobre Productos
    // (por ejemplo 'Productos:Ver' o 'Productos:Actualizar') para evitar ocultar las fases
    // cuando el rol solo tiene permisos a nivel de producto.
    const canViewTasks = (
        hasPermission('TareasProducto', 'Ver') ||
        hasPermission('TareasFase', 'Ver') ||
        hasPermission('Productos', 'Ver') ||
        hasPermission('Productos', 'Actualizar')
    )
    const canUpdateTasks = !readOnly && (hasPermission('TareasProducto', 'Actualizar') || hasPermission('TareasFase', 'Actualizar'))

    useEffect(() => {
        let componenteMontado = true
        ;(async () => {
            try {
                // Helper para invocar la API de fases (variantes findFases o find)
                const invokeFind = async (params?: any) => {
                    if (typeof (fasesAPI as any).findFases === 'function') return await (fasesAPI as any).findFases(params)
                    if (typeof (fasesAPI as any).find === 'function') return await (fasesAPI as any).find(params)
                    return []
                }

                // Petición simple: obtener la lista y, si viene en orden inverso, invertirla aquí
                let listaRemota: any = await invokeFind().catch(() => [])
                const lista = normalizarListaFases(listaRemota)
                if (!componenteMontado) return
                const listaInvertida = Array.isArray(lista) ? lista.slice().reverse() : []
                const listaMapeada: Fase[] = listaInvertida.map((fase: any) => ({ id: Number(fase.id), codigo: fase.codigo, nombre: fase.nombre }))
                establecerListaDeFases(listaMapeada)
                if (!listaMapeada.length) return
                // mapear selectedEstadoId a fase (fallback a primera)
                if (selectedEstadoId !== undefined && selectedEstadoId !== null) {
                    try {
                        const estadoRemoto = typeof (estadosAPI as any).getEstadoById === 'function' ? await (estadosAPI as any).getEstadoById(selectedEstadoId) : null
                        const nombreEstado = estadoRemoto ? (estadoRemoto.nombre || estadoRemoto.name || '') : ''
                        const buscado = String(nombreEstado || selectedEstadoId).toLowerCase()
                        const match = listaMapeada.find((fase) => {
                            const codigo = String(fase.codigo || '').toLowerCase()
                            const nombreFase = String(fase.nombre || '').toLowerCase()
                            return codigo === buscado || nombreFase.includes(buscado) || String(fase.id) === String(selectedEstadoId)
                        })
                        establecerIdentificadorDeFaseActiva(match ? match.id : listaMapeada[0].id)
                    } catch {
                        establecerIdentificadorDeFaseActiva(listaMapeada[0].id)
                    }
                } else {
                    establecerIdentificadorDeFaseActiva(listaMapeada[0].id)
                }
            } catch (error: any) {
                if (componenteMontado) establecerMensajeDeError(error?.message || 'Error cargando fases')
            }
        })()
        return () => { componenteMontado = false }
    }, [selectedEstadoId])

    // Cambio directo de fase activa y recarga de tareas
    // Ahora valida de forma secuencial: no permite saltar a una fase si alguna fase previa
    // no está completamente completada para este producto.
    async function cambiarAFase(identificadorDeFaseDestino: number) {
        if (readOnly) return
        // Si es la misma, no hacemos nada
        if (identificadorDeFaseDestino === identificadorDeFaseActiva) return

        // encontrar índices
        const indiceDestino = listaDeFases.findIndex(f => f.id === identificadorDeFaseDestino)
        const indiceActual = listaDeFases.findIndex(f => f.id === identificadorDeFaseActiva)
        if (indiceDestino === -1) {
            establecerMensajeDeError('Fase no encontrada')
            return
        }

        // comprobar cada fase previa (0 .. indiceDestino-1)
        const pendientesSupervisor: string[] = []
        for (let i = 0; i < indiceDestino; i++) {
            const fasePrev = listaDeFases[i]
            try {
                const completada = await isPhaseFullyCompleted(fasePrev.id)
                if (!completada) {
                    if (isSupervisor && indiceDestino > indiceActual) {
                        const pendientes = await contarPendientesFase(fasePrev.id)
                        pendientesSupervisor.push(`${pendientes} pendientes en ${fasePrev.nombre || `Fase ${fasePrev.id}`}`)
                    } else {
                        establecerMensajeDeError(`No puedes pasar a la fase "${listaDeFases[indiceDestino].nombre}": la fase "${fasePrev.nombre || fasePrev.id}" no está completada.`)
                        return
                    }
                }
                const emailObligatorio = indiceActual === -1 ? true : i >= indiceActual
                if (emailObligatorio) {
                    const faseValidada = await isPhaseValidatedBySupervisor(fasePrev.id)
                    if (!faseValidada || !correosEnviados[fasePrev.id]) {
                        if (isSupervisor && indiceDestino > indiceActual) {
                            const pendientes = pendientesSupervisor.length ? pendientesSupervisor.join(', ') : `Pendiente validar correo en ${fasePrev.nombre || fasePrev.id}`
                            pendientesSupervisor.push(pendientes)
                        } else {
                            const mensaje = `Debes enviar el correo a supervisores en la fase "${fasePrev.nombre || fasePrev.id}" antes de avanzar.`
                            establecerMensajeDeError(mensaje)
                            showToast('warn', 'Enviar correo', mensaje, 5000)
                            return
                        }
                    }
                }
            } catch (err: any) {
                console.error('Error comprobando completitud de fase previa', err)
                establecerMensajeDeError('No se pudo comprobar el estado de fases previas')
                return
            }
        }

        if (pendientesSupervisor.length) {
            const msg = `Te quedan ${pendientesSupervisor.join(' y ')}. ¿Seguro que quieres avanzar a "${listaDeFases[indiceDestino].nombre || `Fase ${listaDeFases[indiceDestino].id}`}?"`
            const ok = typeof window !== 'undefined' ? window.confirm(msg) : false
            if (!ok) {
                establecerMensajeDeError('Avance cancelado por tareas pendientes')
                return
            }
        }

        // todas las previas están completas -> cambiar
        if (isSupervisor && indiceActual !== -1 && indiceDestino < indiceActual) {
            await resetearTareasFase(identificadorDeFaseDestino)
            setCorreosEnviados(prev => ({ ...prev, [identificadorDeFaseDestino]: false }))
        }
        establecerMensajeDeError(null)
        establecerIdentificadorDeFaseActiva(identificadorDeFaseDestino)
    }

    // Comprueba si una fase (por id) está completamente completada para el current productId
    async function isPhaseFullyCompleted(faseId: number) {
        // obtener tareas de la fase
        const paramsT = { filter: JSON.stringify({ where: { faseId: Number(faseId) } }) }
        const resultadoT = await (tareasFasesAPI as any).findTareasFases(paramsT)
        const tareas = Array.isArray(resultadoT) ? resultadoT : []
        if (!tareas.length) return true // si no hay tareas, consideramos completada

        // obtener registros productos_fases_tareas para ese producto y fase
        const filtro = { filter: JSON.stringify({ where: { productoId: Number(productId), faseId: Number(faseId) } }) }
        const resultadoRp = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
        const rp = Array.isArray(resultadoRp) ? resultadoRp : []
        const mapa: Record<number, any> = {}
        for (const r of rp) {
            const tareaId = Number(r.tareaFaseId)
            if (!Number.isNaN(tareaId)) mapa[tareaId] = r
        }

        // para cada tarea esperada, debe existir registro y estar marcado 'S'
        for (const t of tareas) {
            const r = mapa[Number((t as any).id)]
            if (!r) return false
            const key = detectCompletadaKey(r)
            if (String(r[key] ?? '').toUpperCase() !== 'S') return false
        }
        return true
    }

    // Comprueba si la fase tiene todas las tareas validadas por supervisor
    async function isPhaseValidatedBySupervisor(faseId: number) {
        const filtro = { filter: JSON.stringify({ where: { productoId: Number(productId), faseId: Number(faseId) } }) }
        const resultado = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
        const registros = Array.isArray(resultado) ? resultado : []
        if (!registros.length) return false
        for (const r of registros) {
            const keyVal = detectValidadaKey(r)
            if (String(r[keyVal] ?? '').toUpperCase() !== 'S') return false
        }
        return true
    }

    const cargarTareasPorFase = useCallback(async (identificadorDeFase: number) => {
        establecerEstaCargando(true)
        establecerMensajeDeError(null)
        try {
            const parametros = { filter: JSON.stringify({ where: { faseId: Number(identificadorDeFase) } }) }
            const resultado = await (tareasFasesAPI as any).findTareasFases(parametros)
            const arreglo = Array.isArray(resultado) ? resultado : []
            const mapeadas: TareaFase[] = arreglo.map((t: any) => ({ id: Number(t.id), faseId: Number(t.faseId), nombre: t.nombre }))
            establecerTareasDeLaFaseActiva(mapeadas)
            // Cargar registros existentes para este producto y fase
            try {
                const filtro = { filter: JSON.stringify({ where: { productoId: Number(productId), faseId: Number(identificadorDeFase) } }) }
                const rp = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
                const arrRp = Array.isArray(rp) ? rp : []
                const mapa: Record<number, any> = {}
                for (const r of arrRp) {
                    const tareaId = Number(r.tareaFaseId)
                    if (!Number.isNaN(tareaId)) mapa[tareaId] = r
                }
                establecerRegistrosProductosTareas(mapa)
                const todosValidados = recomputeCorreoEnviadoFlag(identificadorDeFase, mapeadas, mapa)
                setCorreosEnviados(prev => ({ ...prev, [identificadorDeFase]: todosValidados }))
            } catch (err) {
                console.error('Error cargando registros productos_fases_tareas', err)
            }
        } catch (error: any) {
            console.error('Error cargando tareas por fase', error)
            establecerMensajeDeError(error?.message || 'Error cargando tareas de la fase')
        } finally {
            establecerEstaCargando(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId])

    // -------------------------------
    // Helpers para detectar campos dinamicos del backend
    // -------------------------------
    const detectCompletadaKey = (rec: any) => (rec ? Object.keys(rec).find(k => /complet/i.test(k)) : undefined) || 'completadaSn'
    const detectValidadaKey = (rec: any) => (rec ? Object.keys(rec).find(k => /validada|supervisor/i.test(k)) : undefined) || 'validadaSupervisrSN'

    const supervisorEmails = useMemo(() => {
        const posibles = [
            emailSupervisorEnv,
            (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_SUPERVISOR_EMAIL) || undefined,
            (typeof window !== 'undefined' && (window as any).process?.env?.REACT_APP_SUPERVISOR_EMAIL) || undefined,
            (typeof window !== 'undefined' && (window as any).process?.env?.NEXT_PUBLIC_SUPERVISOR_EMAIL) || undefined
        ].filter(Boolean) as string[]
        const raw = posibles.length ? posibles[0] : ''
        return raw
            .split(/[;,]/)
            .map(e => e.trim())
            .filter(e => e)
    }, [])

    // Valida en memoria si todas las tareas de la fase tienen registro y validación supervisor en 'S'
    const isPhaseValidatedBySupervisorLocal = useCallback((faseId: number) => {
        const tareas = tareasDeLaFaseActiva
        if (!Array.isArray(tareas) || tareas.length === 0) return false
        for (const t of tareas) {
            if (Number(t.faseId) !== Number(faseId)) continue
            const rec = registrosProductosTareas[t.id]
            const keyVal = detectValidadaKey(rec)
            if (!rec || String(rec[keyVal] ?? '').toUpperCase() !== 'S') return false
        }
        return true
    }, [tareasDeLaFaseActiva, registrosProductosTareas])

    const recomputeCorreoEnviadoFlag = useCallback((faseId: number, tareas: TareaFase[], registros: Record<number, any>) => {
        if (!Array.isArray(tareas) || tareas.length === 0) return false
        return tareas.every(t => {
            if (Number(t.faseId) !== Number(faseId)) return true
            const rec = registros[t.id]
            const keyVal = detectValidadaKey(rec)
            return rec && String(rec[keyVal] ?? '').toUpperCase() === 'S'
        })
    }, [])

    // -------------------------------
    // Resolucion de rol supervisor y conteos de tareas pendientes
    // -------------------------------
    const isSupervisor = (() => {
        try {
            const posibles = [
                (user as any)?.rol?.nombre,
                (user as any)?.rol?.name,
                (user as any)?.rol?.descripcion,
                (user as any)?.role?.nombre,
                (user as any)?.role?.name,
                (user as any)?.role?.descripcion,
            ].filter(Boolean)
            let nombreRol = posibles.length ? String(posibles[0]) : ''
            if (!nombreRol && typeof window !== 'undefined') {
                try {
                    const stored = localStorage.getItem('user')
                    if (stored) {
                        const parsed = JSON.parse(stored)
                        nombreRol =
                            parsed?.rol?.nombre ||
                            parsed?.rol?.descripcion ||
                            parsed?.role?.nombre ||
                            parsed?.role?.descripcion ||
                            ''
                    }
                } catch { /* ignore */ }
            }
            return String(nombreRol || '').toLowerCase().includes('supervisor')
        } catch { return false }
    })()

    // Cuenta tareas pendientes (no completadas) en una fase para el producto actual
    const contarPendientesFase = useCallback(async (faseId: number) => {
        const paramsT = { filter: JSON.stringify({ where: { faseId: Number(faseId) } }) }
        const resultadoT = await (tareasFasesAPI as any).findTareasFases(paramsT)
        const tareas = Array.isArray(resultadoT) ? resultadoT : []
        if (!tareas.length) return 0
        const filtro = { filter: JSON.stringify({ where: { productoId: Number(productId), faseId: Number(faseId) } }) }
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
    }, [productId])

    const resetearTareasFase = useCallback(async (faseId: number) => {
        try {
            const paramsT = { filter: JSON.stringify({ where: { faseId: Number(faseId) } }) }
            const tareas = await (tareasFasesAPI as any).findTareasFases(paramsT)
            const arreglo = Array.isArray(tareas) ? tareas : []
            for (const t of arreglo) {
                const filtro = { filter: JSON.stringify({ where: { productoId: Number(productId), faseId: Number(faseId), tareaFaseId: Number((t as any).id) } }) }
                const existentes = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
                const arrEx = Array.isArray(existentes) ? existentes : []
                const keyComp = detectCompletadaKey(arrEx[0])
                const keyVal = detectValidadaKey(arrEx[0])
                if (arrEx.length) {
                    for (const ex of arrEx) {
                        await (productosFasesTareasAPI as any).updateProductosFasesTareasById(ex.id, { [keyComp]: 'N', [keyVal]: 'N' })
                    }
                } else {
                    const payload: any = { productoId: Number(productId), faseId: Number(faseId), tareaFaseId: Number((t as any).id), [keyComp]: 'N', [keyVal]: 'N' }
                    await (productosFasesTareasAPI as any).createProductosFasesTareas(payload)
                }
            }
            // limpiar cache local
            establecerRegistrosProductosTareas(p => {
                const copia = { ...p }
                arreglo.forEach((t: any) => {
                    const tid = Number(t.id)
                    if (!Number.isNaN(tid) && copia[tid]) {
                        const keyComp = detectCompletadaKey(copia[tid])
                        const keyVal = detectValidadaKey(copia[tid])
                        copia[tid][keyComp] = 'N'
                        copia[tid][keyVal] = 'N'
                    }
                })
                return copia
            })
        } catch (err) {
            console.error('No se pudieron resetear tareas de la fase', err)
        }
    }, [productId])

    useEffect(() => {
        if (identificadorDeFaseActiva) cargarTareasPorFase(identificadorDeFaseActiva)
    }, [identificadorDeFaseActiva, cargarTareasPorFase])

    if (!productId) return null

    // -------------------------------
    // Correo y estado de validacion
    // -------------------------------
    const abrirMailto = (destinatario: string, fase: Fase, siguiente: Fase | undefined, completadas: string[]) => {
        const asunto = siguiente
            ? `Producto ${productName?.toString()} - Fase completada: ${fase.nombre || fase.id}`
            : `Producto ${productName?.toString()} - Ultima fase completada: ${fase.nombre || fase.id}`
        const cuerpoLineas = [
            `Producto: ${productName}`,
            `Fase completada: ${fase.nombre}`,
            `Tareas completadas: ${completadas.join(', ') || 'N/A'}`,
            siguiente ? `Proxima fase: ${siguiente.nombre || siguiente.id}` : 'No hay fase siguiente',
            `Dia de notificacion: ${new Date().toLocaleString()}`,
        ]
        const mailto = `mailto:${encodeURIComponent(destinatario)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpoLineas.join('\n'))}`
        try {
            window.location.href = mailto
            showToast('success', 'Correo preparado', `Se abrió el cliente de correo para: ${destinatario}`, 4000)
            return true
        } catch (err) {
            console.error('Error abriendo mailto', err)
            showToast('warn', 'Aviso', 'No se pudo abrir el correo. Comprueba tu cliente de email.', 5000)
            return false
        }
    }

    const continuarEnvioCorreo = async (destinatario: string, data?: { fase: Fase; siguiente: Fase; completadas: string[]; matchEstado: any }) => {
        const info = data || pendingEnvioEstado
        if (!info) return
        const { fase, siguiente, completadas, matchEstado } = info
        const okCorreo = abrirMailto(destinatario, fase, siguiente, completadas)
        if (!okCorreo) return
        try {
            await (productosAPI as any).updateProductoById(productId, { estadoId: Number(matchEstado.id) })
            showToast('success', 'Estado actualizado', `Producto actualizado al estado: ${matchEstado.nombre || matchEstado.name}`, 4000)
            try {
                const registros = Object.values(registrosProductosTareas)
                for (const rec of registros) {
                    const keyVal = detectValidadaKey(rec)
                    if (rec && rec.id) {
                        await (productosFasesTareasAPI as any).updateProductosFasesTareasById(rec.id, { [keyVal]: 'S' })
                    }
                }
                setCorreosEnviados(prev => ({ ...prev, [fase.id]: true }))
                establecerRegistrosProductosTareas(p => {
                    const copia = { ...p }
                    for (const tid of Object.keys(copia)) {
                        const keyVal = detectValidadaKey(copia[Number(tid)])
                        copia[Number(tid)][keyVal] = 'S'
                    }
                    return copia
                })
            } catch (errValida) {
                console.error('Error marcando validacion supervisor', errValida)
            }
            if (typeof onEstadoChange === 'function') onEstadoChange(matchEstado.nombre || matchEstado.name || String(matchEstado.id))
        } catch (errUpd: any) {
            showToast('error', 'Error', 'No se pudo actualizar el estado del producto en el servidor.', 6000)
        } finally {
            setPendingEnvioEstado(null)
            setEmailPicker({ visible: false, destinatarios: [], fase: null, siguiente: undefined, completadas: [] })
        }
    }


    async function sendToSupervisors(fase: Fase) {
        // Only operate on active phase (we only have tasks loaded for it)
        if (fase.id !== identificadorDeFaseActiva) return
        let faseValidadaLocal = isPhaseValidatedBySupervisorLocal(fase.id)
        // Revalidar contra backend por si se añadieron tareas nuevas tras el último envío
        try {
            const remota = await isPhaseValidatedBySupervisor(fase.id)
            if (!remota) {
                setCorreosEnviados(prev => ({ ...prev, [fase.id]: false }))
            }
            faseValidadaLocal = remota
        } catch (e) {
            // si falla, seguimos con la validación local
        }
        if (correosEnviados[fase.id] && faseValidadaLocal) {
            showToast('info', 'Correo ya enviado', 'Ya notificaste a los supervisores en esta fase.', 3000)
            return
        }
        const keyDefault = detectCompletadaKey(null)
        const completadas = tareasDeLaFaseActiva
            .filter(t => {
                const rec = registrosProductosTareas[t.id]
                return rec && String(rec[keyDefault] ?? '').toUpperCase() === 'S'
            })
            .map(t => t.nombre || `Tarea ${t.id}`)
        const faseIndex = listaDeFases.findIndex(f => f.id === fase.id)
        const siguiente = listaDeFases[faseIndex + 1]

        // Informational fallback if it's the last phase
        if (!siguiente) {
            showToast('info', 'Enviar notificacion', 'Esta es la ultima fase; no hay fase siguiente para mapear a un Estado.', 5000)
            console.log(`Enviar mail a Supervisores: Fase completada: ${fase.nombre || fase.id}. Tareas completadas: ${JSON.stringify(completadas)}. No hay siguiente fase.`)
            return
        }

        // Buscar en la lista de estados uno que coincida con la siguiente fase
        try {
            const arrEstados = typeof (estadosAPI as any).findEstados === 'function'
                ? await (estadosAPI as any).findEstados()
                : await (typeof (estadosAPI as any).find === 'function' ? (estadosAPI as any).find() : [])
            const buscado = String(siguiente.nombre || siguiente.codigo || siguiente.id).toLowerCase()
            const match = arrEstados.find((e: any) => {
                const nombre = String(e.nombre || e.name || e.title || '').toLowerCase()
                const codigo = String(e.codigo || e.codigoEstado || '').toLowerCase()
                return nombre === buscado || codigo === buscado || nombre.includes(buscado)
            })

            if (!match) {
                showToast('warn', 'Estado no encontrado', `No se encontro un Estado que coincida con la fase siguiente: "${siguiente.nombre}". Ningun cambio en el producto.`, 6000)
                return
            }
            // Esperar a elegir correo antes de actualizar estado
            setPendingEnvioEstado({ fase, siguiente, completadas, matchEstado: match })
            const destinatarios = supervisorEmails
            if (destinatarios.length === 1) {
                continuarEnvioCorreo(destinatarios[0], { fase, siguiente, completadas, matchEstado: match })
            } else {
                setEmailPicker({ visible: true, destinatarios, fase, siguiente, completadas })
            }
        } catch (err: any) {
            console.error('Error buscando estados', err)
            showToast('error', 'Error', 'No se pudieron consultar los estados para mapear la siguiente fase.', 6000)
        }
    }

async function toggleCompletada(tarea: TareaFase, checked: boolean) {
        const existente = registrosProductosTareas[tarea.id]
        const keyName = detectCompletadaKey(existente)
        const prev = existente ? { ...existente } : undefined
        setUpdatingTareas(u => ({ ...u, [tarea.id]: true }))

        try {
            let creado: any = null
            let payload: any = null
            if (existente && existente.id) {
                await (productosFasesTareasAPI as any).updateProductosFasesTareasById(existente.id, { [keyName]: checked ? 'S' : 'N' })
            } else {
                payload = { productoId: Number(productId), faseId: Number(identificadorDeFaseActiva), tareaFaseId: Number(tarea.id), [keyName]: checked ? 'S' : 'N' }
                const userId = (user as any)?.id ?? (user as any)?.usuarioId ?? (user as any)?.userId
                if (userId) payload.usuarioId = Number(userId)
                creado = await (productosFasesTareasAPI as any).createProductosFasesTareas(payload)
            }
            let mapaActual: Record<number, any> = {}
            establecerRegistrosProductosTareas(p => {
                const next = { ...p }
                if (existente && existente.id) {
                    next[tarea.id] = { ...(next[tarea.id] || {}), [keyName]: checked ? 'S' : 'N' }
                } else {
                    const base = creado && creado.id ? creado : (creado || payload || {})
                    next[tarea.id] = { ...(next[tarea.id] || {}), ...base }
                }
                mapaActual = next
                return next
            })
            const todosValidados = recomputeCorreoEnviadoFlag(Number(identificadorDeFaseActiva), tareasDeLaFaseActiva, mapaActual)
            setCorreosEnviados(prev => ({ ...prev, [Number(identificadorDeFaseActiva)]: todosValidados }))
        } catch (err: any) {
            console.error('Error guardando completada', err)
            establecerRegistrosProductosTareas(p => {
                const copy = { ...p }
                if (prev) copy[tarea.id] = prev
                else delete copy[tarea.id]
                return copy
            })
            establecerMensajeDeError(err?.message || 'Error guardando tarea')
        } finally {
            setUpdatingTareas(u => ({ ...u, [tarea.id]: false }))
        }

        // No avanzamos automáticamente ni notificamos aquí. El avance/actualización del estado
        // se realizará solo cuando el usuario pulse el botón "Enviar correo a Supervisores".
    }

    return (
        <div style={{ marginTop: 18, borderTop: '1px solid #eee', paddingTop: 12 }}>

            <Toast ref={setToast} />

            {estaCargando && <div>Cargando...</div>}
            {mensajeDeError && <div style={{ color: 'red' }}>{mensajeDeError}</div>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                        {listaDeFases.map((fase, indice) => {
                                const estaActiva = identificadorDeFaseActiva === fase.id
                                return (
                                    <React.Fragment key={fase.id}>
                                        <div
                                            onClick={() => {
                                                if (readOnly) return
                                                cambiarAFase(fase.id)
                                            }}
                                            style={{
                                                cursor: readOnly ? 'default' : 'pointer',
                                                fontWeight: estaActiva ? 700 : 600,
                                                color: estaActiva ? '#0f172a' : '#374151',
                                                padding: '6px 8px',
                                                background: 'transparent',
                                                borderRadius: 4,
                                                opacity: readOnly && !estaActiva ? 0.7 : 1
                                            }}
                                            aria-current={estaActiva}
                                        >
                                            {fase.nombre || `Fase ${fase.id}`}
                                        </div>
                                        {indice < listaDeFases.length - 1 && (
                                            <span style={{ width: 1, height: 18, background: '#e6e6e6', display: 'inline-block', marginLeft: 6, marginRight: 6 }} />
                                        )}
                                    </React.Fragment>
                                )
                            })}
                    </div>

            <div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {/* Mostrar tareas solo si tiene permiso de ver y rol activo */}
                    {(!canViewTasks || rolActivo === false) ? (
                        <div style={{ padding: 12, color: '#6c757d' }}>No tienes permiso para ver las tareas de este producto.</div>
                    ) : (
                        identificadorDeFaseActiva ? (
                            tareasDeLaFaseActiva.map((tarea, indice) => {
                                const registro = registrosProductosTareas[tarea.id]
                                const keyName = detectCompletadaKey(registro)
                                const checked = registro ? String(registro[keyName] ?? '').toUpperCase() === 'S' : false
                                const updating = updatingTareas[tarea.id] === true
                                return (
                                    <li key={tarea.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                minWidth: 30,
                                                height: 30,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#007bff',
                                                color: 'white',
                                                borderRadius: '50%',
                                                fontSize: '0.9em',
                                                fontWeight: 'bold'
                                            }}>
                                                {indice + 1}
                                            </div>
                                            <div style={{ fontWeight: 600 }}>{tarea.nombre || `Tarea ${tarea.id}`}</div>
                                        </div>
                                        <div>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={updating || !canUpdateTasks}
                                                onChange={(e) => {
                                                    if (!canUpdateTasks) {
                                                        showToast('warn', 'Permisos', 'No tienes permiso para actualizar tareas', 3000)
                                                        return
                                                    }
                                                    toggleCompletada(tarea, e.target.checked)
                                                }}
                                            />
                                        </div>
                                    </li>
                                )
                            })
                        ) : null
                    )}
                </ul>
                {/* Global action button under tasks */}
                {identificadorDeFaseActiva && canViewTasks && (() => {
                    const allCheckedActive = tareasDeLaFaseActiva.length > 0 && tareasDeLaFaseActiva.every(t => {
                        const rec = registrosProductosTareas[t.id]
                        const key = detectCompletadaKey(rec)
                        return rec && String(rec[key] ?? '').toUpperCase() === 'S'
                    })
                const faseActiva = listaDeFases.find(f => f.id === identificadorDeFaseActiva)
                const canClickSend = allCheckedActive && canUpdateTasks && !correosEnviados[identificadorDeFaseActiva]
                return (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                            <button
                                onClick={() => {
                                    if (!canUpdateTasks) { showToast('warn', 'Permisos', 'No tienes permiso para enviar notificaciones', 3000); return }
                                    if (faseActiva) sendToSupervisors(faseActiva)
                                }}
                                disabled={!canClickSend}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 8,
                                    background: canClickSend ? '#16a34a' : '#9ca3af',
                                    color: 'white',
                                    border: 'none',
                                    boxShadow: canClickSend ? '0 4px 12px rgba(16,185,129,0.2)' : 'none',
                                    cursor: canClickSend ? 'pointer' : 'not-allowed',
                                    opacity: canUpdateTasks ? 1 : 0.8
                                }}
                            >
                                {correosEnviados[identificadorDeFaseActiva] ? 'Correo enviado' : 'Enviar correo a Supervisores'}
                            </button>
                            {emailPicker.visible && emailPicker.destinatarios.length > 1 && (
                                <div
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'rgba(0,0,0,0.35)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 9999
                                    }}
                                >
                                    <div style={{ background: '#fff', borderRadius: 12, padding: 18, width: '90%', maxWidth: 420, boxShadow: '0 12px 32px rgba(0,0,0,0.22)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <div style={{ fontWeight: 700, fontSize: 17, color: '#0f172a' }}>Elige destinatario</div>
                                            <button
                                                onClick={() => setEmailPicker({ visible: false, destinatarios: [], fase: null, siguiente: undefined, completadas: [] })}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, lineHeight: '18px' }}
                                                aria-label="Cerrar selector de email"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {emailPicker.destinatarios.map((dest) => (
                                                <button
                                                    key={dest}
                                                    onClick={() => {
                                                        if (!emailPicker.fase || !pendingEnvioEstado) return
                                                        continuarEnvioCorreo(dest, pendingEnvioEstado)
                                                    }}
                                                    style={{
                                                        padding: '12px 14px',
                                                        borderRadius: 10,
                                                        border: '1px solid #d1d5db',
                                                        background: '#f8fafc',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {dest}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setEmailPicker({ visible: false, destinatarios: [], fase: null, siguiente: undefined, completadas: [] })}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: 10,
                                                    border: 'none',
                                                    background: '#e5e7eb',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })()}
            </div>
        </div>
    )
}
