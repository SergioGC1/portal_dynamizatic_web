import React, { useState, useEffect } from 'react'
import { InputSwitch } from 'primereact/inputswitch'
import { ColumnDef } from '../../components/data-table/DataTable'
import Button from './Button'
import './RecordPanel.css'

// RecordPanel: componente reutilizable para ver/editar un registro.
// - Textos y comentarios en español.
// - Uso de genérico para soportar distintos tipos de registros.

type Modo = 'ver' | 'editar'

type Props<T = any> = {
    mode: Modo
    record?: T | null
    columns?: ColumnDef<any>[]
    onClose: () => void
    onSave?: (updated: T) => Promise<void>
}

export default function RecordPanel<T = any>({ mode, record = null, columns = [], onClose, onSave }: Props<T>) {
    // estado del formulario local
    const [form, setForm] = useState<T | Record<string, any>>({})

    useEffect(() => {
        setForm((record as any) || {})
    }, [record])

    // Cambia un campo del formulario
    const handleChange = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }))

    const save = async () => {
        if (onSave) await onSave(form as T)
    }

    const removeImage = () => {
        handleChange('imagen', '')
        setForm((s: any) => {
            const copy = { ...s }
            delete copy._imagenFile
            return copy
        })
    }



    // Determinar la clave del título (por ejemplo el nombre del usuario o producto).
    // Estrategia sencilla y explícita (fácil de entender para un developer junior):
    // 1) Si no hay columnas definidas, usamos 'nombre' por defecto.
    // 2) Buscamos la primera columna cuya key incluya palabras típicas de título
    //    ('nombre', 'name', 'titulo', 'title').
    // 3) Si no encontramos ninguna, usamos la primera columna disponible.
    const titleKey = (() => {
        if (!columns || columns.length === 0) return 'nombre'
        for (const c of columns) {
            const k = String(c.key).toLowerCase()
            if (k.includes('nombre') || k.includes('name') || k.includes('titulo') || k.includes('title')) {
                return c.key
            }
        }
        return columns[0].key || 'nombre'
    })()

    // Simplificamos: el campo de imagen se llama siempre `imagen`.
    const imageValue = (form as any)?.imagen

    // Determinar si la tabla (columns) declara la columna 'imagen'
    const hasImagenColumn = (columns || []).some((c) => String(c.key).toLowerCase() === 'imagen')

    // Mostrar el bloque de imagen sólo si:
    // - el registro ya tiene imagen, o
    // - estamos en modo 'editar' y la definición de columnas incluye 'imagen'.
    // Esto evita que entidades como Roles muestren el input de imagen si no corresponde.
    const shouldShowImage = Boolean(imageValue || (mode === 'editar' && hasImagenColumn))

    // campos a renderizar en el grid: todos excepto imagen, título y acciones
    const gridColumns = (columns || []).filter((c) => {
        const k = c.key.toLowerCase()
        if (k.includes('accion') || k.includes('acciones')) return false
        if (c.key === 'imagen') return false
        if (titleKey && c.key === titleKey) return false
        return true
    })

    const titleValue = (form as any)?.[titleKey]

    // Si no hay registro, no renderizamos nada (comprobación después de invocar hooks)
    if (!record) return null

    return (
        <div className="record-panel">
            <div className="record-panel__header">
                <strong className="record-panel__title">{mode === 'ver' ? 'Ver registro' : 'Editar registro'}</strong>
                <div className="record-panel__controls">
                    {mode === 'editar' && (
                        <Button label="Guardar" onClick={save} style={{ marginRight: 8 }} />
                    )}
                    <Button label="Cerrar" onClick={onClose} className="p-button-secondary" />
                </div>
            </div>

            {/* Top: imagen (izquierda) + título (derecha) */}
            <div className="record-panel__top">
                {shouldShowImage && (
                    <div className="record-panel__image-box--static">
                        {imageValue ? (
                            <img src={String(imageValue)} alt="imagen" className="record-panel__thumbnail" />
                        ) : (
                            <div className="record-panel__no-image">Sin imagen</div>
                        )}
                        {/* Icono de borrar sobre la imagen */}
                        {mode === 'editar' && (
                            <div className="record-panel__image-delete">
                                <Button label="" icon="pi pi-trash" onClick={removeImage} className="p-button-sm p-button-rounded p-button-danger" />
                            </div>
                        )}
                    </div>
                )}
                <div className={`record-panel__main-title ${shouldShowImage ? '' : 'record-panel__main-title--full'}`}>
                    {mode === 'editar' ? (
                        <>
                            <label className="record-panel__label">Nombre</label>
                            <input value={titleValue ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(titleKey || (columns[0] && columns[0].key) || 'nombre', e.target.value)} className="record-panel__input record-panel__product-name-input" />
                            {shouldShowImage && (
                                <div style={{ marginTop: 8 }}>
                                    <label className="record-panel__label">URL de imagen</label>
                                    <input value={imageValue ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('imagen', e.target.value)} className="record-panel__input record-panel__input--imageurl" placeholder="Pega aquí la URL de la imagen" />
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="record-panel__label">Nombre</div>
                            <div className="record-panel__value record-panel__value--view record-panel__product-name">{String(titleValue ?? '')}</div>
                            {imageValue && (
                                <div style={{ marginTop: 8 }}>
                                    <div className="record-panel__label">URL de imagen</div>
                                    <div className="record-panel__value record-panel__value--view">{String(imageValue ?? '')}</div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="record-panel__grid">
                {gridColumns.map((col) => {
                    const key = col.key
                    const label = (col as any).title || (col as any).label || key
                    const value = (form as any)?.[key]
                    const isActivo = key.toLowerCase().includes('activo')
                    return (
                        <div key={key} className="record-panel__field">
                            <label className="record-panel__label">{label}</label>
                                    {mode === 'ver' ? (
                                        isActivo ? (
                                            // En vista mostramos el switch en modo solo-lectura y la etiqueta
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <InputSwitch checked={String(value ?? '').toUpperCase() === 'S'} disabled />
                                                <span style={{ fontSize: 14 }}>{String(value ?? '').toUpperCase() === 'S' ? 'Activo' : 'Inactivo'}</span>
                                            </div>
                                        ) : (
                                            <div className="record-panel__value record-panel__value--view">{String(value ?? '')}</div>
                                        )
                                    ) : (
                                        isActivo ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <InputSwitch checked={String(value ?? '').toUpperCase() === 'S'} onChange={(e: any) => handleChange(key, e.value ? 'S' : 'N')} />
                                                <span style={{ fontSize: 14 }}>{String(value ?? '').toUpperCase() === 'S' ? 'Activo' : 'Inactivo'}</span>
                                            </div>
                                        ) : (
                                            <input value={value ?? ''} onChange={(e) => handleChange(key, (e.target as HTMLInputElement).value)} className="record-panel__input" />
                                        )
                                    )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
