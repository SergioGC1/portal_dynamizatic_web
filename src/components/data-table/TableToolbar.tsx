"use client"

import React from "react"
import { Button } from "primereact/button"
import { InputText } from "primereact/inputtext"

type TableToolbarProps = {
  title?: string
  onNew?: () => void
  onDownloadCSV?: () => void
  globalFilter: string
  setGlobalFilter: (v: string) => void
  clearFilters: () => void
  showSearchButton?: boolean
  puede?: { nuevo?: boolean }
}

/**
 * Barra de acciones reusable para las tablas.
 * Props:
 * - title: título a mostrar
 * - onNew: callback para crear nuevo registro
 * - onDownloadCSV: callback para descargar CSV
 * - globalFilter / setGlobalFilter: estado del filtro global (controlado por el padre)
 * - clearFilters: función para limpiar filtros
 */
export default function TableToolbar({
  title = "",
  onNew,
  onDownloadCSV,
  globalFilter,
  setGlobalFilter,
  clearFilters,
  showSearchButton = true,
  puede,
}: TableToolbarProps) {
  const permisoNuevo = puede?.nuevo ?? true

  return (
    <div className="tabla-toolbar">
      <div className="tabla-toolbar-left">
        {title && <span className="tabla-title">{title}</span>}
        {onNew && permisoNuevo && (
          <Button label="Nuevo" icon="pi pi-plus" severity="success" onClick={onNew} />
        )}
        <Button label="Descargar CSV" icon="pi pi-download" severity="success" onClick={onDownloadCSV} />
      </div>

      <div className="tabla-toolbar-right">
        <span className="p-input-icon-left tabla-search">
          <i className="pi pi-search" />
          <InputText
            placeholder="Buscar por palabra clave"
            value={globalFilter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
          />
        </span>
        {showSearchButton && <Button label="Buscar" icon="pi pi-search" />}
        <Button label="Limpiar filtros" icon="pi pi-filter-slash" severity="secondary" onClick={clearFilters} />
      </div>
    </div>
  )
}
