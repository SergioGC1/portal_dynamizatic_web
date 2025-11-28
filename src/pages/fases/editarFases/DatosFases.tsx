import React from 'react'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { Toast } from 'primereact/toast'
import '../../../components/ui/GestorEditores.css'
import '../../../styles/paneles/PanelFase.scss'
import '../../../styles/pages/DatosFases.scss'

// Datos básicos del formulario de Fase
interface FaseFormulario {
  id?: number
  nombre?: string
  codigo?: string
  descripcion?: string
  activo?: string
  activoSn?: string
  orden?: number
  [clave: string]: any
}

// Tarea asociada a una fase
interface TareaFase {
  id?: number
  faseId: number
  nombre: string
}

type ModoDialogo = 'nuevo' | 'editar' | null

// Props de la vista pura de edición de fases
type PropsVistaFase = {
  modo: 'ver' | 'editar'
  formulario: FaseFormulario
  errores: Record<string, string>
  onCampoChange: (campo: string, valor: any) => void
  onGuardarClick: () => void
  onCerrarClick?: () => void
  puedeVerTareas: boolean
  puedeCrearTareas: boolean
  puedeEditarTareas: boolean
  puedeEliminarTareas: boolean
  hayFaseSeleccionada: boolean
  tareas: TareaFase[]
  onNuevaTareaClick: () => void
  onEditarTareaClick: (tarea: TareaFase) => void
  onEliminarTareaClick: (tarea: TareaFase) => void
  dialogoVisible: boolean
  modoDialogo: ModoDialogo
  nombreTarea: string
  onNombreTareaChange: (valor: string) => void
  onDialogoGuardar: () => void
  onDialogoCerrar: () => void
  guardandoTarea: boolean
  toastRef: React.RefObject<Toast | null>
}

