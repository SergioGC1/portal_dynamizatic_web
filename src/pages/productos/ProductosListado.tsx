import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import '../../styles/pages/ProductosPage.scss';
import GestorEditores from '../../components/ui/GestorEditores';
import DataTable, { ColumnDef, DataTableHandle } from '../../components/data-table/DataTable';
import TableToolbar from '../../components/ui/TableToolbar';
import usePermisos from '../../hooks/usePermisos';
import productosAPI from '../../api-endpoints/productos/index';
import estadosAPI from '../../api-endpoints/estados/index';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';

// ======================================================
// Tipos
// ======================================================

interface Producto {
  id: number;
  nombre?: string;
  estadoId?: string | number;
  [key: string]: any;
}

interface EstadoPaginacion {
  first: number;
  rows: number;
}

interface ParametrosCargaProductos {
  first?: number;
  rows?: number;
  search?: string;
  sortField?: string | null;
  sortOrder?: number | null;
  filters?: Record<string, any>;
}

interface RespuestaProductosNormalizada {
  lista: Producto[];
  total: number;
}

// ======================================================
// Utilidades
// ======================================================

/**
 * Normaliza la respuesta del backend a un formato común { lista, total }.
 */
const normalizarRespuestaProductos = (respuesta: any): RespuestaProductosNormalizada => {
  if (respuesta && Array.isArray(respuesta.data)) {
    const total = typeof respuesta.total === 'number' ? respuesta.total : respuesta.data.length;
    return { lista: respuesta.data, total };
  }

  if (Array.isArray(respuesta)) {
    return { lista: respuesta, total: respuesta.length };
  }

  return { lista: [], total: 0 };
};

// ======================================================
// Componente principal
// ======================================================

