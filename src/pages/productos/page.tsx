import React, { useEffect, useMemo, useState, useRef } from 'react'
import '../../styles/layout.scss'
import '../../styles/_main.scss'
import Editar from './editar'
import { useLocation } from 'react-router-dom'
import DataTable, { ColumnDef } from '../../components/data-table/DataTable'
import productosAPI from '../../api-endpoints/productos/index'
import TableToolbar from '../../components/data-table/TableToolbar'

export default function PageProductos() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const idFromQuery = params.get('id') || undefined

  const [productos, setProductos] = useState<any[]>([])
  const [cargando, setLoading] = useState(false)
  const [mensajeError, setError] = useState<string | null>(null)
  const [idSeleccionado, setSelectedId] = useState<string | undefined>(idFromQuery || undefined)
  // Columnas explícitas para Productos — ajusta las keys según tu esquema (tamaño vs tamaño con ñ)
  const [columnasDefinicion] = useState<ColumnDef<any>[]>([
    { key: 'nombre', title: 'Nombre', sortable: true },
    { key: 'estadoId', title: 'EstadoId', sortable: true },
    { key: 'anyo', title: 'Año', sortable: true },
    { key: 'descripcion', title: 'Descripción', sortable: false },
    { key: 'color', title: 'Color', sortable: true },
    // Nota: la base de datos usa la columna `tamaño` (con ñ). 
    // Pero la api lo devuelve como tamaO.
    { key: 'tamaO', title: 'Tamaño', sortable: true },
    { key: 'dimension', title: 'Dimensión', sortable: true },
    { key: 'material1', title: 'Material 1', sortable: true },
    { key: 'material2', title: 'Material 2', sortable: true },
    { key: 'material3', title: 'Material 3', sortable: true },
    { key: 'esElectricoSn', title: 'Eléctrico', sortable: true },
    { key: 'esBiodegradableSn', title: 'Biodegradable', sortable: true },
    { key: 'imagen', title: 'Imagen', sortable: false },
  ])
  const tableRef = useRef<any | null>(null)
  const [globalFilter, setGlobalFilter] = useState<string>('')

  useEffect(() => { setSelectedId(idFromQuery || undefined) }, [idFromQuery])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    productosAPI.findProductos()
      .then(list => {
        if (!mounted) return
        setProductos(list || [])
      })
      .catch(e => { console.error(e); if (mounted) setError(e?.message || 'Error cargando productos') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const columns = useMemo(() => (columnasDefinicion.length ? columnasDefinicion : [{ key: 'id', title: 'ID' }]), [columnasDefinicion])

  return (
    <div style={{ padding: 16 }}>
      <h2>Productos</h2>
      {cargando && <div>Cargando productos...</div>}
      {mensajeError && <div style={{ color: 'red' }}>{mensajeError}</div>}
      {!cargando && !mensajeError && (
        <div className="tabla-personalizada">
          <TableToolbar
            title="Productos"
            onNew={() => setSelectedId('')}
            onDownloadCSV={() => tableRef.current?.downloadCSV()}
            globalFilter={globalFilter}
            setGlobalFilter={(v: string) => { setGlobalFilter(v); tableRef.current?.setGlobalFilter(v) }}
            clearFilters={() => tableRef.current?.clearFilters()}
          />

          <div className="tabla-contenido">
            <DataTable
              ref={tableRef}
              columns={columns}
              data={productos}
              pageSize={10}
              onRowClick={(r) => setSelectedId(String(r.id || r._id || ''))}
              onNew={() => setSelectedId('')}
            />
          </div>
        </div>
      )}

      {idSeleccionado !== undefined && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setSelectedId(undefined)} style={{ marginBottom: 12 }}>← Volver a la lista</button>
          <Editar productId={idSeleccionado} />
        </div>
      )}
    </div>
  )
}
