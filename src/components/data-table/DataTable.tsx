"use client"

import React, { useMemo, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Button } from "primereact/button"
import { InputText } from "primereact/inputtext"
import { Dropdown } from "primereact/dropdown"
import { OverlayPanel } from "primereact/overlaypanel"
import "./DataTable.css"

export type ColumnDef<T = any> = {
  key: string
  title?: string
  label?: string
  body?: (row: T) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

type Props = {
  columns: ColumnDef<any>[]
  data: any[]
  pageSize?: number
  onRowClick?: (row: any) => void
  onNew?: () => void
  onDownloadCSV?: () => void
  onView?: (row: any) => void
  onEdit?: (row: any) => void
  onDelete?: (row: any) => void
}

export type DataTableHandle = {
  clearFilters: () => void
  downloadCSV: () => void
  setGlobalFilter: (v: string) => void
}

const DataTableAdaptado = forwardRef<DataTableHandle, Props>(function DataTableAdaptado(
  {
    columns,
    data,
    pageSize = 10,
    onRowClick,
    onNew,
    onDownloadCSV,
    onView,
    onEdit,
    onDelete,
  }: Props,
  ref,
) {
  const [globalFilter, setGlobalFilter] = useState("")
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [tempColumnFilters, setTempColumnFilters] = useState<Record<string, string>>({})
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<1 | -1>(-1)
  const [first, setFirst] = useState(0)
  const [rows, setRows] = useState(pageSize)
  const overlayRefs = React.useRef<Record<string, OverlayPanel | null>>({})

  // Inicializar orden por la primera columna (descendente)
  useEffect(() => {
    if (!sortField && columns && columns.length > 0) {
      setSortField(columns[0].key)
      setSortOrder(-1)
    }
  }, [columns, sortField])

  const clearFilters = useCallback(() => {
    setGlobalFilter("")
    setColumnFilters({})
    setTempColumnFilters({})
  }, [])

  const applyColumnFilter = (columnKey: string) => {
    setColumnFilters({
      ...columnFilters,
      [columnKey]: tempColumnFilters[columnKey] || "",
    })
    overlayRefs.current[columnKey]?.hide()
  }

  const clearColumnFilter = (columnKey: string) => {
    const newFilters = { ...columnFilters }
    delete newFilters[columnKey]
    setColumnFilters(newFilters)
    setTempColumnFilters({ ...tempColumnFilters, [columnKey]: "" })
    overlayRefs.current[columnKey]?.hide()
  }

  // Filtrado
  const filteredData = useMemo(() => {
    let result = [...data]

    // Filtro global
    if (globalFilter) {
      result = result.filter((row) =>
        columns.some((col) => {
          const value = row[col.key]
          return String(value || "")
            .toLowerCase()
            .includes(globalFilter.toLowerCase())
        }),
      )
    }

    // Filtros por columna
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue) {
        result = result.filter((row) =>
          String(row[key] || "")
            .toLowerCase()
            .includes(filterValue.toLowerCase()),
        )
      }
    })

    return result
  }, [data, globalFilter, columnFilters, columns])

  // Ordenamiento
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue === bValue) return 0
      if (aValue == null) return sortOrder
      if (bValue == null) return -sortOrder

      // Intentar comparación numérica
      const aNum = Number(aValue)
      const bNum = Number(bValue)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return (aNum - bNum) * sortOrder
      }

      // Comparación de strings
      return String(aValue).localeCompare(String(bValue)) * sortOrder
    })
  }, [filteredData, sortField, sortOrder])

  const handleDownloadCSV = useCallback(() => {
    if (onDownloadCSV) return onDownloadCSV()

    // Generar CSV con separador ';'
    const cols = columns.map((c) => c.key)
    const header = columns.map((c) => c.label || c.title || c.key).join(";")
    const rows = sortedData.map((r) => cols.map((k) => `"${String(r[k] || "").replace(/"/g, '""')}"`).join(";"))
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "export.csv"
    a.click()
    URL.revokeObjectURL(url)
  }, [onDownloadCSV, columns, sortedData])

  // Exponer funciones útiles al padre mediante ref
  useImperativeHandle(ref, () => ({
    clearFilters,
    downloadCSV: handleDownloadCSV,
    setGlobalFilter: (v: string) => setGlobalFilter(v),
  }), [clearFilters, handleDownloadCSV])

  const onSort = (e: any) => {
    setSortField(e.sortField)
    setSortOrder(e.sortOrder)
  }

  const onPage = (e: any) => {
    setFirst(e.first)
    setRows(e.rows)
  }

  // Template para el header con filtro
  const filterHeaderTemplate = (col: ColumnDef) => {
    return (
      <div className="tabla-header-container">
        <div className="tabla-header-content">
          <span className="tabla-header-label">{col.label || col.title || col.key}</span>
          {col.filterable !== false && (
            <>
              <Button
                icon={columnFilters[col.key] ? "pi pi-filter-fill" : "pi pi-filter"}
                className={`tabla-filter-btn ${columnFilters[col.key] ? "active" : ""}`}
                text
                rounded
                onClick={(e) => overlayRefs.current[col.key]?.toggle(e)}
              />
              <OverlayPanel ref={(el) => { overlayRefs.current[col.key] = el }} className="tabla-filter-panel">
                <div className="tabla-filter-content">
                  <InputText
                    placeholder={`Buscar por ${(col.label || col.title || col.key).toLowerCase()}`}
                    value={tempColumnFilters[col.key] || columnFilters[col.key] || ""}
                    onChange={(e) =>
                      setTempColumnFilters({
                        ...tempColumnFilters,
                        [col.key]: e.target.value,
                      })
                    }
                    className="tabla-filter-input"
                  />
                  <div className="tabla-filter-actions">
                    <Button
                      label="Limpiar"
                      severity="secondary"
                      size="small"
                      onClick={() => clearColumnFilter(col.key)}
                    />
                    <Button label="Aplicar" size="small" onClick={() => applyColumnFilter(col.key)} />
                  </div>
                </div>
              </OverlayPanel>
            </>
          )}
        </div>
      </div>
    )
  }

  // Template para las acciones
  const actionsBodyTemplate = (rowData: any) => {
    return (
      <div className="tabla-actions">
        {onView && (
          <Button
            icon="pi pi-eye"
            rounded
            text
            severity="info"
            onClick={(e) => {
              e.stopPropagation()
              onView(rowData)
            }}
            tooltip="Ver"
            tooltipOptions={{ position: "top" }}
          />
        )}
        {onEdit && (
          <Button
            icon="pi pi-pencil"
            rounded
            text
            severity="warning"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(rowData)
            }}
            tooltip="Editar"
            tooltipOptions={{ position: "top" }}
          />
        )}
        {onDelete && (
          <Button
            icon="pi pi-trash"
            rounded
            text
            severity="danger"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(rowData)
            }}
            tooltip="Eliminar"
            tooltipOptions={{ position: "top" }}
          />
        )}
      </div>
    )
  }

  const paginatorTemplate = {
    layout: "RowsPerPageDropdown PrevPageLink PageLinks NextPageLink CurrentPageReport ",
    RowsPerPageDropdown: (options: any) => {
      const dropdownOptions = [
        { label: "5", value: 5 },
        { label: "10", value: 10 },
        { label: "20", value: 20 },
      ]

      return (
        <div className="tabla-paginator-dropdown">
          <Dropdown value={options.value} options={dropdownOptions} onChange={options.onChange} />
        </div>
      )
    },
    CurrentPageReport: (options: any) => {
      return (
        <span className="tabla-paginator-info">
          Mostrando {options.first + 1} a {Math.min(options.first + options.rows, options.totalRecords)} de{" "}
          {options.totalRecords} registros
        </span>
      )
    },
  }

  return (
    // DataTable de PrimeReact — el contenedor visual queda a cargo de la página que lo use
    <DataTable
      value={sortedData}
      paginator
      rows={rows}
      first={first}
      onPage={onPage}
      paginatorTemplate={paginatorTemplate}
      rowsPerPageOptions={[5, 10, 20]}
      sortField={sortField || undefined}
      sortOrder={sortOrder}
      onSort={onSort}
      onRowClick={onRowClick ? (e) => onRowClick(e.data) : undefined}
      className="tabla-datatable"
      emptyMessage="No se encontraron registros"
    >
      {columns.map((col) => (
        <Column
          key={col.key}
          field={col.key}
          header={filterHeaderTemplate(col)}
          body={col.render ? (rowData) => col.render!(rowData[col.key], rowData) : undefined}
          sortable={col.sortable !== false}
        />
      ))}
      {(onView || onEdit || onDelete) && (
        <Column header="Acciones" body={actionsBodyTemplate} style={{ width: "150px", textAlign: "center" }} />
      )}
    </DataTable>
  )
})

export default DataTableAdaptado
