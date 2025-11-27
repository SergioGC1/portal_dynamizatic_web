// FaseTareasProducto.tsx
import React from 'react'
import { Toast } from 'primereact/toast'
import {
    EditarFaseTareasProducto,
    EditarFaseTareasProductoParams
} from './EditarFaseTareasProducto'

const FaseTareasProducto: React.FC<EditarFaseTareasProductoParams> = (props) => {
    const {
        toastRef,
        listaDeFases,
        faseActivaId,
        tareasFaseActiva,
        registrosProductosTareas,
        updatingTareas,
        correosEnviados,
        emailPicker,
        estaCargando,
        mensajeDeError,
        rolActivo,
        canViewTasks,
        canUpdateTasks,
        setEmailPicker,
        cambiarAFase,
        sendToSupervisors,
        toggleCompletada,
        continuarEnvioCorreo,
        detectCompletadaKey
    } = EditarFaseTareasProducto(props)

    if (!props.productId) return null

    return (
        <div style={{ marginTop: 18, borderTop: '1px solid #eee', paddingTop: 12 }}>
            {/* Toast global para mensajes */}
            <Toast ref={toastRef as React.RefObject<Toast>} />

            {/* Indicadores de carga y errores */}
            {estaCargando && <div>Cargando...</div>}
            {mensajeDeError && <div style={{ color: 'red' }}>{mensajeDeError}</div>}

            {/* Cabecera de fases (tabs simples) */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 12,
                    flexWrap: 'wrap'
                }}
            >
                {listaDeFases.map((fase, indice) => {
                    const estaActiva = faseActivaId === fase.id
                    return (
                        <React.Fragment key={fase.id}>
                            <div
                                onClick={() => {
                                    if (props.readOnly) return
                                    cambiarAFase(fase.id)
                                }}
                                style={{
                                    cursor: props.readOnly ? 'default' : 'pointer',
                                    fontWeight: estaActiva ? 700 : 600,
                                    color: estaActiva ? '#0f172a' : '#374151',
                                    padding: '6px 8px',
                                    background: 'transparent',
                                    borderRadius: 4,
                                    opacity: props.readOnly && !estaActiva ? 0.7 : 1
                                }}
                                aria-current={estaActiva}
                            >
                                {fase.nombre || `Fase ${fase.id}`}
                            </div>
                            {indice < listaDeFases.length - 1 && (
                                <span
                                    style={{
                                        width: 1,
                                        height: 18,
                                        background: '#e6e6e6',
                                        display: 'inline-block',
                                        marginLeft: 6,
                                        marginRight: 6
                                    }}
                                />
                            )}
                        </React.Fragment>
                    )
                })}
            </div>

            {/* Listado de tareas de la fase activa */}
            <div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {!canViewTasks || rolActivo === false ? (
                        <div style={{ padding: 12, color: '#6c757d' }}>
                            No tienes permiso para ver las tareas de este producto.
                        </div>
                    ) : faseActivaId ? (
                        tareasFaseActiva.map((tarea, indice) => {
                            const registro = registrosProductosTareas[tarea.id]
                            const keyName = detectCompletadaKey(registro)
                            const checked = registro
                                ? String(registro[keyName] ?? '').toUpperCase() === 'S'
                                : false
                            const updating = updatingTareas[tarea.id] === true
                            return (
                                <li
                                    key={tarea.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        padding: '10px 0',
                                        borderBottom: '1px solid #f3f4f6'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div
                                            style={{
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
                                            }}
                                        >
                                            {indice + 1}
                                        </div>
                                        <div style={{ fontWeight: 600 }}>
                                            {tarea.nombre || `Tarea ${tarea.id}`}
                                        </div>
                                    </div>
                                    <div>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={updating || !canUpdateTasks}
                                            onChange={(e) => {
                                                if (!canUpdateTasks) {
                                                    // El hook ya muestra toast, pero aquí evitamos llamadas innecesarias
                                                    return
                                                }
                                                toggleCompletada(tarea, e.target.checked)
                                            }}
                                        />
                                    </div>
                                </li>
                            )
                        })
                    ) : null}
                </ul>

                {/* Botón global para enviar correo a supervisores */}
                {faseActivaId &&
                    canViewTasks &&
                    (() => {
                        const allCheckedActive =
                            tareasFaseActiva.length > 0 &&
                            tareasFaseActiva.every((t) => {
                                const rec = registrosProductosTareas[t.id]
                                const key = detectCompletadaKey(rec)
                                return rec && String(rec[key] ?? '').toUpperCase() === 'S'
                            })

                        const faseActiva = listaDeFases.find((f) => f.id === faseActivaId)
                        const canClickSend =
                            allCheckedActive && canUpdateTasks && !correosEnviados[faseActivaId]

                        return (
                            <div
                                style={{
                                    marginTop: 12,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 10
                                }}
                            >
                                <button
                                    onClick={() => {
                                        if (!canUpdateTasks) return
                                        if (faseActiva) sendToSupervisors(faseActiva)
                                    }}
                                    disabled={!canClickSend}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: 8,
                                        background: canClickSend ? '#16a34a' : '#9ca3af',
                                        color: 'white',
                                        border: 'none',
                                        boxShadow: canClickSend
                                            ? '0 4px 12px rgba(16,185,129,0.2)'
                                            : 'none',
                                        cursor: canClickSend ? 'pointer' : 'not-allowed',
                                        opacity: canUpdateTasks ? 1 : 0.8
                                    }}
                                >
                                    {correosEnviados[faseActivaId]
                                        ? 'Correo enviado'
                                        : 'Enviar correo a Supervisores'}
                                </button>

                                {/* Modal para elegir destinatario cuando hay varios correos */}
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
                                        <div
                                            style={{
                                                background: '#fff',
                                                borderRadius: 12,
                                                padding: 18,
                                                width: '90%',
                                                maxWidth: 420,
                                                boxShadow: '0 12px 32px rgba(0,0,0,0.22)'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 12
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: 17,
                                                        color: '#0f172a'
                                                    }}
                                                >
                                                    Elige destinatario
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        setEmailPicker({
                                                            visible: false,
                                                            destinatarios: [],
                                                            fase: null,
                                                            siguiente: undefined,
                                                            completadas: []
                                                        })
                                                    }
                                                    style={{
                                                        border: 'none',
                                                        background: 'transparent',
                                                        cursor: 'pointer',
                                                        fontSize: 18,
                                                        lineHeight: '18px'
                                                    }}
                                                    aria-label="Cerrar selector de email"
                                                >
                                                    X
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {emailPicker.destinatarios.map((dest) => (
                                                    <button
                                                        key={dest}
                                                        onClick={() => {
                                                            if (!emailPicker.fase) return
                                                            continuarEnvioCorreo(dest)
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
                                                    onClick={() =>
                                                        setEmailPicker({
                                                            visible: false,
                                                            destinatarios: [],
                                                            fase: null,
                                                            siguiente: undefined,
                                                            completadas: []
                                                        })
                                                    }
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


export default FaseTareasProducto