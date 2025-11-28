// FaseTareasProducto.tsx
import React from 'react'
import { Toast } from 'primereact/toast'
import {
  EditarFaseTareasProducto,
  EditarFaseTareasProductoParams
} from './EditarFaseTareasProducto'
import '../../../styles/pages/FasesTareasProducto.scss'

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
  const [destinatarioSeleccionado, setDestinatarioSeleccionado] = React.useState<string>('')
  const [destinatariosElegidos, setDestinatariosElegidos] = React.useState<string[]>([])

  React.useEffect(() => {
    if (emailPicker.visible && emailPicker.destinatarios.length) {
      setDestinatarioSeleccionado((prev) =>
        prev && emailPicker.destinatarios.includes(prev)
          ? prev
          : emailPicker.destinatarios[0]
      )
      setDestinatariosElegidos([])
    } else {
      setDestinatarioSeleccionado('')
      setDestinatariosElegidos([])
    }
  }, [emailPicker.destinatarios, emailPicker.visible])

  // Si no hay productId, no pintamos nada (no tiene sentido el componente)
  if (!props.productId) return null

  return (
    <div className="ft-container">
      {/* Toast global para mensajes del hook (exito/errores/info) */}
      <Toast ref={toastRef as React.RefObject<Toast>} />

      {/* Indicadores de carga y errores generales */}
      {estaCargando && <div>Cargando...</div>}
      {mensajeDeError && <div className="ft-error-text">{mensajeDeError}</div>}

      {/* Cabecera de fases (tabs sencillos de texto clicable) */}
      <div className="ft-tabs">
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
                className={`ft-tab ${estaActiva ? 'ft-tab--active' : ''} ${
                  props.readOnly ? 'ft-tab--readonly' : ''
                }`}
                aria-current={estaActiva}
              >
                {fase.nombre || `Fase ${fase.id}`}
              </div>

              {/* Separador visual entre fases */}
              {indice < listaDeFases.length - 1 && (
                <span className="ft-tab-separator" />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Contenido de la fase activa: lista de tareas + checkbox */}
      <div>
        <ul className="ft-tareas-list">
          {/* Si no tiene permiso o el rol esta inactivo, mensaje de acceso restringido */}
          {!canViewTasks || rolActivo === false ? (
            <div className="ft-access-msg">No tienes permiso para ver las tareas de este producto.</div>
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
                <li key={tarea.id} className="ft-tarea-item">
                  {/* Numero de orden + nombre de la tarea */}
                  <div className="ft-tarea-info">
                    <div className="ft-tarea-index">{indice + 1}</div>
                    <div className="ft-tarea-nombre">{tarea.nombre || `Tarea ${tarea.id}`}</div>
                  </div>

                  {/* Checkbox de completada / no completada */}
                  <div className="ft-tarea-check">
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
              <div className="ft-correo">
                <button
                  onClick={() => {
                    if (!canUpdateTasks) return
                    if (faseActiva) sendToSupervisors(faseActiva)
                  }}
                  disabled={!puedeEnviarCorreo}
                  className={`ft-correo-btn ${puedeEnviarCorreo ? 'is-enabled' : 'is-disabled'}`}
                >
                  {correosEnviados[faseActivaId]
                    ? 'Correo enviado'
                    : 'Enviar correo a Supervisores'}
                </button>

                {/* Modal para elegir destinatario cuando hay varios correos de supervisores */}
                {emailPicker.visible && emailPicker.destinatarios.length > 1 && (
                  <div className="ft-modal-backdrop">
                    <div className="ft-modal">
                      {/* Cabecera del modal */}
                      <div className="ft-modal__header">
                        <div className="ft-modal__title">Elige destinatario</div>
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
                          className="ft-modal__close"
                          aria-label="Cerrar selector de email"
                        >
                          X
                        </button>
                      </div>

                      {/* Listado de correos posibles + bot?n de cancelar */}
                      <div className="ft-modal__content">
                        <div className="ft-modal__field">
                          <label className="ft-modal__label">Destinatario</label>
                          <div className="ft-modal__select-row">
                            <select
                              value={destinatarioSeleccionado}
                              onChange={(e) => setDestinatarioSeleccionado(e.target.value)}
                              className="ft-modal__select"
                            >
                              {emailPicker.destinatarios.map((destinatario) => (
                                <option key={destinatario} value={destinatario}>
                                  {destinatario}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                if (!destinatarioSeleccionado) return
                                setDestinatariosElegidos((prev) =>
                                  prev.includes(destinatarioSeleccionado)
                                    ? prev
                                    : [...prev, destinatarioSeleccionado]
                                )
                              }}
                              className="ft-modal__add-btn"
                            >
                              Anadir
                            </button>
                          </div>
                        </div>

                        {destinatariosElegidos.length > 0 && (
                          <div className="ft-modal__chips">
                            {destinatariosElegidos.map((dest) => (
                              <div key={dest} className="ft-modal__chip">
                                <span className="ft-modal__chip-label">{dest}</span>
                                <button
                                  onClick={() =>
                                    setDestinatariosElegidos((prev) =>
                                      prev.filter((correo) => correo !== dest)
                                    )
                                  }
                                  className="ft-modal__chip-remove"
                                  aria-label={`Quitar ${dest}`}
                                >
                                  X
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="ft-modal__actions">
                          <button
                            onClick={() => {
                              if (!emailPicker.fase || destinatariosElegidos.length === 0) return
                              continuarEnvioCorreo(destinatariosElegidos)
                            }}
                            disabled={destinatariosElegidos.length === 0}
                            className={`ft-modal__btn ft-modal__btn--primary ${
                              destinatariosElegidos.length === 0 ? 'is-disabled' : ''
                            }`}
                          >
                            Enviar seleccionados
                          </button>
                          <button
                            onClick={() => {
                              if (!emailPicker.fase) return
                              continuarEnvioCorreo(emailPicker.destinatarios)
                            }}
                            className="ft-modal__btn ft-modal__btn--outline"
                          >
                            Enviar a todos
                          </button>
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
                          className="ft-modal__cancel"
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