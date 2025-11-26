import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import '../../styles/pages/RolesPage.scss';
import GestorEditores from '../../components/ui/GestorEditores';
import TableToolbar from '../../components/ui/TableToolbar';
import DataTable, { ColumnDef, DataTableHandle } from '../../components/data-table/DataTable';
import usePermisos from '../../hooks/usePermisos';
import RolesAPI from '../../api-endpoints/roles/index';
import UsuariosAPI from '../../api-endpoints/usuarios/index';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';

// ======================================================
// Tipos
// ======================================================

interface Rol {
  id: number;
  nombre?: string;
  activoSn?: string;
  [key: string]: any;
}

interface EstadoPaginacion {
  first: number;
  rows: number;
}

interface ParametrosCargaRoles {
  first?: number;
  rows?: number;
  search?: string;
  sortField?: string | null;
  sortOrder?: number | null;
  filters?: Record<string, any>;
}

interface RespuestaRolesNormalizada {
  lista: Rol[];
  total: number;
}

// ======================================================
// Utilidades
// ======================================================

/**
 * Normaliza la respuesta del backend a un formato común { lista, total }.
 */
const normalizarRespuestaRoles = (respuesta: any): RespuestaRolesNormalizada => {
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

export default function PageRoles() {
  // --------------------------------------------------
  // Refs
  // --------------------------------------------------
  const referenciaTabla = useRef<DataTableHandle | null>(null);
  const toastRef = useRef<Toast | null>(null);

  // --------------------------------------------------
  // Estado de datos y tabla
  // --------------------------------------------------
  const [roles, setRoles] = useState<Rol[]>([]);
  const [totalRoles, setTotalRoles] = useState(0);
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

  // Panel lateral (ver/editar rol)
  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null);
  const [registroPanel, setRegistroPanel] = useState<Rol | null>(null);

  // --------------------------------------------------
  // Permisos
  // --------------------------------------------------
  const { hasPermission } = usePermisos();

  // --------------------------------------------------
  // Columnas de la tabla
  // --------------------------------------------------
  const columnasDefinicion = useMemo<ColumnDef<Rol>[]>(
    () => [
      { key: 'nombre', title: 'Nombre', sortable: true },
      {
        key: 'activoSn',
        title: 'Activo',
        sortable: true,
        filterable: true,
        filterOptions: [
          { label: 'Si', value: 'S' },
          { label: 'No', value: 'N' },
        ],
        render: (value: any) => {
          const isActive = String(value || '').toUpperCase() === 'S';

          return (
            <span className={`badge-estado ${isActive ? 'badge-activo' : 'badge-inactivo'}`}>
              {isActive ? 'Si' : 'No'}
            </span>
          );
        },
      },
    ],
    [],
  );

  const columns = useMemo<ColumnDef<Rol>[]>(
    () =>
      columnasDefinicion.length
        ? columnasDefinicion
        : [{ key: 'id', title: 'ID' } as ColumnDef<Rol>],
    [columnasDefinicion],
  );

  /**
   * Orden inicial: primera columna en DESC si aún no hay campo.
   */
  useEffect(() => {
    if (ordenTabla.campo === null && columns.length) {
      setOrdenTabla({ campo: columns[0].key, orden: -1 });
    }
  }, [columns, ordenTabla.campo]);

  // ======================================================
  // Funciones auxiliares de UI
  // ======================================================

  /**
   * Muestra mensajes toast (éxito, info, error, etc.).
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
   * Carga roles desde el backend con paginación, búsqueda, ordenación y filtros.
   */
  const cargarRoles = useCallback(
    async ({
      first = tablaPaginacion.first,
      rows = tablaPaginacion.rows,
      search = filtroBusquedaAplicado,
      sortField = ordenTabla.campo,
      sortOrder = ordenTabla.orden,
      filters = {},
    }: ParametrosCargaRoles = {}) => {
      setEstaCargando(true);
      setMensajeError(null);

      try {
        const params: any = {
          limit: rows,
          offset: first,
        };

        if (search) params.search = search;
        if (sortField) params.sortField = sortField;
        if (typeof sortOrder === 'number') params.sortOrder = sortOrder;

        // Filtros de columna (normalizando S/N a mayúsculas en campos tipo activoSn)
        Object.entries(filters || {}).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;

          const lowerKey = key.toLowerCase();
          const esBool = lowerKey.includes('sn') || lowerKey.includes('activo');

          params[key] = esBool ? String(value).toUpperCase() : value;
        });

        const respuesta = await RolesAPI.findRoles(params);
        const { lista, total } = normalizarRespuestaRoles(respuesta);

        setRoles(lista || []);
        setTotalRoles(total);
        setTablaPaginacion({ first, rows });
        setHaBuscado(true);
      } catch (e: any) {
        console.error(e);
        setMensajeError(e?.message || 'Error cargando roles');
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
   * Reaplica la carga de roles con los parámetros actuales.
   */
  const recargarRoles = useCallback(async () => {
    await cargarRoles({
      first: tablaPaginacion.first,
      rows: tablaPaginacion.rows,
      search: filtroBusquedaAplicado,
      sortField: ordenTabla.campo,
      sortOrder: ordenTabla.orden,
    });
  }, [
    cargarRoles,
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

    cargarRoles({
      first: 0,
      rows: tablaPaginacion.rows,
      search: criterio,
      sortField: ordenTabla.campo,
      sortOrder: ordenTabla.orden,
    });
  };

  /**
   * Limpia filtros y búsqueda y recarga la lista si ya se había buscado.
   */
  const limpiarFiltros = () => {
    setFiltroBusquedaTemporal('');
    setFiltroBusquedaAplicado('');
    referenciaTabla.current?.clearFilters();

    if (haBuscado) {
      cargarRoles({
        first: 0,
        rows: tablaPaginacion.rows,
        search: '',
        sortField: ordenTabla.campo,
        sortOrder: ordenTabla.orden,
      });
    }
  };

  /**
   * Elimina un rol:
   * - No permite eliminar el rol "Supervisor".
   * - Comprueba cuántos usuarios lo tienen asignado.
   * - Pide confirmación (con aviso si hay usuarios asociados).
   */
  const eliminarRol = async (rol: Rol) => {
    const nombreRol = String(rol?.nombre || '').trim().toLowerCase();

    if (nombreRol === 'supervisor') {
      mostrarToast({
        severity: 'warn',
        summary: 'No permitido',
        detail: 'El rol Supervisor no puede eliminarse',
        life: 3000,
      });
      return;
    }

    // Acción real de borrado
    const doDelete = async () => {
      try {
        await RolesAPI.deleteRoleById(rol.id);
        mostrarToast({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Rol eliminado correctamente',
          life: 2500,
        });
        await recargarRoles();
      } catch (e) {
        console.error(e);
        mostrarToast({
          severity: 'error',
          summary: 'Error',
          detail: 'Error eliminando rol',
          life: 2500,
        });
      }
    };

    // Comprobamos si hay usuarios con este rol
    try {
      const usuariosCount = await UsuariosAPI.countUsuarios({ rolId: rol.id });
      const n = Number(usuariosCount || 0);

      if (n > 0) {
        confirmDialog({
          message: `Hay ${n} usuario(s) con este rol. Si lo eliminas, esos usuarios podrían quedarse sin rol asignado. ¿Seguro que deseas eliminar el rol "${rol.nombre}"?`,
          header: 'Confirmar eliminación',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sí, eliminar',
          rejectLabel: 'Cancelar',
          acceptClassName: 'p-button-danger',
          accept: doDelete,
        });
        return;
      }
    } catch (err) {
      console.error('Error comprobando usuarios del rol:', err);
    }

    // Confirmación estándar si no hay usuarios asociados o no se pudo contar
    confirmDialog({
      message: `¿Seguro que deseas eliminar el rol "${rol.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: doDelete,
    });
  };

  // ======================================================
  // Render
  // ======================================================

  return (
    <div className="roles-page">
      <Toast ref={toastRef} />
      <ConfirmDialog />

      {mensajeError && <div className="roles-page__error">{mensajeError}</div>}

      <div className="tabla-personalizada">
        {/* Zona tabla + toolbar */}
        {!modoPanel && (
          <>
            <TableToolbar
              title="Roles"
              onNew={() => {
                setModoPanel('editar');
                setRegistroPanel({} as Rol);
              }}
              puede={{ nuevo: hasPermission('Roles', 'Nuevo') }}
              onDownloadCSV={() => referenciaTabla.current?.downloadCSV()}
              onSearch={manejarBusqueda}
              globalFilter={filtroBusquedaTemporal}
              setGlobalFilter={(texto: string) => setFiltroBusquedaTemporal(texto)}
              clearFilters={limpiarFiltros}
            />

            {!haBuscado && !estaCargando && (
              <div className="roles-page__placeholder">
                <h4 className="roles-page__placeholder-title">Buscar Roles</h4>
              </div>
            )}

            {estaCargando && !haBuscado && (
              <div className="roles-page__loading">Cargando roles...</div>
            )}

            {haBuscado && (
              <div className="roles-page__table-wrapper">
                <DataTable
                  ref={referenciaTabla}
                  columns={columns}
                  data={roles}
                  pageSize={tablaPaginacion.rows}
                  sortField={ordenTabla.campo}
                  sortOrder={ordenTabla.orden}
                  first={tablaPaginacion.first}
                  lazy
                  totalRecords={totalRoles}
                  /**
                   * onLazyLoad se dispara al cambiar página, orden o filtros
                   * y vuelve a pedir datos al backend.
                   */
                  onLazyLoad={({ first, rows, sortField, sortOrder, filters = {} }) => {
                    const campoOrden = sortField ?? ordenTabla.campo;
                    const orden = (typeof sortOrder === 'number' ? sortOrder : ordenTabla.orden) as 1 | -1;

                    setOrdenTabla({ campo: campoOrden, orden });
                    setTablaPaginacion({ first, rows });

                    cargarRoles({
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
                    setRegistroPanel({} as Rol);
                  }}
                  onView={(registro) => {
                    setModoPanel('ver');
                    setRegistroPanel(registro);
                  }}
                  onEdit={(registro) => {
                    setModoPanel('editar');
                    setRegistroPanel(registro);
                  }}
                  onDelete={eliminarRol}
                  puede={{
                    ver: hasPermission('Roles', 'Ver'),
                    editar: hasPermission('Roles', 'Actualizar'),
                    borrar: hasPermission('Roles', 'Borrar'),
                  }}
                  allowDelete={(r) =>
                    String(r?.nombre || '').trim().toLowerCase() !== 'supervisor'
                  }
                />

                {estaCargando && (
                  <div className="roles-page__table-overlay">
                    <div className="roles-page__table-overlay-box">Cargando...</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Panel lateral de edición / detalle */}
        {modoPanel && registroPanel && (
          <GestorEditores
            mode={modoPanel}
            record={registroPanel}
            entityType="rol"
            columns={columns}
            onClose={async () => {
              setModoPanel(null);
              setRegistroPanel(null);
              await recargarRoles();
            }}
            onSave={async (updated: any) => {
              try {
                if (updated && (updated.id || registroPanel?.id)) {
                  await RolesAPI.updateRoleById(
                    updated.id || (registroPanel as any).id,
                    updated,
                  );
                } else {
                  await RolesAPI.createRole(updated);
                }

                setModoPanel(null);
                setRegistroPanel(null);

                toastRef.current?.show({
                  severity: 'success',
                  summary: 'Guardado',
                  detail: 'Rol actualizado correctamente',
                  life: 2500,
                });

                await recargarRoles();
              } catch (e) {
                console.error(e);
                toastRef.current?.show({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Error guardando rol',
                  life: 2500,
                });
                throw e;
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
