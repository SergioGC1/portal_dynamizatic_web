// FaseTareasProducto.tsx
import React from 'react'
import { Toast } from 'primereact/toast'
import {
  EditarFaseTareasProducto,
  EditarFaseTareasProductoParams
} from './EditarFaseTareasProducto'

/**
 * Componente de presentación para las fases y tareas de un producto.
 * - Usa el hook EditarFaseTareasProducto para toda la lógica de negocio.
 * - Solo se encarga de mostrar tabs de fases, lista de tareas y el botón de correo.
 */
const FasesTareasProducto: React.FC<EditarFaseTareasProductoParams> = (props) => {
  // Hook que encapsula toda la lógica de fases/tareas/correos
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

  // Si no hay productId, no pintamos nada (no tiene sentido el componente)
  if (!props.productId) return null

  return (
    <div style={{ marginTop: 18, borderTop: '1px solid #eee', paddingTop: 12 }}>
      {/* Toast global para mensajes del hook (éxito/errores/info) */}
      <Toast ref={toastRef as React.RefObject<Toast>} />

      {/* Indicadores de carga y errores generales */}
      {estaCargando && <div>Cargando...</div>}
      {mensajeDeError && <div style={{ color: 'red' }}>{mensajeDeError}</div>}

      {/* Cabecera de fases (tabs sencillos de texto clicable) */}
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
                  // En modo solo lectura no se puede cambiar de fase
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

              {/* Separador visual entre fases */}
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

      {/* Contenido de la fase activa: lista de tareas + checkbox */}
      <div>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {/* Si no tiene permiso o el rol está inactivo, mensaje de acceso restringido */}
          {!canViewTasks || rolActivo === false ? (
            <div style={{ padding: 12, color: '#6c757d' }}>
              No tienes permiso para ver las tareas de este producto.
            </div>
          ) : faseActivaId ? (
            // Listado de tareas de la fase seleccionada
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
                  {/* Número de orden + nombre de la tarea */}
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

                  {/* Checkbox de completada / no completada */}
                  <div>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={updating || !canUpdateTasks}
                      onChange={(e) => {
                        // El hook ya controla permisos y muestra toast si hace falta,
                        // aquí solo evitamos llamadas innecesarias si no puede actualizar.
                        if (!canUpdateTasks) return
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
            // Comprobamos si todas las tareas de la fase activa están marcadas como completadas
            const allCheckedActive =
              tareasFaseActiva.length > 0 &&
              tareasFaseActiva.every((t) => {
                const rec = registrosProductosTareas[t.id]
                const key = detectCompletadaKey(rec)
                return rec && String(rec[key] ?? '').toUpperCase() === 'S'
              })

            const faseActiva = listaDeFases.find((f) => f.id === faseActivaId)

            // Solo se puede pulsar si:
            // - todas las tareas están completas
            // - el usuario puede actualizar
            // - aún no se ha enviado el correo para esta fase
            const puedeEnviarCorreo =
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
                  disabled={!puedeEnviarCorreo}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: puedeEnviarCorreo ? '#16a34a' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    boxShadow: puedeEnviarCorreo
                      ? '0 4px 12px rgba(16,185,129,0.2)'
                      : 'none',
                    cursor: puedeEnviarCorreo ? 'pointer' : 'not-allowed',
                    opacity: canUpdateTasks ? 1 : 0.8
                  }}
                >
                  {correosEnviados[faseActivaId]
                    ? 'Correo enviado'
                    : 'Enviar correo a Supervisores'}
                </button>

                {/* Modal para elegir destinatario cuando hay varios correos de supervisores */}
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
                      {/* Cabecera del modal */}
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

                      {/* Listado de correos posibles + botón de cancelar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {emailPicker.destinatarios.map((destinatario) => (
                          <button
                            key={destinatario}
                            onClick={() => {
                              if (!emailPicker.fase) return
                              continuarEnvioCorreo(destinatario)
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
                            {destinatario}
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

export default FasesTareasProducto