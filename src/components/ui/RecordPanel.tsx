import React, { useState, useEffect } from 'react'
import { InputSwitch } from 'primereact/inputswitch'
import { ColumnDef } from '../../components/data-table/DataTable'
import Button from './Button'
import './RecordPanel.css'

// RecordPanel: componente reutilizable para ver/editar un registro.
// - Mantener nombres de props en inglés para compatibilidad con otros componentes.
// - Variables internas y comentarios en español para facilitar mantenimiento.

type Mode = 'view' | 'edit'

type Props = {
  mode: Mode
  record: any
  columns: ColumnDef<any>[]
  onClose: () => void
  onSave?: (updated: any) => Promise<void>
}

export default function RecordPanel({ mode, record, columns, onClose, onSave }: Props) {
  // estado del formulario local
  const [form, setForm] = useState<any>({})
  useEffect(() => {
    setForm(record || {})
  }, [record])

  // Cambia un campo del formulario
  const handleChange = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }))

  const save = async () => {
    if (onSave) await onSave(form)
  }

  if (!record) return null

  return (
    <div className="record-panel">
      <div className="record-panel__header">
        <strong className="record-panel__title">{mode === 'view' ? 'Ver registro' : 'Editar registro'}</strong>
        <div className="record-panel__controls">
          {mode === 'edit' && (
            <Button label="Guardar" onClick={save} style={{ marginRight: 8 }} />
          )}
          <Button label="Cerrar" onClick={onClose} className="p-button-secondary" />
        </div>
      </div>

      <div className="record-panel__grid">
        {columns.map((col) => {
          const key = col.key
          // no mostrar columna de acciones en el panel
          if (key.toLowerCase().includes('accion') || key.toLowerCase().includes('acciones')) return null
          const label = col.title || col.label || key
          const value = form?.[key]
          const isActivo = key.toLowerCase().includes('activo')
          return (
            <div key={key} className="record-panel__field">
              <label className="record-panel__label">{label}</label>
              {mode === 'view' ? (
                <div className="record-panel__value record-panel__value--view">{String(value ?? '')}</div>
              ) : (
                isActivo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <InputSwitch checked={String(value ?? '').toUpperCase() === 'S'} onChange={(e: any) => handleChange(key, e.value ? 'S' : 'N')} />
                    <span style={{ fontSize: 14 }}>{String(value ?? '').toUpperCase() === 'S' ? 'Activo' : 'Inactivo'}</span>
                  </div>
                ) : (
                  <input value={value ?? ''} onChange={(e) => handleChange(key, e.target.value)} className="record-panel__input" />
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
