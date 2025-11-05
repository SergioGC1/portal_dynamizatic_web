import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import fasesAPI from '../../api-endpoints/fases/index'
import TareasFasesAPI from '../../api-endpoints/tareas-fases/index'
import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { Dialog } from 'primereact/dialog'
import { confirmDialog } from 'primereact/confirmdialog'
import '../../styles/layout.scss'
import '../../styles/_main.scss'

type Props = { faseId?: string }

type FaseForm = {
    nombre: string
    codigo?: string
}

type TareaFase = {
    id?: number
    faseId: number
    nombre: string
}

export default function EditarDatosFases({ faseId: propsFaseId }: Props) {
    const { faseId: urlFaseId } = useParams<{ faseId: string }>()
    const navigate = useNavigate()

    // Usar faseId de props si está disponible, sino usar el de la URL
    const faseId = propsFaseId || urlFaseId
    const [fase, setFase] = useState<FaseForm>({ nombre: '', codigo: '' })
    const [tareas, setTareas] = useState<TareaFase[]>([])
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Estados para gestión de tareas
    const [mostrarDialogoTarea, setMostrarDialogoTarea] = useState(false)
    const [modoTarea, setModoTarea] = useState<'nuevo' | 'editar' | null>(null)
    const [tareaEditando, setTareaEditando] = useState<TareaFase | null>(null)
    const [nombreTarea, setNombreTarea] = useState('')

    useEffect(() => {
        if (faseId) {
            cargarFase()
            cargarTareas()
        }
    }, [faseId]) // eslint-disable-line react-hooks/exhaustive-deps

    const cargarFase = async () => {
        if (!faseId) return

        setCargando(true)
        setError(null)
        try {
            const data = await fasesAPI.getFaseById(faseId)
            if (data) {
                setFase({
                    nombre: data.nombre || '',
                    codigo: data.codigo || ''
                })
            }
        } catch (e: any) {
            console.error(e)
            setError(e?.message || 'Error cargando fase')
        } finally {
            setCargando(false)
        }
    }

    const cargarTareas = async () => {
        if (!faseId) return

        try {
            const params = {
                filter: JSON.stringify({
                    where: { faseId: Number(faseId) }
                })
            }
            const list = await TareasFasesAPI.findTareasFases(params)
            setTareas(list || [])
        } catch (e: any) {
            console.error(e)
            setError(e?.message || 'Error cargando tareas')
        }
    }

    const guardarFase = async () => {
        if (!fase.nombre?.trim()) {
            setError('El nombre de la fase es obligatorio')
            return
        }

        setCargando(true)
        setError(null)
        try {
            if (faseId) {
                await fasesAPI.updateFaseById(faseId, fase)
            } else {
                await fasesAPI.createFase(fase)
            }
            // Redirigir a la lista de fases
            navigate('/fases')
        } catch (e: any) {
            console.error(e)
            setError(e?.message || 'Error guardando fase')
        } finally {
            setCargando(false)
        }
    }

    const nuevaTarea = () => {
        setNombreTarea('')
        setTareaEditando(null)
        setModoTarea('nuevo')
        setMostrarDialogoTarea(true)
    }

    const editarTarea = (tarea: TareaFase) => {
        setNombreTarea(tarea.nombre)
        setTareaEditando(tarea)
        setModoTarea('editar')
        setMostrarDialogoTarea(true)
    }

    const guardarTarea = async () => {
        if (!nombreTarea.trim() || !faseId) return

        try {
            const payload = {
                faseId: Number(faseId),
                nombre: nombreTarea.trim()
            }

            if (modoTarea === 'nuevo') {
                await TareasFasesAPI.createTareasFase(payload)
            } else if (modoTarea === 'editar' && tareaEditando?.id) {
                await TareasFasesAPI.updateTareasFaseById(tareaEditando.id, payload)
            }

            // Recargar tareas y cerrar diálogo
            await cargarTareas()
            cerrarDialogoTarea()
        } catch (e: any) {
            console.error(e)
            setError(e?.message || 'Error guardando tarea')
        }
    }

    const eliminarTarea = (tarea: TareaFase) => {
        confirmDialog({
            message: `¿Estás seguro de que deseas eliminar la tarea "${tarea.nombre}"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    if (tarea.id) {
                        await TareasFasesAPI.deleteTareasFaseById(tarea.id)
                        await cargarTareas()
                    }
                } catch (e: any) {
                    console.error(e)
                    setError(e?.message || 'Error eliminando tarea')
                }
            }
        })
    }

    const cerrarDialogoTarea = () => {
        setMostrarDialogoTarea(false)
        setModoTarea(null)
        setTareaEditando(null)
        setNombreTarea('')
    }

    if (cargando && !fase.nombre) {
        return (
            <div style={{ padding: 20, textAlign: 'center' }}>
                <i className="pi pi-spinner pi-spin" style={{ fontSize: '2rem' }}></i>
                <p>Cargando datos de la fase...</p>
            </div>
        )
    }

    return (
        <div style={{ padding: 20 }}>
            {/* Header con navegación */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>{faseId ? 'Editar Fase' : 'Nueva Fase'}</h2>
                <Button
                    label="Volver a Fases"
                    icon="pi pi-arrow-left"
                    className="p-button-secondary"
                    onClick={() => navigate('/fases')}
                />
            </div>

            {error && (
                <div style={{
                    color: 'red',
                    padding: 12,
                    backgroundColor: '#fee',
                    borderRadius: 4,
                    marginBottom: 16
                }}>
                    {error}
                    <Button
                        icon="pi pi-times"
                        className="p-button-text p-button-sm"
                        onClick={() => setError(null)}
                        style={{ float: 'right', marginTop: -4 }}
                    />
                </div>
            )}

            <div style={{ display: 'flex', gap: 20 }}>
                {/* Panel Izquierdo - Datos de la Fase */}
                <div style={{ flex: 1 }}>
                    <div style={{
                        padding: 20,
                        border: '1px solid #e0e0e0',
                        borderRadius: 8,
                        backgroundColor: '#fff'
                    }}>
                        <h3>Información de la Fase</h3>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                                Código
                            </label>
                            <InputText
                                value={fase.codigo || ''}
                                onChange={(e) => setFase(prev => ({ ...prev, codigo: e.target.value }))}
                                placeholder="Código de la fase (opcional)"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                                Nombre *
                            </label>
                            <InputText
                                value={fase.nombre}
                                onChange={(e) => setFase(prev => ({ ...prev, nombre: e.target.value }))}
                                placeholder="Nombre de la fase"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                            <Button
                                label="Guardar"
                                icon="pi pi-check"
                                onClick={guardarFase}
                                disabled={cargando || !fase.nombre?.trim()}
                            />
                            <Button
                                label="Cancelar"
                                icon="pi pi-times"
                                className="p-button-secondary"
                                onClick={() => navigate('/fases')}
                                disabled={cargando}
                            />
                        </div>
                    </div>
                </div>

                {/* Panel Derecho - Gestión de Tareas */}
                {faseId && (
                    <div style={{ flex: 1 }}>
                        <div style={{
                            padding: 20,
                            border: '1px solid #e0e0e0',
                            borderRadius: 8,
                            backgroundColor: '#fff'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3>Tareas de la Fase ({tareas.length})</h3>
                                <Button
                                    label="Nueva Tarea"
                                    icon="pi pi-plus"
                                    onClick={nuevaTarea}
                                    className="p-button-sm"
                                />
                            </div>

                            {tareas.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: 30,
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: 4,
                                    color: '#666',
                                    border: '2px dashed #ddd'
                                }}>
                                    <i className="pi pi-list" style={{ fontSize: '2rem', marginBottom: 8, display: 'block' }}></i>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                        No hay tareas definidas para esta fase.<br />
                                        Haz clic en "Nueva Tarea" para agregar una.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '400px', overflowY: 'auto' }}>
                                    {tareas.map((tarea, index) => (
                                        <div
                                            key={tarea.id || index}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: 12,
                                                border: '1px solid #e0e0e0',
                                                borderRadius: 4,
                                                backgroundColor: '#fdfdfd',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <div style={{
                                                minWidth: 32,
                                                height: 32,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#007ad9',
                                                color: 'white',
                                                borderRadius: '50%',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {index + 1}
                                            </div>

                                            <div style={{ flex: 1, marginLeft: 12 }}>
                                                <div style={{
                                                    fontWeight: 600,
                                                    color: '#333',
                                                    fontSize: '0.95rem'
                                                }}>
                                                    {tarea.nombre}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <Button
                                                    icon="pi pi-pencil"
                                                    className="p-button-text p-button-sm"
                                                    onClick={() => editarTarea(tarea)}
                                                    tooltip="Editar tarea"
                                                />
                                                <Button
                                                    icon="pi pi-trash"
                                                    className="p-button-text p-button-sm p-button-danger"
                                                    onClick={() => eliminarTarea(tarea)}
                                                    tooltip="Eliminar tarea"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Diálogo para Nueva/Editar Tarea */}
            <Dialog
                header={modoTarea === 'nuevo' ? 'Nueva Tarea' : 'Editar Tarea'}
                visible={mostrarDialogoTarea}
                style={{ width: '400px' }}
                onHide={cerrarDialogoTarea}
            >
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                        Nombre de la Tarea *
                    </label>
                    <InputText
                        value={nombreTarea}
                        onChange={(e) => setNombreTarea(e.target.value)}
                        placeholder="Nombre de la tarea"
                        style={{ width: '100%' }}
                        autoFocus
                    />
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button
                        label="Cancelar"
                        icon="pi pi-times"
                        className="p-button-secondary"
                        onClick={cerrarDialogoTarea}
                    />
                    <Button
                        label="Guardar"
                        icon="pi pi-check"
                        onClick={guardarTarea}
                        disabled={!nombreTarea.trim()}
                    />
                </div>
            </Dialog>
        </div>
    )
}