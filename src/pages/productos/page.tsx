import React, { useMemo, useState, useRef, useEffect } from 'react'
import '../../styles/layout.scss'
import '../../styles/_main.scss'
import GestorPaneles from '../../components/ui/GestorPaneles'
import DataTable, { ColumnDef } from '../../components/data-table/DataTable'
import productosAPI from '../../api-endpoints/productos/index'
import TableToolbar from '../../components/ui/TableToolbar'
import usePermisos from '../../hooks/usePermisos'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { Toast } from 'primereact/toast'

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
  ])
  const tableRef = useRef<any | null>(null)
  const [toast, setToast] = useState<any>(null)
  // Filtro de búsqueda temporal (no aplica a la tabla hasta pulsar "Buscar")
  const [filtroBusquedaTemporal, establecerFiltroBusquedaTemporal] = useState<string>('')
  // Filtro a aplicar tras pulsar "Buscar" (se fija en el momento del click)
  const [filtroBusquedaAplicar, setFiltroBusquedaAplicar] = useState<string>('')
  const [pageState] = useState<{ first: number; rows: number }>({ first: 0, rows: 10 })
  // Estados del panel para ver/editar registros
  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null)
  const [registroPanel, setRegistroPanel] = useState<any | null>(null)

  const { hasPermission } = usePermisos()

  // Función para cargar productos - solo cuando el usuario busque
  const loadProductos = async () => {
    // congelar filtro y cargar TODOS los productos en cliente para orden/filtrado fluidos
    const filtro = filtroBusquedaTemporal
    setFiltroBusquedaAplicar(filtro)
    setLoading(true)
    setError(null)
    try {
      const list = await productosAPI.findProductos()
      setProductos(list || [])
      setHasSearched(true)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Error cargando productos')
    } finally {
      setLoading(false)
    }
  }

  

  // Aplicar el filtro global a la tabla una vez que la tabla esté montada (hasSearched) y no esté cargando
  useEffect(() => {
    if (hasSearched && !cargando) {
      tableRef.current?.setGlobalFilter(filtroBusquedaAplicar)
    }
  }, [hasSearched, cargando, filtroBusquedaAplicar])

  // El input solo cambia el filtro temporal; la búsqueda se hace exclusivamente al pulsar "Buscar".

  // NOTA: No cargamos datos automáticamente - solo cuando el usuario presiona "Buscar"

  const columns = useMemo(() => (columnasDefinicion.length ? columnasDefinicion : [{ key: 'id', title: 'ID' }]), [columnasDefinicion])

  return (
    <div style={{ padding: 16 }}>
      <Toast ref={setToast} />
      <ConfirmDialog />
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
              globalFilter={filtroBusquedaTemporal}
              setGlobalFilter={(texto: string) => { 
                // Solo actualizamos el filtro temporal; la tabla no cambia hasta pulsar "Buscar"
                establecerFiltroBusquedaTemporal(texto)
              }}
              clearFilters={() => {
                // Limpiar filtros sin perder los datos ya cargados
                establecerFiltroBusquedaTemporal('')
                tableRef.current?.clearFilters()
                // Mantenemos hasSearched para que la tabla siga visible
                setHasSearched(true)
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

            {hasSearched && (
              <div style={{ position: 'relative' }}>
                <DataTable
                  ref={tableRef}
                  columns={columns}
                  data={productos}
                  pageSize={pageState.rows}
                  onNew={() => { setModoPanel('editar'); setRegistroPanel({}) }}
                  onView={(r) => { setModoPanel('ver'); setRegistroPanel(r) }}
                  onEdit={(r) => { setModoPanel('editar'); setRegistroPanel(r) }}
                  onDelete={(row) => {
                    if (!row) return
                    confirmDialog({
                      message: `¿Seguro que deseas eliminar el producto "${row?.nombre || row?.id}"?`,
                      header: 'Confirmar eliminación',
                      icon: 'pi pi-exclamation-triangle',
                      acceptLabel: 'Sí, eliminar',
                      rejectLabel: 'Cancelar',
                      acceptClassName: 'p-button-danger',
                      accept: async () => {
                        try {
                          await productosAPI.deleteProductoById(row.id)
                          if (toast && toast.show) toast.show({ severity: 'success', summary: 'Eliminado', detail: 'Producto eliminado correctamente', life: 2000 })
                          await loadProductos()
                        } catch (e) {
                          console.error(e)
                          if (toast && toast.show) toast.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el producto', life: 2500 })
                        }
                      }
                    })
                  }}
                  puede={{
                    ver: hasPermission('Productos', 'Ver'),
                    editar: hasPermission('Productos', 'Actualizar'),
                    borrar: hasPermission('Productos', 'Borrar'),
                  }}
                />
                {cargando && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(255,255,255,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div style={{ padding: 12, background: '#fff', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>Cargando...</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {modoPanel && registroPanel && (
            <GestorPaneles
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
              onUploadSuccess={async () => {
                try { await loadProductos() } catch (e) { console.error(e) }
              }}
              onSave={async (updated) => {
                try {
                  let resultado: any
                  if (updated.id) {
                    await productosAPI.updateProductoById(updated.id, updated)
                    resultado = { id: updated.id }
                  } else {
                    resultado = await productosAPI.createProducto(updated)
                  }
                  setModoPanel(null)
                  setRegistroPanel(null)
                  await loadProductos()
                  return resultado
                } catch (e) { console.error(e) }
              }}
            />
          )}
        </div>
    </div>
  )
}