// Vista puramente de presentación: campos + listado de tareas + diálogo
export default function EditarDatosFasesVista({
  modo,
  formulario,
  errores,
  onCampoChange,
  onGuardarClick,
  onCerrarClick = () => {},
  puedeVerTareas,
  puedeCrearTareas,
  puedeEditarTareas,
  puedeEliminarTareas,
  hayFaseSeleccionada,
  tareas,
  onNuevaTareaClick,
  onEditarTareaClick,
  onEliminarTareaClick,
  dialogoVisible,
  modoDialogo,
  nombreTarea,
  onNombreTareaChange,
  onDialogoGuardar,
  onDialogoCerrar,
  guardandoTarea,
  toastRef,
}: PropsVistaFase) {
  const textoContadorTareas = puedeVerTareas ? ` (${tareas.length})` : ''

  return (
    <>
      <div className="record-panel panel-fase">
        {/* Toast para avisos de permisos/errores leves */}
        <Toast ref={toastRef} />

        {/* Cabecera: título + botones Guardar / Cerrar */}
        <div className="record-panel__header">
          <strong className="record-panel__title">
            {modo === 'ver' ? 'Ver fase' : 'Editar fase'}
          </strong>
          <div className="record-panel__controls">
            {modo === 'editar' && (
              <Button
                label="Guardar"
                onClick={onGuardarClick}
                className="panel-fase__guardar-btn"
              />
            )}
            <Button label="Cerrar" onClick={onCerrarClick} className="p-button-secondary" />
          </div>
        </div>

        {/* Bloque principal: nombre de la fase */}
        <div className="record-panel__top">
          <div className="record-panel__main-title record-panel__main-title--full">
            <label className="record-panel__label">Nombre de la fase</label>
            <input
              value={formulario?.nombre ?? ''}
              onChange={(evento: React.ChangeEvent<HTMLInputElement>) =>
                onCampoChange('nombre', evento.target.value)
              }
              className={`record-panel__input record-panel__product-name-input ${
                errores.nombre ? 'record-panel__input--error' : ''
              }`}
              disabled={modo === 'ver'}
            />
            {errores.nombre && <div className="record-panel__error">{errores.nombre}</div>}
          </div>
        </div>

        {/* Código de la fase */}
        <div className="record-panel__grid">
          <div className="record-panel__field panel-fase__field--full">
            <label className="record-panel__label">Código de la Fase</label>
            <input
              value={formulario?.codigo ?? ''}
              onChange={(evento) => onCampoChange('codigo', evento.target.value)}
              className={`record-panel__input ${
                errores.codigo ? 'record-panel__input--error' : ''
              }`}
              disabled={modo === 'ver'}
            />
            {errores.codigo && <div className="record-panel__error">{errores.codigo}</div>}
          </div>
        </div>

        {/* Gestión de tareas: solo si la fase ya existe (tiene id) */}
        {hayFaseSeleccionada && (
          <div className="record-panel__grid panel-fase__tareas-grid">
            <div className="panel-fase__gestion-tareas">
              {/* Cabecera de tareas: título + botón "Nueva tarea" */}
              <div className="panel-fase__encabezado-tareas">
                <h4 className="panel-fase__titulo-tareas">
                  Tareas de la Fase{textoContadorTareas}
                </h4>
                {puedeCrearTareas && (
                  <Button
                    label="Nueva Tarea"
                    icon="pi pi-plus"
                    onClick={onNuevaTareaClick}
                    className="p-button-sm"
                  />
                )}
              </div>

              {/* Mensajes según permisos / número de tareas */}
              {!puedeVerTareas ? (
                <div className="panel-fase__mensaje-sin-permisos">
                  No tienes permiso para ver las tareas de esta fase.
                </div>
              ) : tareas.length === 0 ? (
                <div className="panel-fase__sin-tareas">
                  <i className="pi pi-list panel-fase__sin-tareas-icon" />
                  <p className="panel-fase__sin-tareas-text">
                    No hay tareas definidas para esta fase.
                  </p>
                  {puedeCrearTareas && (
                    <small className="panel-fase__sin-tareas-hint">
                      Haz clic en &quot;Nueva Tarea&quot; para agregar una.
                    </small>
                  )}
                </div>
              ) : (
                // Lista de tareas existentes
                <div className="panel-fase__lista-tareas">
                  {tareas.map((tareaActual, indice) => (
                    <div
                      key={tareaActual.id || indice}
                      className="panel-fase__item-tarea"
                    >
                      {/* Número de orden visual de la tarea */}
                      <div className="panel-fase__numero-tarea">
                        {indice + 1}
                      </div>

                      {/* Nombre de la tarea */}
                      <div className="panel-fase__contenido-tarea">
                        <div className="panel-fase__nombre-tarea">
                          {tareaActual.nombre}
                        </div>
                      </div>

                      {/* Acciones de cada tarea (editar / eliminar) según permisos */}
                      {(puedeEditarTareas || puedeEliminarTareas) && (
                        <div className="panel-fase__acciones-tarea">
                          {puedeEditarTareas && (
                            <Button
                              icon="pi pi-pencil"
                              className="p-button-text p-button-sm"
                              onClick={() => onEditarTareaClick(tareaActual)}
                              tooltip="Editar tarea"
                            />
                          )}
                          {puedeEliminarTareas && (
                            <Button
                              icon="pi pi-trash"
                              className="p-button-text p-button-sm p-button-danger"
                              onClick={() => onEliminarTareaClick(tareaActual)}
                              tooltip="Eliminar tarea"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Diálogo para crear/editar una tarea de fase */}
      <Dialog
        header={modoDialogo === 'nuevo' ? 'Nueva Tarea' : 'Editar Tarea'}
        visible={dialogoVisible}
        onHide={onDialogoCerrar}
        className="panel-fase__dialogo"
      >
        <div className="panel-fase__dialogo-tarea">
          <div>
            <label className="panel-fase__dialogo-label">
              Nombre de la Tarea *
            </label>
            <input
              type="text"
              value={nombreTarea}
              onChange={(evento) => onNombreTareaChange(evento.target.value)}
              placeholder="Ingresa el nombre de la tarea"
              className="panel-fase__dialogo-input"
            />
          </div>

          <div className="panel-fase__botones-dialogo">
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-secondary"
              onClick={onDialogoCerrar}
            />
            <Button
              label="Guardar"
              icon="pi pi-check"
              onClick={onDialogoGuardar}
              disabled={!nombreTarea.trim() || guardandoTarea}
              loading={guardandoTarea}
            />
          </div>
        </div>
      </Dialog>
    </>
  )
}
