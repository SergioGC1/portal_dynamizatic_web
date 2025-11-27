import React from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import '../../../styles/paneles/PanelRol.scss';
import '../../../styles/pages/EditarDatosRoles.scss';

interface FormularioRol {
  id?: number | string;
  nombre?: string;
  activoSn?: string;
  activo?: boolean | string;
  [clave: string]: any;
}

type PropsVistaRol = {
  formulario: FormularioRol;
  errores: Record<string, string>;
  cargando: boolean;
  modo: 'ver' | 'editar';
  esPanel: boolean;
  onCampoChange: (campo: string, valor: any) => void;
  onEstadoChange: (evento: any) => void;
  onGuardarClick: () => void;
  onCerrarClick?: () => void;
};

export default function EditarDatosRolesVista({
  formulario,
  errores,
  cargando,
  modo,
  esPanel,
  onCampoChange,
  onEstadoChange,
  onGuardarClick,
  onCerrarClick,
}: PropsVistaRol) {
  const estaEnModoVer = modo === 'ver';
  const estaActivo =
    String(formulario?.activoSn ?? '').toUpperCase() === 'S' ||
    Boolean(formulario?.activo);
  const titulo = estaEnModoVer ? 'Ver Rol' : 'Editar Rol';

  return (
    <div className="record-panel roles-editar__panel">
      <div className="record-panel__header">
        <strong className="record-panel__title">{titulo}</strong>
        <div className="record-panel__controls">
          {!estaEnModoVer && (
            <Button
              label="Guardar"
              onClick={onGuardarClick}
              className="roles-editar__guardar-btn"
              disabled={cargando}
            />
          )}
          {esPanel && <Button label="Cerrar" onClick={onCerrarClick} className="p-button-secondary" />}
        </div>
      </div>

      {cargando && <div className="roles-editar__loading">Cargando...</div>}
      {errores.general && <div className="roles-editar__error">{errores.general}</div>}

      <div className="record-panel__top">
        <div className="record-panel__main-title record-panel__main-title--full">
          <label htmlFor="nombreRol" className="record-panel__label">
            Nombre del rol
          </label>
          <input
            id="nombreRol"
            value={formulario?.nombre ?? ''}
            onChange={(evento) => onCampoChange('nombre', evento.target.value)}
            className={`record-panel__input ${errores.nombre ? 'record-panel__input--error' : ''}`}
            disabled={cargando || estaEnModoVer}
          />
          {errores.nombre && <div className="roles-editar__field-error">{errores.nombre}</div>}
        </div>
      </div>

      <div className="record-panel__field">
        <label className="record-panel__label">Estado</label>
        <div className="roles-editar__estado-row">
          <InputSwitch
            checked={estaActivo}
            onChange={(e: any) => {
              if (onEstadoChange) onEstadoChange(e);
            }}
            disabled={cargando || estaEnModoVer}
          />
          <span className="roles-editar__estado-text">
            {estaActivo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>
    </div>
  );
}
