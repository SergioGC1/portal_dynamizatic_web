import React from 'react'
import { Button } from 'primereact/button'
import { InputSwitch } from 'primereact/inputswitch'
import '../../../styles/paneles/PanelRol.scss'
import '../../../styles/pages/EditarDatosRoles.scss'

// Modelo del formulario de Rol
interface FormularioRol {
  id?: number | string
  nombre?: string
  activoSn?: string        // Campo típico 'S' / 'N' de BD
  activo?: boolean | string // Alternativa booleana que pueda venir del backend
  [clave: string]: any
}

// Props del componente de vista de edición/visualización de roles
type PropsVistaRol = {
  formulario: FormularioRol
  errores: Record<string, string>
  cargando: boolean
  modo: 'ver' | 'editar'   // 'ver' = solo lectura, 'editar' = formulario editable
  esPanel: boolean         // true si se muestra en panel lateral, false si es página
  onCampoChange: (campo: string, valor: any) => void
  onEstadoChange: (evento: any) => void
  onGuardarClick: () => void
  onCerrarClick?: () => void
}

export default function EditarDatosRolesVista({
  formulario,
  errores,
  cargando,
  modo,
  esPanel,
  onCampoChange,
  onEstadoChange,
  onGuardarClick,
  onCerrarClick
}: PropsVistaRol) {
  // Flags de estado visual
  const estaEnModoVer = modo === 'ver'

  // Estado "activo" unificado: acepta activoSn = 'S' o activo = true
  const estaActivo =
    String(formulario?.activoSn ?? '').toUpperCase() === 'S' ||
    Boolean(formulario?.activo)

  const titulo = estaEnModoVer ? 'Ver rol' : 'Editar rol'

  return (
    <div className="record-panel roles-editar__panel">
      {/* Cabecera: título + botones de acción */}
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
          {esPanel && (
            <Button
              label="Cerrar"
              onClick={onCerrarClick}
              className="p-button-secondary"
            />
          )}
        </div>
      </div>

      {/* Mensajes de estado: cargando / error general */}
      {cargando && <div className="roles-editar__loading">Cargando...</div>}
      {errores.general && (
        <div className="roles-editar__error">{errores.general}</div>
      )}

      {/* Campo: nombre del rol */}
      <div className="record-panel__top">
        <div className="record-panel__main-title record-panel__main-title--full">
          <label htmlFor="nombreRol" className="record-panel__label">
            Nombre del rol
          </label>
          <input
            id="nombreRol"
            value={formulario?.nombre ?? ''}
            onChange={(evento) => onCampoChange('nombre', evento.target.value)}
            className={`record-panel__input ${
              errores.nombre ? 'record-panel__input--error' : ''
            }`}
            disabled={cargando || estaEnModoVer}
          />
          {errores.nombre && (
            <div className="record-panel__error">{errores.nombre}</div>
          )}
        </div>
      </div>

      {/* Campo: estado activo/inactivo con switch */}
      <div className="record-panel__field">
        <label className="record-panel__label">Estado</label>
        <div className="roles-editar__estado-row">
          <InputSwitch
            checked={estaActivo}
            onChange={(evento: any) => {
              if (onEstadoChange) onEstadoChange(evento)
            }}
            disabled={cargando || estaEnModoVer}
          />
          <span className="roles-editar__estado-text">
            {estaActivo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>
    </div>
  )
}
