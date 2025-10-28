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

    const removeImage = () => {
        handleChange('imagen', '')
        setForm((s: any) => {
            const copy = { ...s }
            delete copy._imagenFile
            return copy
        })
    }

    if (!record) return null

    // Determinar la clave del título (nombre del producto) y de la imagen, si existen
    const titleKey = columns.find((c) => /nombre|name|titulo|title/i.test(c.key))?.key || columns[0]?.key
    const imageKey = columns.find((c) => /imagen|image|foto|fotoUrl|imagenUrl/i.test(c.key))?.key

    // campos a renderizar en el grid: todos excepto imagen, título y acciones
    const gridColumns = columns.filter((c) => {
        const k = c.key.toLowerCase()
        if (k.includes('accion') || k.includes('acciones')) return false
        if (imageKey && c.key === imageKey) return false
        if (titleKey && c.key === titleKey) return false
        return true
    })

    const titleValue = form?.[titleKey]
    const imageValue = imageKey ? form?.[imageKey] : form?.imagen

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

            {/* Top: imagen (izquierda) + título (derecha) */}
            <div className="record-panel__top">
                <div className="record-panel__image-box--static">
                    {imageValue ? (
                        <img src={String(imageValue)} alt="imagen" className="record-panel__thumbnail" />
                    ) : (
                        <div className="record-panel__no-image">No imagen</div>
                    )}
                    {/* Icono de borrar sobre la imagen */}
                    {mode === 'edit' && (
                        <div className="record-panel__image-delete">
                            <Button label="" icon="pi pi-trash" onClick={removeImage} className="p-button-sm p-button-rounded p-button-danger" />
                        </div>
                    )}
                </div>
                <div className="record-panel__main-title">
                    {mode === 'edit' ? (
                        <>
                            <label className="record-panel__label">Nombre</label>
                            <input value={titleValue ?? ''} onChange={(e) => handleChange(titleKey || columns[0].key, e.target.value)} className="record-panel__input record-panel__product-name-input" />
                            <div style={{ marginTop: 8 }}>
                                <label className="record-panel__label">URL de imagen</label>
                                <input value={imageValue ?? ''} onChange={(e) => handleChange(imageKey || 'imagen', e.target.value)} className="record-panel__input record-panel__input--imageurl" placeholder="Pega aquí la URL de la imagen" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="record-panel__label">Nombre</div>
                            <div className="record-panel__value record-panel__value--view record-panel__product-name">{String(titleValue ?? '')}</div>
                            <div style={{ marginTop: 8 }}>
                                <div className="record-panel__label">URL de imagen</div>
                                <div className="record-panel__value record-panel__value--view">{String(imageValue ?? '')}</div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="record-panel__grid">
                {gridColumns.map((col) => {
                    const key = col.key
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
