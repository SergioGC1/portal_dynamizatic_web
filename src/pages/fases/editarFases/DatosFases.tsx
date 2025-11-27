import React from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import '../../../components/ui/GestorEditores.css';
import '../../../styles/paneles/PanelFase.scss';

interface FaseFormulario {
  id?: number;
  nombre?: string;
  codigo?: string;
  descripcion?: string;
  activo?: string;
  activoSn?: string;
  orden?: number;
  [clave: string]: any;
}

interface TareaFase {
  id?: number;
  faseId: number;
  nombre: string;
}

type ModoDialogo = 'nuevo' | 'editar' | null;

type PropsVistaFase = {
  modo: 'ver' | 'editar';
  formulario: FaseFormulario;
  errores: Record<string, string>;
  onCampoChange: (campo: string, valor: any) => void;
  onGuardarClick: () => void;
  onCerrarClick?: () => void;
  puedeVerTareas: boolean;
  puedeCrearTareas: boolean;
  puedeEditarTareas: boolean;
  puedeEliminarTareas: boolean;
  hayFaseSeleccionada: boolean;
  tareas: TareaFase[];
  onNuevaTareaClick: () => void;
  onEditarTareaClick: (tarea: TareaFase) => void;
  onEliminarTareaClick: (tarea: TareaFase) => void;
  dialogoVisible: boolean;
  modoDialogo: ModoDialogo;
  nombreTarea: string;
  onNombreTareaChange: (valor: string) => void;
  onDialogoGuardar: () => void;
  onDialogoCerrar: () => void;
  guardandoTarea: boolean;
  toastRef: React.RefObject<Toast | null>;
};

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
  const textoContadorTareas = puedeVerTareas ? ` (${tareas.length})` : '';

  return (
    <>
      <div className="record-panel">
        <Toast ref={toastRef} />
        <div className="record-panel__header">
          <strong className="record-panel__title">{modo === 'ver' ? 'Ver fase' : 'Editar fase'}</strong>
          <div className="record-panel__controls">
            {modo === 'editar' && (
              <Button label="Guardar" onClick={onGuardarClick} style={{ marginRight: 8 }} />
            )}
            <Button label="Cerrar" onClick={onCerrarClick} className="p-button-secondary" />
          </div>
        </div>

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

        <div className="record-panel__grid">
          <div className="record-panel__field" style={{ gridColumn: '1 / -1' }}>
            <label className="record-panel__label">Código de la Fase</label>
            <input
              value={formulario?.codigo ?? ''}
              onChange={(evento) => onCampoChange('codigo', evento.target.value)}
              className={`record-panel__input ${errores.codigo ? 'record-panel__input--error' : ''}`}
              style={{ width: '100%' }}
              disabled={modo === 'ver'}
            />
            {errores.codigo && <div className="record-panel__error">{errores.codigo}</div>}
          </div>
        </div>

        {hayFaseSeleccionada && (
          <div className="record-panel__grid" style={{ marginTop: 20, gridColumn: '1 / -1', width: '100%' }}>
            <div className="panel-fase__gestion-tareas" style={{ gridColumn: '1 / -1' }}>
              <div
                className="panel-fase__encabezado-tareas"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
              >
                <h4 style={{ margin: 0 }}>Tareas de la Fase{textoContadorTareas}</h4>
                {puedeCrearTareas && (
                  <Button label="Nueva Tarea" icon="pi pi-plus" onClick={onNuevaTareaClick} className="p-button-sm" />
                )}
              </div>

              {!puedeVerTareas ? (
                <div style={{ padding: 12, color: '#6c757d' }}>No tienes permiso para ver las tareas de esta fase.</div>
              ) : tareas.length === 0 ? (
                <div
                  className="panel-fase__sin-tareas"
                  style={{ textAlign: 'center', padding: 20, backgroundColor: '#f8f9fa', borderRadius: 6 }}
                >
                  <i className="pi pi-list" style={{ fontSize: '2em', color: '#6c757d', marginBottom: 8 }}></i>
                  <p style={{ margin: 0, color: '#6c757d' }}>No hay tareas definidas para esta fase.</p>
                  {puedeCrearTareas && (
                    <small style={{ color: '#6c757d' }}>Haz clic en "Nueva Tarea" para agregar una.</small>
                  )}
                </div>
              ) : (
                <div className="panel-fase__lista-tareas" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tareas.map((tareaActual, indice) => (
                    <div
                      key={tareaActual.id || indice}
                      className="panel-fase__item-tarea"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        backgroundColor: '#f8f9fa',
                        borderRadius: 6,
                        border: '1px solid #dee2e6',
                      }}
                    >
                      <div
                        className="panel-fase__numero-tarea"
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
                          fontWeight: 'bold',
                        }}
                      >
                        {indice + 1}
                      </div>
                      <div className="panel-fase__contenido-tarea" style={{ flex: 1 }}>
                        <div className="panel-fase__nombre-tarea" style={{ fontWeight: 500 }}>
                          {tareaActual.nombre}
                        </div>
                      </div>
                      {(puedeEditarTareas || puedeEliminarTareas) && (
                        <div className="panel-fase__acciones-tarea" style={{ display: 'flex', gap: 4 }}>
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

      <Dialog
        header={modoDialogo === 'nuevo' ? 'Nueva Tarea' : 'Editar Tarea'}
        visible={dialogoVisible}
        style={{ width: '400px' }}
        onHide={onDialogoCerrar}
      >
        <div className="panel-fase__dialogo-tarea" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Nombre de la Tarea *</label>
            <input
              type="text"
              value={nombreTarea}
              onChange={(evento) => onNombreTareaChange(evento.target.value)}
              placeholder="Ingresa el nombre de la tarea"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '1em' }}
            />
          </div>

          <div className="panel-fase__botones-dialogo" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button label="Cancelar" icon="pi pi-times" className="p-button-secondary" onClick={onDialogoCerrar} />
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
  );
}
