import React, { useEffect, useMemo, useState, useRef } from 'react'
import '../../styles/layout.scss'
import '../../styles/_main.scss'
import RecordPanel from '../../components/ui/RecordPanel'
import DataTable, { ColumnDef } from '../../components/data-table/DataTable'
import productosAPI from '../../api-endpoints/productos/index'
import TableToolbar from '../../components/data-table/TableToolbar'

export default function PageProductos() {
  const [productos, setProductos] = useState<any[]>([])
  const [cargando, setLoading] = useState(false)
  const [mensajeError, setError] = useState<string | null>(null)
  
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
  // Estados del panel para ver/editar registros
  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null)
  const [registroPanel, setRegistroPanel] = useState<any | null>(null)

  // removed idFromQuery handling; panelMode drives view/edit

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
          {!modoPanel && (
            <>
              <TableToolbar
                title="Productos"
                onNew={() => { setModoPanel('editar'); setRegistroPanel({}) }}
                onDownloadCSV={() => tableRef.current?.downloadCSV()}
                globalFilter={globalFilter}
                setGlobalFilter={(v: string) => { setGlobalFilter(v); tableRef.current?.setGlobalFilter(v) }}
                clearFilters={() => tableRef.current?.clearFilters()}
              />

              <DataTable
                ref={tableRef}
                columns={columns}
                data={productos}
                pageSize={10}
                onNew={() => { setModoPanel('editar'); setRegistroPanel({}) }}
                onView={(r) => { setModoPanel('ver'); setRegistroPanel(r) }}
                onEdit={(r) => { setModoPanel('editar'); setRegistroPanel(r) }}
              />
            </>
          )}

          {modoPanel && registroPanel && (
            <RecordPanel
              mode={modoPanel}
              record={registroPanel}
              columns={columns}
              onClose={async () => {
                setModoPanel(null)
                setRegistroPanel(null)
                // recargar lista
                try {
                  const list = await productosAPI.findProductos()
                  setProductos(list || [])
                } catch (e) { console.error(e) }
              }}
              onSave={async (updated) => {
                try {
                  if (updated.id) await productosAPI.updateProductoById(updated.id, updated)
                  else await productosAPI.createProducto(updated)
                  setModoPanel(null)
                  setRegistroPanel(null)
                  const list = await productosAPI.findProductos()
                  setProductos(list || [])
                } catch (e) { console.error(e) }
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
