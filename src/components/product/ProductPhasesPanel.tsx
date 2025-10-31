import React, { useEffect, useState } from 'react'

// Adaptadores (API)
const fasesApi = require('../../api-endpoints/fases')
const pftApi = require('../../api-endpoints/productos-fases-tareas')
const usuariosApi = require('../../api-endpoints/usuarios')

// Tipos locales (coinciden con el backend donde corresponde)
type TareaItem = {
    id: number
    productoId?: number
    faseId?: number
    tareaFaseId?: number
    nombre?: string
    usuarioId?: number
    completadaSn?: 'S' | 'N'
    validadaSupervisorSn?: 'S' | 'N'
}

type Fase = { id: number; codigo?: string; nombre?: string }

export default function PanelFasesProducto({ productId }: { productId?: string | number }) {
    const [fases, setFases] = useState<Fase[]>([])
    const [faseActivaId, setFaseActivaId] = useState<number | null>(null)
    const [tareas, setTareas] = useState<TareaItem[]>([])
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                // fasesApi puede exponer find() o findFases(); intentamos ambos
                const list = typeof fasesApi.findFases === 'function' ? await fasesApi.findFases() : await (typeof fasesApi.find === 'function' ? fasesApi.find() : [])
                if (!mounted) return
                const mapped: Fase[] = (Array.isArray(list) ? list : []).map((f: any) => ({ id: Number(f.id), codigo: f.codigo, nombre: f.nombre }))
                setFases(mapped)
                if (mapped.length) setFaseActivaId(mapped[0].id)
            } catch (e: any) {
                console.error(e)
                if (mounted) setError(e?.message || 'Error cargando fases')
            }
        })()
        return () => { mounted = false }
    }, [])

    // Comprueba si todas las tareas de una fase están completadas ('S') => marcadas en la UI
    function todasTareasCompletadas(faseId: number) {
        const list = tareasPorFase(faseId)
        if (!list || list.length === 0) return false
        // Ahora consideramos completada la tarea cuando completadaSn === 'S' (checkbox marcado)
        return list.every(t => t.completadaSn === 'S')
    }

    // Intentar cambiar a una fase (previene avanzar a la derecha si tareas no completadas)
    function intentarCambiarAFase(targetFaseId: number) {
        if (!faseActivaId) {
            setFaseActivaId(targetFaseId)
            return
        }
        const currentIndex = fases.findIndex(f => f.id === faseActivaId)
        const targetIndex = fases.findIndex(f => f.id === targetFaseId)
        // Si target no encontrado o current no encontrado, permitir
        if (currentIndex === -1 || targetIndex === -1) {
            setFaseActivaId(targetFaseId)
            return
        }
        // Si nos movemos a la derecha (targetIndex > currentIndex), asegurarse de completar tareas
        if (targetIndex > currentIndex) {
            if (!todasTareasCompletadas(faseActivaId)) {
                const msg = 'No puede avanzar a la siguiente fase hasta marcar todas las tareas de la fase actual.'
                console.log(msg)
                setError(msg)
                // limpiar mensaje tras 4s
                setTimeout(() => { setError(null) }, 4000)
                return
            }
        }
        // En otros casos permitimos el cambio
        setFaseActivaId(targetFaseId)
    }

    async function cargarTareasPorProducto(prodId: any) {
        setCargando(true); setError(null)
            try {
                // usamos el adaptador productos-fases-tareas
                const params = { filter: JSON.stringify({ where: { productoId: Number(prodId) } }) }
                const data = await pftApi.findProductosFasesTareas(params)
                    const arr = Array.isArray(data) ? data : []
                    // Resolver los nombres de usuario asociados (nombreUsuario + apellido)
                    try {
                        const userIds = Array.from(new Set(arr.map((x: any) => x.usuarioId).filter(Boolean).map((n: any) => Number(n))))
                        let uMap: Record<number,string> = {}
                        if (userIds.length) {
                            const users = await Promise.all(userIds.map((id: number) => usuariosApi.getById(id).catch(() => null)))
                            users.forEach((u: any, i: number) => {
                                const id = userIds[i]
                                if (u && u.id !== undefined) {
                                    const nombre = (u.nombreUsuario || u.nombre || '')
                                    const apellido = (u.apellido || u.lastName || u.apellidos || '')
                                    uMap[Number(id)] = (nombre + ' ' + apellido).trim() || String(id)
                                }
                            })
                        }
                        const mapped = arr.map((t: any) => ({ ...t, usuarioNombreFull: t.usuarioId ? uMap[Number(t.usuarioId)] ?? null : null }))
                        setTareas(mapped)
                    } catch (e) {
                        setTareas(arr)
                    }
            } catch (e: any) {
                    console.error('Error cargando tareas', e)
                    setError(e?.message || 'Error cargando tareas')
        } finally { setCargando(false) }
        }

    useEffect(() => { if (productId) cargarTareasPorProducto(productId) }, [productId])

    const tareasPorFase = (faseId: number) => tareas.filter((t: TareaItem) => Number(t.faseId) === Number(faseId))

    async function alternarTarea(pftId: number, checked: boolean) {
        const prev = tareas
    // Nota: en la UI, el checkbox marcado corresponde a completada (completadaSn === 'S').
    // Si el checkbox queda marcado => enviar 'N', si queda desmarcado => enviar 'N'.
        setTareas(prev.map(t => t.id === pftId ? { ...t, completadaSn: checked ? 'S' : 'N' } : t))
        try {
            await pftApi.updateProductosFasesTareasById(pftId, { completadaSn: checked ? 'S' : 'N' })
        } catch (e: any) {
            alert('Error actualizando tarea: ' + (e?.message || e))
            setTareas(prev)
        }
    }

    // Cargar usuario para una tarea concreta: consulta el usuario por su id (t.usuarioId)
    // y actualiza esa tarea en el estado con campo `usuarioNombreFull`.
    async function fetchUsuarioParaTarea(tareaId: number, usuarioId?: number) {
        try {
            const uid = usuarioId ?? tareas.find(t => t.id === tareaId)?.usuarioId
            if (!uid) return null
            const u = await usuariosApi.getById(Number(uid))
            if (!u) return null
            const nombre = (u.nombreUsuario)
            const apellidos = (u.apellidos)
            const full = (nombre + ' ' + apellidos).trim() || String(uid)
            setTareas(prev => prev.map(t => t.id === tareaId ? ({ ...t, usuarioNombreFull: full }) : t))
            return full
        } catch (e) {
            console.error('Error cargando usuario para tarea', e)
            return null
        }
    }

    if (!productId) return null

    return (
        <div style={{ marginTop: 18, borderTop: '1px solid #eee', paddingTop: 12 }}>

            {cargando && <div>Cargando...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                        {fases.map((p, idx) => {
                            const isActive = faseActivaId === p.id
                            return (
                                <React.Fragment key={p.id}>
                                    <div
                                        onClick={() => intentarCambiarAFase(p.id)}
                                        style={{
                                            cursor: 'pointer',
                                            fontWeight: isActive ? 700 : 600,
                                            color: isActive ? '#0f172a' : '#374151',
                                            padding: '6px 8px',
                                            background: 'transparent',
                                            borderRadius: 4,
                                        }}
                                        aria-current={isActive}
                                    >
                                        {p.nombre || `Fase ${p.id}`}
                                    </div>
                                    {idx < fases.length - 1 && (
                                        <span style={{ width: 1, height: 18, background: '#e6e6e6', display: 'inline-block', marginLeft: 6, marginRight: 6 }} />
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </div>

            <div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {faseActivaId && tareasPorFase(faseActivaId).map(t => (
                        <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                            {/* Checkbox marcado significa completada (completadaSn === 'S') */}
                            <input type="checkbox" checked={t.completadaSn === 'S'} onChange={e => alternarTarea(t.id, e.target.checked)} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{t.nombre || `Tarea ${t.id}`}</div>
                                <div style={{ fontSize: 12, color: '#666' }}>Asignada a: {(t as any).usuarioNombreFull ?? (
                                    t.usuarioId ? (


//Retocar aqui para llamada a api-Usuarios y sacar nomreUsuario y Apellido, para sustituir al usuarioId

                                        <span style={{ color: '#0ea5a4', cursor: 'pointer' }} onClick={() => fetchUsuarioParaTarea(t.id, t.usuarioId)}>{t.usuarioId}</span>
                                    ) : '—'
                                )}</div>
                            </div>
                            <div style={{ minWidth: 140, textAlign: 'right' }}>
                                <div style={{ fontSize: 12, color: '#666' }}>Validada: {t.validadaSupervisorSn === 'S' ? 'Sí' : 'No'}</div>
                            </div>
                        </li>
                    ))}
                </ul>

                
            </div>
        </div>
    )
}