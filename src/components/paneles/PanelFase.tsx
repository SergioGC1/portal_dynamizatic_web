import React, { useEffect, useState } from 'react'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog'
import '../ui/GestorPaneles.css'
import './PanelFase.scss'

// Interfaces con nomenclatura en español
interface Fase {
    id?: number
    nombre: string
    codigo?: string
    descripcion?: string
    activo?: string
    activoSn?: string
    orden?: number
}

interface TareaFase {
    id?: number
    faseId: number
    nombre: string
}

interface PropiedadesPanelFase {
    mode: 'ver' | 'editar'
    record: Fase | null
    columns: Array<{
        key: string
        title?: string
        label?: string
    }>
    onClose: () => void
    onSave?: (fase: Fase) => Promise<void>
}


export default function PanelFase({ mode, record = null, columns = [], onClose, onSave }: PropiedadesPanelFase) {

    // Estados del formulario con nombres descriptivos en español
    const [formularioDeLaFase, establecerFormularioDeLaFase] = useState<Fase | Record<string, any>>({})
    const [erroresDeValidacionDeLaFase, establecerErroresDeValidacionDeLaFase] = useState<Record<string, string>>({})

    // Estados específicos para gestión de tareas con nombres descriptivos
    const [tareasAsociadasALaFase, establecerTareasAsociadasALaFase] = useState<TareaFase[]>([])
    const [estaVisibleElDialogoDeTarea, establecerEstaVisibleElDialogoDeTarea] = useState(false)
    const [modoDelDialogoDeTarea, establecerModoDelDialogoDeTarea] = useState<'nuevo' | 'editar' | null>(null)
    const [tareaQueSeEstaEditando, establecerTareaQueSeEstaEditando] = useState<TareaFase | null>(null)
    const [nombreDeLaNuevaTarea, establecerNombreDeLaNuevaTarea] = useState('')
    const [estaGuardandoLaTarea, establecerEstaGuardandoLaTarea] = useState(false)

    // Inicializar formulario cuando cambie el registro
    useEffect(() => {
        establecerFormularioDeLaFase((record as any) || {})
        // Cargar tareas si hay un ID de fase
        if ((record as any)?.id) {
            cargarTareasAsociadasALaFase((record as any).id)
        } else {
            establecerTareasAsociadasALaFase([])
        }
    }, [record])

    // Actualiza un campo específico del formulario de la fase
    const actualizarCampoDelFormularioDeLaFase = (claveCampo: string, valorDelCampo: any) =>
        establecerFormularioDeLaFase((formularioActual: any) => ({
            ...formularioActual,
            [claveCampo]: valorDelCampo
        }))

    // Validar y guardar la fase con validaciones específicas
    const guardarFaseConValidaciones = async () => {
        establecerErroresDeValidacionDeLaFase({})

        // Validar nombre de la fase
        const nombreDeLaFase = String(formularioDeLaFase.nombre || '').trim()
        if (!nombreDeLaFase || nombreDeLaFase.length < 2) {
            establecerErroresDeValidacionDeLaFase({ nombre: 'El nombre de la fase debe tener al menos 2 caracteres' })
            return
        }

        // Validar código de la fase
        const codigoDeLaFase = String(formularioDeLaFase.codigo || '').trim()
        if (codigoDeLaFase && codigoDeLaFase.length < 2) {
            establecerErroresDeValidacionDeLaFase({ codigo: 'El código debe tener al menos 2 caracteres' })
            return
        }

        // Validar orden de la fase
        const ordenDeLaFase = Number(formularioDeLaFase.orden || 0)
        if (ordenDeLaFase < 0) {
            establecerErroresDeValidacionDeLaFase({ orden: 'El orden no puede ser negativo' })
            return
        }

        // Limpiar datos temporales antes de enviar al servidor
        const datosLimpiosDeLaFase: any = { ...formularioDeLaFase }
        if (datosLimpiosDeLaFase._cb !== undefined) delete datosLimpiosDeLaFase._cb

        if (onSave) await onSave(datosLimpiosDeLaFase as Fase)
    }

    // Cargar tareas asociadas a la fase desde el servidor (API oficial tareas-fases)
    const cargarTareasAsociadasALaFase = async (identificadorDeLaFase: number) => {
        try {
            const TareasFasesAPI = require('../../api-endpoints/tareas-fases/index')
            const params = {
                filter: JSON.stringify({
                    where: { faseId: Number(identificadorDeLaFase) }
                })
            }
            const lista = await TareasFasesAPI.findTareasFases(params)
            establecerTareasAsociadasALaFase(Array.isArray(lista) ? lista : [])
        } catch (error) {
            console.error('Error cargando tareas de la fase:', error)
            establecerTareasAsociadasALaFase([])
        }
    }

    // Abrir diálogo para crear una nueva tarea
    const abrirDialogoParaNuevaTarea = () => {
        establecerNombreDeLaNuevaTarea('')
        establecerTareaQueSeEstaEditando(null)
        establecerModoDelDialogoDeTarea('nuevo')
        establecerEstaVisibleElDialogoDeTarea(true)
    }

    // Abrir diálogo para editar una tarea existente
    const abrirDialogoParaEditarTarea = (tareaAEditar: TareaFase) => {
        establecerNombreDeLaNuevaTarea(tareaAEditar.nombre)
        establecerTareaQueSeEstaEditando(tareaAEditar)
        establecerModoDelDialogoDeTarea('editar')
        establecerEstaVisibleElDialogoDeTarea(true)
    }

    // Guardar tarea (nueva o editada) en el servidor
    const guardarTareaEnElServidor = async () => {
        if (!nombreDeLaNuevaTarea.trim() || !formularioDeLaFase?.id) return

        establecerEstaGuardandoLaTarea(true)
        try {
            const TareasFasesAPI = require('../../api-endpoints/tareas-fases/index')
            const payload = {
                faseId: Number(formularioDeLaFase.id),
                nombre: nombreDeLaNuevaTarea.trim()
            }

            if (modoDelDialogoDeTarea === 'nuevo') {
                await TareasFasesAPI.createTareasFase(payload)
            } else if (modoDelDialogoDeTarea === 'editar' && tareaQueSeEstaEditando?.id) {
                await TareasFasesAPI.updateTareasFaseById(tareaQueSeEstaEditando.id, payload)
            }

            // Recargar tareas después de guardar
            if (formularioDeLaFase?.id) {
                await cargarTareasAsociadasALaFase(formularioDeLaFase.id)
            }

            cerrarDialogoDeTarea()
        } catch (error) {
            console.error('Error guardando tarea:', error)
        } finally {
            establecerEstaGuardandoLaTarea(false)
        }
    }

    // Eliminar tarea con confirmación del usuario
    const eliminarTareaConConfirmacion = (tareaAEliminar: TareaFase) => {
        confirmDialog({
            message: `¿Estás seguro de que deseas eliminar la tarea "${tareaAEliminar.nombre}"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptClassName: 'p-button-danger',
            rejectClassName: 'p-button-secondary',
            accept: async () => {
                try {
                    const TareasFasesAPI = require('../../api-endpoints/tareas-fases/index')
                    if (tareaAEliminar.id) {
                        await TareasFasesAPI.deleteTareasFaseById(tareaAEliminar.id)
                        if (formularioDeLaFase?.id) await cargarTareasAsociadasALaFase(formularioDeLaFase.id)
                    }
                } catch (error) {
                    console.error('Error eliminando tarea:', error)
                }
            }
        })
    }

    // Cerrar diálogo de tarea y limpiar estados
    const cerrarDialogoDeTarea = () => {
        establecerEstaVisibleElDialogoDeTarea(false)
        establecerModoDelDialogoDeTarea(null)
        establecerTareaQueSeEstaEditando(null)
        establecerNombreDeLaNuevaTarea('')
    }



    // No renderizar si no hay registro
    if (!record) return null

    return (
        <>
            <div className="record-panel">
                <div className="record-panel__header">
                    <strong className="record-panel__title">
                        {mode === 'ver' ? 'Ver fase' : 'Editar fase'}
                    </strong>
                    <div className="record-panel__controls">
                        {mode === 'editar' && (
                            <Button
                                label="Guardar"
                                onClick={guardarFaseConValidaciones}
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

                {/* Sección superior: título de la fase */}
                <div className="record-panel__top">
                    <div className="record-panel__main-title record-panel__main-title--full">
                        <label className="record-panel__label">Nombre de la fase</label>
                        <input
                            value={formularioDeLaFase?.nombre ?? ''}
                            onChange={(evento: React.ChangeEvent<HTMLInputElement>) =>
                                actualizarCampoDelFormularioDeLaFase('nombre', evento.target.value)
                            }
                            className="record-panel__input record-panel__product-name-input"
                            disabled={mode === 'ver'}
                        />

                        {erroresDeValidacionDeLaFase.nombre && (
                            <div style={{ color: 'red', marginTop: 6 }}>
                                {erroresDeValidacionDeLaFase.nombre}
                            </div>
                        )}
                    </div>
                </div>

                {/* Campos específicos y controlados de la fase */}
                <div className="record-panel__grid">
                    {/* Campo Código (ocupa toda la fila) */}
                    <div className="record-panel__field" style={{ gridColumn: '1 / -1' }}>
                        <label className="record-panel__label">Código de la Fase</label>
                        <input
                            value={formularioDeLaFase?.codigo ?? ''}
                            onChange={(evento) =>
                                actualizarCampoDelFormularioDeLaFase('codigo', evento.target.value)
                            }
                            className="record-panel__input"
                            style={{ width: '100%' }}
                            disabled={mode === 'ver'}
                        />
                        {erroresDeValidacionDeLaFase.codigo && (
                            <div style={{ color: 'red', marginTop: 6 }}>
                                {erroresDeValidacionDeLaFase.codigo}
                            </div>
                        )}
                    </div>
                </div>

                {/* Gestión de tareas - específico de fases */}
                {formularioDeLaFase?.id ? (
                    <div className="record-panel__grid" style={{ marginTop: 20, gridColumn: '1 / -1', width: '100%' }}>
                        <div className="panel-fase__gestion-tareas" style={{ gridColumn: '1 / -1' }}>
                            <div className="panel-fase__encabezado-tareas" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16
                            }}>
                                <h4 style={{ margin: 0 }}>
                                    Tareas de la Fase ({tareasAsociadasALaFase.length})
                                </h4>
                                {mode === 'editar' && (
                                    <Button
                                        label="Nueva Tarea"
                                        icon="pi pi-plus"
                                        onClick={abrirDialogoParaNuevaTarea}
                                        className="p-button-sm"
                                    />
                                )}
                            </div>

                            {tareasAsociadasALaFase.length === 0 ? (
                                <div className="panel-fase__sin-tareas" style={{
                                    textAlign: 'center',
                                    padding: 20,
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: 6
                                }}>
                                    <i className="pi pi-list" style={{
                                        fontSize: '2em',
                                        color: '#6c757d',
                                        marginBottom: 8
                                    }}></i>
                                    <p style={{ margin: 0, color: '#6c757d' }}>
                                        No hay tareas definidas para esta fase.
                                    </p>
                                    {mode === 'editar' && (
                                        <small style={{ color: '#6c757d' }}>
                                            Haz clic en "Nueva Tarea" para agregar una.
                                        </small>
                                    )}
                                </div>
                            ) : (
                                <div className="panel-fase__lista-tareas" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8
                                }}>
                                    {tareasAsociadasALaFase.map((tareaActual, indiceDeListaTarea) => (
                                        <div key={tareaActual.id || indiceDeListaTarea} className="panel-fase__item-tarea" style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: 12,
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: 6,
                                            border: '1px solid #dee2e6'
                                        }}>
                                            <div className="panel-fase__numero-tarea" style={{
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
                                                {indiceDeListaTarea + 1}
                                            </div>
                                            <div className="panel-fase__contenido-tarea" style={{ flex: 1 }}>
                                                <div className="panel-fase__nombre-tarea" style={{ fontWeight: 500 }}>
                                                    {tareaActual.nombre}
                                                </div>
                                            </div>
                                            {mode === 'editar' && (
                                                <div className="panel-fase__acciones-tarea" style={{
                                                    display: 'flex',
                                                    gap: 4
                                                }}>
                                                    <Button
                                                        icon="pi pi-pencil"
                                                        className="p-button-text p-button-sm"
                                                        onClick={() => abrirDialogoParaEditarTarea(tareaActual)}
                                                        tooltip="Editar tarea"
                                                    />
                                                    <Button
                                                        icon="pi pi-trash"
                                                        className="p-button-text p-button-sm p-button-danger"
                                                        onClick={() => eliminarTareaConConfirmacion(tareaActual)}
                                                        tooltip="Eliminar tarea"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="record-panel__grid" style={{ marginTop: 20, gridColumn: '1 / -1', width: '100%' }}>
                        <div className="panel-fase__tareas-guardado-requerido" style={{ gridColumn: '1 / -1' }}>
                            <div className="panel-fase__mensaje-info" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: 16,
                                backgroundColor: '#e7f3ff',
                                borderRadius: 6
                            }}>
                                <i className="pi pi-info-circle" style={{ color: '#007bff' }}></i>
                                <div>
                                    <strong style={{ color: '#007bff' }}>Guarda la fase primero</strong>
                                    <p style={{ margin: 0, fontSize: '0.9em', color: '#007bff' }}>
                                        Para gestionar las tareas de esta fase, primero debes guardar los datos básicos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Diálogo para nueva/editar tarea */}
            <Dialog
                header={modoDelDialogoDeTarea === 'nuevo' ? 'Nueva Tarea' : 'Editar Tarea'}
                visible={estaVisibleElDialogoDeTarea}
                style={{ width: '400px' }}
                onHide={cerrarDialogoDeTarea}
            >
                <div className="panel-fase__dialogo-tarea" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                }}>
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: 8,
                            fontWeight: 500
                        }}>
                            Nombre de la Tarea *
                        </label>
                        <input
                            type="text"
                            value={nombreDeLaNuevaTarea}
                            onChange={(evento) => establecerNombreDeLaNuevaTarea(evento.target.value)}
                            placeholder="Ingresa el nombre de la tarea"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '1em'
                            }}
                        />
                    </div>

                    <div className="panel-fase__botones-dialogo" style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        marginTop: 16
                    }}>
                        <Button
                            label="Cancelar"
                            icon="pi pi-times"
                            className="p-button-secondary"
                            onClick={cerrarDialogoDeTarea}
                        />
                        <Button
                            label="Guardar"
                            icon="pi pi-check"
                            onClick={guardarTareaEnElServidor}
                            disabled={!nombreDeLaNuevaTarea.trim() || estaGuardandoLaTarea}
                            loading={estaGuardandoLaTarea}
                        />
                    </div>
                </div>
            </Dialog>

            {/* Diálogo de confirmación */}
            <ConfirmDialog />
        </>
    )
}