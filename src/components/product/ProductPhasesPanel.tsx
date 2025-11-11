import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import usePermisos from '../../hooks/usePermisos'
import RolesAPI from '../../api-endpoints/roles/index'
import { Toast } from 'primereact/toast'

// Adaptadores (API) con imports arriba para buenas prácticas
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

export default function PanelFasesProducto({ productId }: { productId?: string | number }) {
    const [listaDeFases, establecerListaDeFases] = useState<Fase[]>([])
    const [identificadorDeFaseActiva, establecerIdentificadorDeFaseActiva] = useState<number | null>(null)
    const [tareasDeLaFaseActiva, establecerTareasDeLaFaseActiva] = useState<TareaFase[]>([])
    const [estaCargando, establecerEstaCargando] = useState(false)
    const [mensajeDeError, establecerMensajeDeError] = useState<string | null>(null)
    const [registrosProductosTareas, establecerRegistrosProductosTareas] = useState<Record<number, any>>({})
    const [updatingTareas, setUpdatingTareas] = useState<Record<number, boolean>>({})
    const { user } = useAuth()
    const { hasPermission } = usePermisos()
    const [toast, setToast] = useState<any>(null)
    const [rolActivo, setRolActivo] = useState<boolean | null>(null)

    useEffect(() => {
        let mounted = true
        const comprobarRol = async () => {
            try {
                let rolId: any = undefined
                if (user && (user as any).rolId) rolId = (user as any).rolId
                else {
                    try {
                        const stored = localStorage.getItem('user')
                        if (stored) {
                            const parsed = JSON.parse(stored)
                            rolId = parsed?.rolId || parsed?.rol || (Array.isArray(parsed?.roles) ? parsed.roles[0] : undefined)
                        }
                    } catch (e) {}
                }
                if (!rolId) {
                    if (mounted) setRolActivo(true)
                    return
                }
                const rol = await RolesAPI.getRoleById(rolId)
                const activo = rol?.activoSn ?? rol?.activoSN ?? rol?.activo ?? 'S'
                if (mounted) setRolActivo(String(activo).toUpperCase() === 'S')
            } catch (err) {
                console.warn('No se pudo comprobar el estado del rol, asumiendo activo', err)
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
    const canUpdateTasks = hasPermission('TareasProducto', 'Actualizar') || hasPermission('TareasFase', 'Actualizar')

    useEffect(() => {
        let componenteMontado = true
        ;(async () => {
            try {
                const listaRemota = typeof (fasesAPI as any).findFases === 'function'
                    ? await (fasesAPI as any).findFases()
                    : await (typeof (fasesAPI as any).find === 'function' ? (fasesAPI as any).find() : [])
                if (!componenteMontado) return
                const listaMapeada: Fase[] = (Array.isArray(listaRemota) ? listaRemota : []).map((fase: any) => ({ id: Number(fase.id), codigo: fase.codigo, nombre: fase.nombre }))
                establecerListaDeFases(listaMapeada)
                if (listaMapeada.length) establecerIdentificadorDeFaseActiva(listaMapeada[0].id)
            } catch (error: any) {
                console.error(error)
                if (componenteMontado) establecerMensajeDeError(error?.message || 'Error cargando fases')
            }
        })()
        return () => { componenteMontado = false }
    }, [])

    // Cambio directo de fase activa y recarga de tareas
    // Ahora valida de forma secuencial: no permite saltar a una fase si alguna fase previa
    // no está completamente completada para este producto.
    async function cambiarAFase(identificadorDeFaseDestino: number) {
        // Si es la misma, no hacemos nada
        if (identificadorDeFaseDestino === identificadorDeFaseActiva) return

        // encontrar índices
        const indiceDestino = listaDeFases.findIndex(f => f.id === identificadorDeFaseDestino)
        if (indiceDestino === -1) {
            establecerMensajeDeError('Fase no encontrada')
            return
        }

        // comprobar cada fase previa (0 .. indiceDestino-1)
        for (let i = 0; i < indiceDestino; i++) {
            const fasePrev = listaDeFases[i]
            try {
                const completada = await isPhaseFullyCompleted(fasePrev.id)
                if (!completada) {
                    establecerMensajeDeError(`No puedes pasar a la fase "${listaDeFases[indiceDestino].nombre}": la fase "${fasePrev.nombre || fasePrev.id}" no está completada.`)
                    return
                }
            } catch (err: any) {
                console.error('Error comprobando completitud de fase previa', err)
                establecerMensajeDeError('No se pudo comprobar el estado de fases previas')
                return
            }
        }

        // todas las previas están completas -> cambiar
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
            } catch (err) {
                console.error('Error cargando registros productos_fases_tareas', err)
            }
        } catch (error: any) {
            console.error('Error cargando tareas por fase', error)
            establecerMensajeDeError(error?.message || 'Error cargando tareas de la fase')
        } finally {
            establecerEstaCargando(false)
        }
    }, [productId])

    useEffect(() => {
        if (identificadorDeFaseActiva) cargarTareasPorFase(identificadorDeFaseActiva)
    }, [identificadorDeFaseActiva, cargarTareasPorFase])

    if (!productId) return null

    // helper to find the completada key name in an existing record
    // Use camel-case 'completadaSn' as the default because backend validation is strict
    const detectCompletadaKey = (rec: any) => (rec ? Object.keys(rec).find(k => /complet/i.test(k)) || 'completadaSn' : 'completadaSn')
    
        function gatherCompletedTasksForPhase(faseId: number) {
            if (faseId !== identificadorDeFaseActiva) return []
            const key = detectCompletadaKey(null) // default key
            return tareasDeLaFaseActiva.filter(t => {
                const rec = registrosProductosTareas[t.id]
                return rec && String(rec[key] ?? '').toUpperCase() === 'S'
            }).map(t => t.nombre || `Tarea ${t.id}`)
        }
    
        function sendToSupervisors(fase: Fase) {
            // Only operate on active phase (we only have tasks loaded for it)
            if (fase.id !== identificadorDeFaseActiva) return
            const completadas = gatherCompletedTasksForPhase(fase.id)
            const faseIndex = listaDeFases.findIndex(f => f.id === fase.id)
            const siguiente = listaDeFases[faseIndex + 1]
            const siguienteTxt = siguiente ? `${siguiente.nombre || `Fase ${siguiente.id}`} (id:${siguiente.id})` : 'ninguna (es la última fase)'
            console.log(`Enviar mail a Supervisores: Fase completada: ${fase.nombre || fase.id}. Tareas completadas: ${JSON.stringify(completadas)}. Pasar a: ${siguienteTxt}`)
        }

    async function toggleCompletada(tarea: TareaFase, checked: boolean) {
        const existente = registrosProductosTareas[tarea.id]
        const keyName = detectCompletadaKey(existente)
        const prev = existente ? { ...existente } : undefined

        setUpdatingTareas(u => ({ ...u, [tarea.id]: true }))
        establecerRegistrosProductosTareas(p => ({ ...p, [tarea.id]: { ...(p[tarea.id] || {}), [keyName]: checked ? 'S' : 'N' } }))

        try {
            if (existente && existente.id) {
                await (productosFasesTareasAPI as any).updateProductosFasesTareasById(existente.id, { [keyName]: checked ? 'S' : 'N' })
                } else {
                const payload: any = { productoId: Number(productId), faseId: Number(identificadorDeFaseActiva), tareaFaseId: Number(tarea.id), [keyName]: checked ? 'S' : 'N' }
                const userId = (user as any)?.id ?? (user as any)?.usuarioId ?? (user as any)?.userId
                if (userId) payload.usuarioId = Number(userId)
                const creado = await (productosFasesTareasAPI as any).createProductosFasesTareas(payload)
                establecerRegistrosProductosTareas(p => ({ ...p, [tarea.id]: creado && creado.id ? creado : payload }))
            }
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
                                            onClick={() => cambiarAFase(fase.id)}
                                            style={{
                                                cursor: 'pointer',
                                                fontWeight: estaActiva ? 700 : 600,
                                                color: estaActiva ? '#0f172a' : '#374151',
                                                padding: '6px 8px',
                                                background: 'transparent',
                                                borderRadius: 4,
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
                                                        if (toast && toast.show) toast.show({ severity: 'warn', summary: 'Permisos', detail: 'No tienes permiso para actualizar tareas', life: 3000 })
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
                    const canClickSend = allCheckedActive && canUpdateTasks
                    return (
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                            <button
                                onClick={() => {
                                    if (!canUpdateTasks) {
                                        if (toast && toast.show) toast.show({ severity: 'warn', summary: 'Permisos', detail: 'No tienes permiso para enviar notificaciones', life: 3000 })
                                        return
                                    }
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
                                Enviar correo a Supervisores
                            </button>
                        </div>
                    )
                })()}
            </div>
        </div>
    )
}