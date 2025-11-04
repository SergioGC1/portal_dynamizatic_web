import React, { useMemo, useState, useRef } from 'react'
import '../../styles/layout.scss'
import '../../styles/_main.scss'
import RecordPanel from '../../components/ui/RecordPanel'
import DataTable, { ColumnDef } from '../../components/data-table/DataTable'
import productosAPI from '../../api-endpoints/productos/index'
import TableToolbar from '../../components/ui/TableToolbar'
import usePermisos from '../../hooks/usePermisos'

export default function PageProductos() {
  const [productos, setProductos] = useState<any[]>([])
  const [cargando, setLoading] = useState(false)
  const [mensajeError, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false) // Indica si ya se ha realizado una búsqueda
  
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

  const { hasPermission } = usePermisos()

  // Función para cargar productos - solo cuando el usuario busque
  const loadProductos = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await productosAPI.findProductos()
      setProductos(list || [])
      setHasSearched(true) // Marcar que ya se ha realizado una búsqueda
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Error cargando productos')
    } finally {
      setLoading(false)
    }
  }

  // NOTA: No cargamos datos automáticamente - solo cuando el usuario presiona "Buscar"

  const columns = useMemo(() => (columnasDefinicion.length ? columnasDefinicion : [{ key: 'id', title: 'ID' }]), [columnasDefinicion])

  return (
    <div style={{ padding: 16 }}>
      {mensajeError && <div style={{ color: 'red' }}>{mensajeError}</div>}
      
      <div className="tabla-personalizada">
        {!modoPanel && (
          <>
            <TableToolbar
              title="Productos"
              onNew={() => { setModoPanel('editar'); setRegistroPanel({}) }}
              puede={{ nuevo: hasPermission('Productos', 'Nuevo') }}
              onDownloadCSV={() => tableRef.current?.downloadCSV()}
              onSearch={loadProductos} // Conectar búsqueda con loadProductos
              globalFilter={globalFilter}
              setGlobalFilter={(v: string) => { 
                setGlobalFilter(v); 
                tableRef.current?.setGlobalFilter(v) 
              }}
              clearFilters={() => {
                setProductos([])
                setHasSearched(false)
                tableRef.current?.clearFilters()
              }}
            />

            {!hasSearched && !cargando && (
              <div style={{ 
                textAlign: 'center', 
                padding: 40, 
                background: '#f8f9fa', 
                borderRadius: 8,
                margin: '20px 0'
              }}>
                <h4 style={{ color: '#666', marginBottom: 16 }}>
                  Buscar Productos
                </h4>
              </div>
            )}

            {cargando && <div style={{ textAlign: 'center', padding: 20 }}>Cargando productos...</div>}

            {hasSearched && !cargando && (
              <DataTable
                ref={tableRef}
                columns={columns}
                data={productos}
                pageSize={10}
                onNew={() => { setModoPanel('editar'); setRegistroPanel({}) }}
                onView={(r) => { setModoPanel('ver'); setRegistroPanel(r) }}
                onEdit={(r) => { setModoPanel('editar'); setRegistroPanel(r) }}
                puede={{
                  ver: hasPermission('Productos', 'Ver'),
                  editar: hasPermission('Productos', 'Actualizar'),
                  borrar: hasPermission('Productos', 'Borrar'),
                }}
              />
            )}
          </>
        )}
        {modoPanel && registroPanel && (
            <RecordPanel
              mode={modoPanel}
              record={registroPanel}
              entityType="producto"
              columns={columns}
              onClose={async () => {
                setModoPanel(null)
                setRegistroPanel(null)
                // recargar lista
                try {
                  await loadProductos()
                } catch (e) { console.error(e) }
              }}
              onSave={async (updated) => {
                try {
                  if (updated.id) await productosAPI.updateProductoById(updated.id, updated)
                  else await productosAPI.createProducto(updated)
                  setModoPanel(null)
                  setRegistroPanel(null)
                  await loadProductos()
                } catch (e) { console.error(e) }
              }}
            />
          )}
        </div>
    </div>
  )
}