export default function ProductosListado() {
  // --------------------------------------------------
  // Refs
  // --------------------------------------------------
  const referenciaTabla = useRef<DataTableHandle | null>(null);

  // Para Toast se está usando un callback ref (PrimeReact lo soporta).
  const [toast, setToast] = useState<any>(null);

  // --------------------------------------------------
  // Estado de datos y tabla
  // --------------------------------------------------
  const [productos, setProductos] = useState<Producto[]>([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [estaCargando, setEstaCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [haBuscado, setHaBuscado] = useState(false);

  const [tablaPaginacion, setTablaPaginacion] = useState<EstadoPaginacion>({
    first: 0,
    rows: 10,
  });

  const [filtroBusquedaTemporal, setFiltroBusquedaTemporal] = useState('');
  const [filtroBusquedaAplicado, setFiltroBusquedaAplicado] = useState('');

  const [ordenTabla, setOrdenTabla] = useState<{ campo: string | null; orden: 1 | -1 }>({
    campo: null,
    orden: -1,
  });

  // Panel lateral (ver/editar producto)
  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null);
  const [registroPanel, setRegistroPanel] = useState<Producto | null>(null);

  // Estados auxiliares para mostrar el nombre del estado en la tabla
  const [estados, setEstados] = useState<any[]>([]);

  // --------------------------------------------------
  // Permisos
  // --------------------------------------------------
  const { hasPermission } = usePermisos();

  // ======================================================
  // Carga de estados (para columna estadoId)
  // ======================================================

  useEffect(() => {
    let montado = true;

    const cargarEstados = async () => {
      try {
        const listaEstados = await estadosAPI.findEstados();
        if (montado) setEstados(listaEstados || []);
      } catch (errorCarga) {
        console.warn('No se pudieron cargar estados', errorCarga);
      }
    };

    cargarEstados();

    return () => {
      montado = false;
    };
  }, []);

  /**
   * Mapa idEstado -> nombreEstado para pintar en la columna Estado.
   */
  const estadosMap = useMemo(() => {
    const mapaEstados: Record<string, string> = {};

    for (const estado of estados || []) {
      if (estado && estado.id !== undefined) {
        mapaEstados[String(estado.id)] = String(
          estado.nombre || estado.name || estado.titulo || estado.title || '',
        );
      }
    }

    return mapaEstados;
  }, [estados]);

  // ======================================================
  // Columnas de la tabla
  // ======================================================

  const columnasDefinicion = useMemo<ColumnDef<Producto>[]>(
    () => [
      { key: 'nombre', title: 'Nombre', sortable: true },
      {
        key: 'estadoId',
        title: 'Estado',
        sortable: true,
        // Opciones del filtro de la columna Estados (embudo)
        filterOptions: (estados || []).map((e: any) => ({
          label: String(e?.nombre || e?.name || e?.title || ''),
          value: String(e?.id),
        })),
        render: (value: any, row: any) => {
          // Intentamos conseguir el id del estado desde varios sitios
          let claveEstado: string | number | undefined = value;

          if ((claveEstado === undefined || claveEstado === null) && row && row.estado) {
            if (typeof row.estado === 'object' && row.estado !== null) {
              claveEstado = row.estado.id ?? row.estado?.estadoId ?? row.estado?.id;
            } else {
              claveEstado = row.estado;
            }
          }

          const claveStr =
            claveEstado === undefined || claveEstado === null ? '' : String(claveEstado);

          return <span>{estadosMap[claveStr] || claveStr}</span>;
        },
      },
      { key: 'anyo', title: 'Año', sortable: true },
      { key: 'descripcion', title: 'Descripción', sortable: false },
      { key: 'color', title: 'Color', sortable: true },
      { key: 'tamaO', title: 'Tamaño', sortable: true },
      { key: 'dimension', title: 'Dimensión', sortable: true },
      { key: 'material1', title: 'Material 1', sortable: true },
      { key: 'material2', title: 'Material 2', sortable: true },
      { key: 'material3', title: 'Material 3', sortable: true },
      {
        key: 'esElectricoSn',
        title: 'Eléctrico',
        sortable: true,
        render: (value: any) => {
          const valor = String(value ?? '').toUpperCase();
          const esSi = valor === 'S';

          return (
            <span className={`badge-estado ${esSi ? 'badge-activo' : 'badge-inactivo'}`}>
              {esSi ? 'Sí' : 'No'}
            </span>
          );
        },
      },
      {
        key: 'esBiodegradableSn',
        title: 'Biodegradable',
        sortable: true,
        render: (value: any) => {
          const valor = String(value ?? '').toUpperCase();
          const esSi = valor === 'S';

          return (
            <span className={`badge-estado ${esSi ? 'badge-activo' : 'badge-inactivo'}`}>
              {esSi ? 'Sí' : 'No'}
            </span>
          );
        },
      },
    ],
    [estadosMap, estados],
  );

  const columnas = useMemo<ColumnDef<Producto>[]>(
    () =>
      columnasDefinicion.length
        ? columnasDefinicion
        : [{ key: 'id', title: 'ID' } as ColumnDef<Producto>],
    [columnasDefinicion],
  );

  /**
   * Orden inicial: primera columna en DESC si no hay campo definido todavía.
   */
  useEffect(() => {
    if (ordenTabla.campo === null && columnas.length) {
      setOrdenTabla({ campo: columnas[0].key, orden: -1 });
    }
  }, [columnas, ordenTabla.campo]);

  // ======================================================
  // Lógica de carga de datos
  // ======================================================

  /**
   * Carga productos desde el backend con:
   * - paginación (first, rows)
   * - búsqueda global (search)
   * - ordenación (sortField, sortOrder)
   * - filtros de columna (filters)
   */
  const cargarProductos = useCallback(
    async ({
      first = tablaPaginacion.first,
      rows = tablaPaginacion.rows,
      search = filtroBusquedaAplicado,
      sortField = ordenTabla.campo,
      sortOrder = ordenTabla.orden,
      filters = {},
    }: ParametrosCargaProductos = {}) => {
      setEstaCargando(true);
      setMensajeError(null);

      try {
        const params: any = { limit: rows, offset: first };

        // Búsqueda global (campo superior)
        if (search) params.search = search;

        // Ordenación
        if (sortField) params.sortField = sortField;
        if (typeof sortOrder === 'number') params.sortOrder = sortOrder;

        // Filtros de columna -> parámetros del backend
        Object.entries(filters || {}).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;

          const lowerKey = key.toLowerCase();
          const esBool = lowerKey.includes('sn') || lowerKey.includes('activo');

          params[key] = esBool ? String(value).toUpperCase() : value;
        });

        const respuesta = await productosAPI.findProductos(params);
        const { lista, total } = normalizarRespuestaProductos(respuesta);

        setProductos(lista || []);
        setTotalProductos(total);
        setTablaPaginacion({ first, rows });
        setHaBuscado(true);
      } catch (e: any) {
        console.error(e);
        setMensajeError(e?.message || 'Error cargando productos');
      } finally {
        setEstaCargando(false);
      }
    },
    [
      tablaPaginacion.first,
      tablaPaginacion.rows,
      filtroBusquedaAplicado,
      ordenTabla.campo,
      ordenTabla.orden,
    ],
  );

  /**
   * Reaplica la carga con los parámetros actuales de tabla.
   */
  const recargarProductos = useCallback(async () => {
    await cargarProductos({
      first: tablaPaginacion.first,
      rows: tablaPaginacion.rows,
      search: filtroBusquedaAplicado,
      sortField: ordenTabla.campo,
      sortOrder: ordenTabla.orden,
    });
  }, [
    cargarProductos,
    tablaPaginacion.first,
    tablaPaginacion.rows,
    filtroBusquedaAplicado,
    ordenTabla.campo,
    ordenTabla.orden,
  ]);

  // ======================================================
  // Manejadores de acciones
  // ======================================================

  /**
   * Aplica búsqueda global y carga desde la primera página.
   */
  const manejarBusqueda = () => {
    const criterio = filtroBusquedaTemporal.trim();
    setFiltroBusquedaAplicado(criterio);

    cargarProductos({
      first: 0,
      rows: tablaPaginacion.rows,
      search: criterio,
      sortField: ordenTabla.campo,
      sortOrder: ordenTabla.orden,
    });
  };

  /**
   * Limpia filtros de columna y búsqueda global, y recarga datos.
   */
  const limpiarFiltros = () => {
    setFiltroBusquedaTemporal('');
    setFiltroBusquedaAplicado('');
    referenciaTabla.current?.clearFilters();

    if (haBuscado) {
      cargarProductos({
        first: 0,
        rows: tablaPaginacion.rows,
        search: '',
        sortField: ordenTabla.campo,
        sortOrder: ordenTabla.orden,
      });
    }
  };

  // ======================================================
  // Render
  // ======================================================

  return (
    <div className="productos-page">
      {/* Toast con callback ref para mostrar mensajes de estado */}
      <Toast ref={setToast} />

      {/* Diálogo global de confirmación para acciones destructivas */}
      <ConfirmDialog />

      {mensajeError && <div className="productos-page__error">{mensajeError}</div>}

      <div className="tabla-personalizada">
        {/* Zona tabla + toolbar (cuando no se está en modo panel) */}
        {!modoPanel && (
          <>
            <TableToolbar
              title="Productos"
              onNew={() => {
                setModoPanel('editar');
                setRegistroPanel({} as Producto);
              }}
              puede={{ nuevo: hasPermission('Productos', 'Nuevo') }}
              onDownloadCSV={() => referenciaTabla.current?.downloadCSV()}
              onSearch={manejarBusqueda}
              globalFilter={filtroBusquedaTemporal}
              setGlobalFilter={(texto: string) => setFiltroBusquedaTemporal(texto)}
              clearFilters={limpiarFiltros}
            />

            {!haBuscado && !estaCargando && (
              <div className="productos-page__placeholder">
                <h4 className="productos-page__placeholder-title">Buscar Productos</h4>
              </div>
            )}

            {estaCargando && !haBuscado && (
              <div className="productos-page__loading">Cargando productos...</div>
            )}

            {haBuscado && (
              <div className="productos-page__table-wrapper">
                <DataTable
                  ref={referenciaTabla}
                  columns={columnas}
                  data={productos}
                  pageSize={tablaPaginacion.rows}
                  sortField={ordenTabla.campo}
                  sortOrder={ordenTabla.orden}
                  first={tablaPaginacion.first}
                  lazy
                  totalRecords={totalProductos}
                  onLazyLoad={({ first, rows, sortField, sortOrder, filters = {} }) => {
                    const campoOrden = sortField ?? ordenTabla.campo;
                    const orden = (typeof sortOrder === 'number' ? sortOrder : ordenTabla.orden) as 1 | -1;

                    setOrdenTabla({ campo: campoOrden, orden });
                    setTablaPaginacion({ first, rows });

                    cargarProductos({
                      first,
                      rows,
                      search: filtroBusquedaAplicado,
                      sortField: campoOrden,
                      sortOrder: orden,
                      filters,
                    });
                  }}
                  onNew={() => {
                    setModoPanel('editar');
                    setRegistroPanel({} as Producto);
                  }}
                  onView={(r) => {
                    setModoPanel('ver');
                    setRegistroPanel(r);
                  }}
                  onEdit={(r) => {
                    setModoPanel('editar');
                    setRegistroPanel(r);
                  }}
                  onDelete={(row) => {
                    if (!row) return;

                    confirmDialog({
                      message: `¿Seguro que deseas eliminar el producto "${row?.nombre || row?.id}"?`,
                      header: 'Confirmar eliminación',
                      icon: 'pi pi-exclamation-triangle',
                      acceptLabel: 'Sí, eliminar',
                      rejectLabel: 'Cancelar',
                      acceptClassName: 'p-button-danger',
                      accept: async () => {
                        try {
                          await productosAPI.deleteProductoById(row.id);

                          if (toast && toast.show) {
                            toast.show({
                              severity: 'success',
                              summary: 'Eliminado',
                              detail: 'Producto eliminado correctamente',
                              life: 2000,
                            });
                          }

                          await recargarProductos();
                        } catch (e) {
                          console.error(e);

                          if (toast && toast.show) {
                            toast.show({
                              severity: 'error',
                              summary: 'Error',
                              detail: 'No se pudo eliminar el producto',
                              life: 2500,
                            });
                          }
                        }
                      },
                    });
                  }}
                  puede={{
                    ver: hasPermission('Productos', 'Ver'),
                    editar: hasPermission('Productos', 'Actualizar'),
                    borrar: hasPermission('Productos', 'Borrar'),
                  }}
                />

                {estaCargando && (
                  <div className="productos-page__table-overlay">
                    <div className="productos-page__table-overlay-box">Cargando...</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {modoPanel && registroPanel && (
          <GestorEditores
            mode={modoPanel}
            record={registroPanel}
            entityType="producto"
            columns={columnas}
            onClose={async () => {
              setModoPanel(null);
              setRegistroPanel(null);
              await recargarProductos();
            }}
            onUploadSuccess={async () => {
              try {
                await recargarProductos();
              } catch (e) {
                console.error(e);
              }
            }}
            onSave={async (updated) => {
              try {
                let resultado: any;

                if (updated.id) {
                  await productosAPI.updateProductoById(updated.id, updated);
                  resultado = { id: updated.id };
                } else {
                  resultado = await productosAPI.createProducto(updated);
                }

                setModoPanel(null);
                setRegistroPanel(null);
                await recargarProductos();

                return resultado;
              } catch (e) {
                console.error(e);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
