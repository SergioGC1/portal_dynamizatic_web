import React, { useEffect, useState } from 'react'

// Adaptadores (API) con imports arriba para buenas prácticas
import fasesAPI from '../../api-endpoints/fases'
import tareasFasesAPI from '../../api-endpoints/tareas-fases'

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

    // Cambio directo de fase activa y recarga de tareas (sin bloqueo por completadas)
    function cambiarAFase(identificadorDeFaseDestino: number) {
        establecerIdentificadorDeFaseActiva(identificadorDeFaseDestino)
    }

    async function cargarTareasPorFase(identificadorDeFase: number) {
        establecerEstaCargando(true)
        establecerMensajeDeError(null)
        try {
            const parametros = { filter: JSON.stringify({ where: { faseId: Number(identificadorDeFase) } }) }
            const resultado = await (tareasFasesAPI as any).findTareasFases(parametros)
            const arreglo = Array.isArray(resultado) ? resultado : []
            const mapeadas: TareaFase[] = arreglo.map((t: any) => ({ id: Number(t.id), faseId: Number(t.faseId), nombre: t.nombre }))
            establecerTareasDeLaFaseActiva(mapeadas)
        } catch (error: any) {
            console.error('Error cargando tareas por fase', error)
            establecerMensajeDeError(error?.message || 'Error cargando tareas de la fase')
        } finally {
            establecerEstaCargando(false)
        }
    }

    useEffect(() => {
        if (identificadorDeFaseActiva) cargarTareasPorFase(identificadorDeFaseActiva)
    }, [identificadorDeFaseActiva])

    if (!productId) return null

    return (
        <div style={{ marginTop: 18, borderTop: '1px solid #eee', paddingTop: 12 }}>

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
                    {identificadorDeFaseActiva && tareasDeLaFaseActiva.map((tarea, indice) => (
                        <li key={tarea.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
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
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{tarea.nombre || `Tarea ${tarea.id}`}</div>
                            </div>
                        </li>
                    ))}
                </ul>

                
            </div>
        </div>
    )
}