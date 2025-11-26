import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import '../../styles/pages/RolesPage.scss';
import GestorEditores from '../../components/ui/GestorEditores';
import DataTable, { ColumnDef, DataTableHandle } from '../../components/data-table/DataTable';
import TableToolbar from '../../components/ui/TableToolbar';
import FasesAPI from '../../api-endpoints/fases/index';
import TareasFasesAPI from '../../api-endpoints/tareas-fases/index';
import usePermisos from '../../hooks/usePermisos';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';

// ======================================================
// Tipos
// ======================================================

interface Fase {
  id?: number;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  [key: string]: any;
}

interface TareaFase {
  id?: number;
  faseId: number;
  nombre: string;
}

interface EstadoPaginacion {
  first: number;
  rows: number;
}

interface ParametrosCargaFases {
  first?: number;
  rows?: number;
  search?: string;
  sortField?: string | null;
  sortOrder?: number | null;
  filters?: Record<string, any>;
}

interface RespuestaFasesNormalizada {
  lista: Fase[];
  total: number;
}

// ======================================================
// Utilidades
// ======================================================

/**
 * Normaliza la respuesta del backend a un formato común { lista, total }.
 */
const normalizarRespuestaFases = (respuesta: any): RespuestaFasesNormalizada => {
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

export default function PageFases() {
  // --------------------------------------------------
  // Refs
  // --------------------------------------------------
  const referenciaTabla = useRef<DataTableHandle | null>(null);
  const toastRef = useRef<Toast | null>(null);

  // --------------------------------------------------
  // Estado de datos y tabla
  // --------------------------------------------------
  const [fases, setFases] = useState<Fase[]>([]);
  const [totalFases, setTotalFases] = useState(0);
  const [estaCargando, setEstaCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [haBuscado, setHaBuscado] = useState(false);

  const [tablaPaginacion, setTablaPaginacion] = useState<EstadoPaginacion>({
    first: 0,
    rows: 10,
  });

  const [filtroBusquedaTemporal, setFiltroBusquedaTemporal] = useState('');
  const [filtroBusquedaAplicado, setFiltroBusquedaAplicado] = useState('');

  // Control de orden (campo y sentido) para enviarlo al backend
  const [ordenTabla, setOrdenTabla] = useState<{ campo: string | null; orden: 1 | -1 }>({
    campo: null,
    orden: -1,
  });

  // Panel lateral (ver/editar fase)
  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null);
  const [registroPanel, setRegistroPanel] = useState<Fase | null>(null);

  // --------------------------------------------------
  // Permisos
  // --------------------------------------------------
  const { hasPermission } = usePermisos();

  // ======================================================
  // Columnas de la tabla
  // ======================================================

  const columnasDefinicion = useMemo<ColumnDef<Fase>[]>(
    () => [
      { key: 'codigo', title: 'Código', sortable: true },
      { key: 'nombre', title: 'Nombre', sortable: true },
    ],
    [],
  );

  const columnas = useMemo<ColumnDef<Fase>[]>(
    () =>
      columnasDefinicion.length
        ? columnasDefinicion
        : [{ key: 'id', title: 'ID' } as ColumnDef<Fase>],
    [columnasDefinicion],
  );

  /**
   * Fija la columna inicial de orden (primera columna) a DESC si aún no hay campo.
   */
  useEffect(() => {
    if (ordenTabla.campo === null && columnas.length) {
      setOrdenTabla({ campo: columnas[0].key, orden: -1 });
    }
  }, [columnas, ordenTabla.campo]);

  // ======================================================
  // Utilidades de UI
  // ======================================================

  /**
   * Muestra mensajes tipo toast (éxito, error, info, etc.).
   */
  const mostrarToast = useCallback(
    (opciones: {
      severity: 'success' | 'info' | 'warn' | 'error';
      summary: string;
      detail: string;
      life?: number;
    }) => {
      toastRef.current?.show({
        severity: opciones.severity,
        summary: opciones.summary,
        detail: opciones.detail,
        life: opciones.life ?? 3000,
      });
    },
    [],
  );

  // ======================================================
  // Lógica de carga de datos
  // ======================================================

  /**
   * Carga fases desde el backend con:
   * - paginación (first, rows)
   * - búsqueda global (search)
   * - ordenación (sortField, sortOrder)
   * - filtros de columna (filters)
   */
  const cargarFases = useCallback(
    async ({
      first = tablaPaginacion.first,
      rows = tablaPaginacion.rows,
      search = filtroBusquedaAplicado,
      sortField = ordenTabla.campo,
      sortOrder = ordenTabla.orden,
      filters = {},
    }: ParametrosCargaFases = {}) => {
      setEstaCargando(true);
      setMensajeError(null);

      try {
        const params: any = { limit: rows, offset: first };

        if (search) params.search = search;
        if (sortField) params.sortField = sortField;
        if (typeof sortOrder === 'number') params.sortOrder = sortOrder;

        // Filtros de la tabla (ej: código, nombre si se marcan como filterable)
        Object.entries(filters || {}).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;

          const lowerKey = key.toLowerCase();
          const esBool = lowerKey.includes('sn') || lowerKey.includes('activo');

          params[key] = esBool ? String(value).toUpperCase() : value;
        });

        const respuesta = await FasesAPI.findFases(params);
        const { lista, total } = normalizarRespuestaFases(respuesta);

        setFases(lista || []);
        setTotalFases(total);
        setTablaPaginacion({ first, rows });
        setHaBuscado(true);
      } catch (error: any) {
        console.error(error);
        setMensajeError(error?.message || 'Error cargando fases');
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
   * Reaplica la carga de fases con los parámetros actuales de tabla.
   */
  const recargarFases = useCallback(async () => {
    await cargarFases({
      first: tablaPaginacion.first,
      rows: tablaPaginacion.rows,
      search: filtroBusquedaAplicado,
      sortField: ordenTabla.campo,
      sortOrder: ordenTabla.orden,
    });
  }, [
    cargarFases,
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
   * Aplica el filtro de búsqueda global y recarga desde la primera página.
   */
  const manejarBusqueda = () => {
    const criterio = filtroBusquedaTemporal.trim();
    setFiltroBusquedaAplicado(criterio);

    cargarFases({
      first: 0,
      rows: tablaPaginacion.rows,
      search: criterio,
      sortField: ordenTabla.campo,
      sortOrder: ordenTabla.orden,
    });
  };

  /**
   * Limpia filtros de columna y búsqueda global, y recarga la lista.
   */
  const limpiarFiltros = () => {
    setFiltroBusquedaTemporal('');
    setFiltroBusquedaAplicado('');
    referenciaTabla.current?.clearFilters();

    if (haBuscado) {
      cargarFases({
        first: 0,
        rows: tablaPaginacion.rows,
        search: '',
        sortField: ordenTabla.campo,
        sortOrder: ordenTabla.orden,
      });
    }
  };

  /**
   * Elimina una fase comprobando antes si tiene tareas asociadas.
   * Si tiene tareas, no permite eliminarla.
   * Si no tiene, muestra un confirmDialog antes de borrar.
   */
  const eliminarFaseConConfirmacion = async (row: Fase) => {
    let tareasAsociadas: TareaFase[] = [];

    try {
      const params = { filter: JSON.stringify({ where: { faseId: Number(row.id) } }) };
      const lista = await TareasFasesAPI.findTareasFases(params);
      tareasAsociadas = Array.isArray(lista) ? (lista as TareaFase[]) : [];
    } catch (e) {
      console.warn(
        'No se pudo comprobar tareas asociadas, continuando con borrado simple...',
        e,
      );
    }

    if ((tareasAsociadas || []).length > 0) {
      mostrarToast({
        severity: 'error',
        summary: 'No permitido',
        detail: 'No se puede eliminar porque tiene tareas asociadas',
        life: 3500,
      });
      return;
    }

    confirmDialog({
      message: `¿Seguro que deseas eliminar la fase "${row?.nombre || row?.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          if (row?.id != null) {
            await FasesAPI.deleteFaseById(row.id);
          }

          mostrarToast({
            severity: 'success',
            summary: 'Eliminado',
            detail: 'Fase eliminada correctamente',
            life: 2200,
          });

          await recargarFases();
        } catch (e) {
          console.error(e);
          mostrarToast({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar la fase',
            life: 2800,
          });
        }
      },
    });
  };

  // ======================================================
  // Render
  // ======================================================

  return (
    <div style={{ padding: 16 }}>
      {/* Toast para mensajes de estado */}
      <Toast ref={toastRef} />

      {/* Diálogo global de confirmación */}
      <ConfirmDialog />

      {/* Bloque de error superior, si hay mensajeError */}
      {mensajeError && (
        <div
          style={{
            color: 'red',
            padding: 12,
            backgroundColor: '#fee',
            borderRadius: 4,
            marginBottom: 16,
          }}
        >
          {mensajeError}
          <Button
            icon="pi pi-times"
            className="p-button-text p-button-sm"
            onClick={() => setMensajeError(null)}
            style={{ float: 'right', marginTop: -4 }}
          />
        </div>
      )}

      <div className="tabla-personalizada">
        {/* Toolbar superior (cuando no se está en modo panel) */}
        {!modoPanel && (
          <TableToolbar
            title="Fases"
            onNew={() => {
              setModoPanel('editar');
              setRegistroPanel({ nombre: '' });
            }}
            puede={{ nuevo: hasPermission('Fases', 'Nuevo') }}
            onDownloadCSV={() => referenciaTabla.current?.downloadCSV()}
            onSearch={manejarBusqueda}
            globalFilter={filtroBusquedaTemporal}
            setGlobalFilter={(texto: string) => setFiltroBusquedaTemporal(texto)}
            clearFilters={limpiarFiltros}
          />
        )}

        {/* Placeholder inicial cuando aún no se ha buscado */}
        {!haBuscado && !estaCargando && (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              background: '#f8f9fa',
              borderRadius: 8,
              margin: '20px 0',
            }}
          >
            <h4 style={{ color: '#666', marginBottom: 16 }}>Fases</h4>
          </div>
        )}

        {/* Mensaje de carga genérico */}
        {estaCargando && (
          <div style={{ textAlign: 'center', padding: 20 }}>Cargando fases...</div>
        )}

        {/* Tabla de fases (cuando ya se ha buscado y no estamos en modo panel) */}
        {haBuscado && !estaCargando && !modoPanel && (
          <div className="roles-page__table-wrapper">
            <DataTable
              ref={referenciaTabla}
              columns={columnas}
              data={fases}
              pageSize={tablaPaginacion.rows}
              first={tablaPaginacion.first}
              sortField={ordenTabla.campo}
              sortOrder={ordenTabla.orden}
              lazy
              totalRecords={totalFases}
              /**
               * onLazyLoad se dispara al:
               * - cambiar de página
               * - cambiar tamaño de página
               * - ordenar columnas
               * - aplicar filtros de columna
               * y vuelve a pedir datos al backend con esos parámetros.
               */
              onLazyLoad={({ first, rows, sortField, sortOrder, filters = {} }) => {
                const campoOrden = sortField ?? ordenTabla.campo;
                const orden = (typeof sortOrder === 'number' ? sortOrder : ordenTabla.orden) as
                  | 1
                  | -1;

                setOrdenTabla({ campo: campoOrden, orden });
                setTablaPaginacion({ first, rows });

                cargarFases({
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
                setRegistroPanel({ nombre: '' });
              }}
              onView={(registro) => {
                setModoPanel('ver');
                setRegistroPanel(registro);
              }}
              onEdit={(registro) => {
                setModoPanel('editar');
                setRegistroPanel(registro);
              }}
              onDelete={(registro) => {
                if (!registro) return;
                eliminarFaseConConfirmacion(registro);
              }}
              puede={{
                ver: hasPermission('Fases', 'Ver'),
                editar: hasPermission('Fases', 'Actualizar'),
                borrar: hasPermission('Fases', 'Borrar'),
              }}
            />

            {/* Capa de carga sobre la tabla si se vuelve a pedir información */}
            {estaCargando && (
              <div className="roles-page__table-overlay">
                <div className="roles-page__table-overlay-box">Cargando...</div>
              </div>
            )}
          </div>
        )}

        {/* Panel lateral de edición / detalle */}
        {modoPanel && registroPanel && (
          <GestorEditores
            mode={modoPanel}
            record={registroPanel}
            entityType="fase"
            columns={columnas}
            onClose={async () => {
              setModoPanel(null);
              setRegistroPanel(null);
              await recargarFases();
            }}
            onSave={async (updated: any) => {
              try {
                if (updated.id) {
                  await FasesAPI.updateFaseById(updated.id, updated);
                } else {
                  await FasesAPI.createFase(updated);
                }

                setModoPanel(null);
                setRegistroPanel(null);
                await recargarFases();
              } catch (e: any) {
                console.error(e);
                setMensajeError(e?.message || 'Error guardando fase');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
