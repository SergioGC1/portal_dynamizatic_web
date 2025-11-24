import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import GestorEditores from '../../components/ui/GestorEditores';
import TableToolbar from '../../components/ui/TableToolbar';
import usePermisos from '../../hooks/usePermisos';
import { DataTableHandle } from '../../components/data-table/DataTable';
import DataTable, { ColumnDef } from '../../components/data-table/DataTable';
import RolesAPI from '../../api-endpoints/roles/index';
import UsuariosAPI from '../../api-endpoints/usuarios/index';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import '../../styles/pages/RolesPage.scss';

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

const normalizarRespuestaRoles = (respuesta: any): { lista: Rol[]; total: number } => {
  if (respuesta && Array.isArray(respuesta.data)) {
    const total = typeof respuesta.total === 'number' ? respuesta.total : respuesta.data.length;
    return { lista: respuesta.data, total };
  }
  if (Array.isArray(respuesta)) return { lista: respuesta, total: respuesta.length };
  return { lista: [], total: 0 };
};

export default function PageRoles() {
  const referenciaTabla = useRef<DataTableHandle | null>(null);
  const toastRef = useRef<Toast | null>(null);

  // Estado base de tabla y filtros
  const [roles, setRoles] = useState<Rol[]>([]);
  const [totalRoles, setTotalRoles] = useState(0);
  const [estaCargando, setEstaCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [haBuscado, setHaBuscado] = useState(false);

  const [tablaPaginacion, setTablaPaginacion] = useState<EstadoPaginacion>({ first: 0, rows: 10 });
  const [filtroBusquedaTemporal, setFiltroBusquedaTemporal] = useState('');
  const [filtroBusquedaAplicado, setFiltroBusquedaAplicado] = useState('');
  const [ordenTabla, setOrdenTabla] = useState<{ campo: string | null; orden: 1 | -1 }>({ campo: null, orden: -1 });

  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null);
  const [registroPanel, setRegistroPanel] = useState<Rol | null>(null);

  const { hasPermission } = usePermisos();

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
              {isActive ? 'Activo' : 'Inactivo'}
            </span>
          );
        },
      },
    ],
    [],
  );

  const columns = useMemo(
    () => (columnasDefinicion.length ? columnasDefinicion : [{ key: 'id', title: 'ID' } as ColumnDef<Rol>]),
    [columnasDefinicion],
  );

  useEffect(() => {
    if (ordenTabla.campo === null && columns.length) {
      setOrdenTabla({ campo: columns[0].key, orden: -1 });
    }
  }, [columns, ordenTabla.campo]);

  const mostrarToast = useCallback(
    (opciones: { severity: 'success' | 'info' | 'warn' | 'error'; summary: string; detail: string; life?: number }) => {
      toastRef.current?.show({
        severity: opciones.severity,
        summary: opciones.summary,
        detail: opciones.detail,
        life: opciones.life ?? 3000,
      });
    },
    [],
  );

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
        const params: any = { limit: rows, offset: first };
        if (search) params.search = search;
        if (sortField) params.sortField = sortField;
        if (typeof sortOrder === 'number') params.sortOrder = sortOrder;
        if (filters.activoSn !== undefined && filters.activoSn !== null && filters.activoSn !== '') {
          params.activoSn = filters.activoSn;
        }

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
    [tablaPaginacion.first, tablaPaginacion.rows, filtroBusquedaAplicado],
  );

  const recargarRoles = useCallback(async () => {
    await cargarRoles({
      first: tablaPaginacion.first,
      rows: tablaPaginacion.rows,
      search: filtroBusquedaAplicado,
      sortField: ordenTabla.campo,
      sortOrder: ordenTabla.orden,
    });
  }, [cargarRoles, tablaPaginacion.first, tablaPaginacion.rows, filtroBusquedaAplicado, ordenTabla.campo, ordenTabla.orden]);

  const manejarBusqueda = () => {
    const criterio = filtroBusquedaTemporal.trim();
    setFiltroBusquedaAplicado(criterio);
    cargarRoles({ first: 0, rows: tablaPaginacion.rows, search: criterio, sortField: ordenTabla.campo, sortOrder: ordenTabla.orden });
  };

  const limpiarFiltros = () => {
    setFiltroBusquedaTemporal('');
    setFiltroBusquedaAplicado('');
    referenciaTabla.current?.clearFilters();
    if (haBuscado) {
      cargarRoles({ first: 0, rows: tablaPaginacion.rows, search: '', sortField: ordenTabla.campo, sortOrder: ordenTabla.orden });
    }
  };

  const eliminarRol = async (rol: Rol) => {
    if (String(rol?.nombre || '').trim().toLowerCase() === 'supervisor') {
      mostrarToast({ severity: 'warn', summary: 'No permitido', detail: 'El rol Supervisor no puede eliminarse', life: 3000 });
      return;
    }

    const doDelete = async () => {
      try {
        await RolesAPI.deleteRoleById(rol.id);
        mostrarToast({ severity: 'success', summary: 'Eliminado', detail: 'Rol eliminado correctamente', life: 2500 });
        await recargarRoles();
      } catch (e) {
        console.error(e);
        mostrarToast({ severity: 'error', summary: 'Error', detail: 'Error eliminando rol', life: 2500 });
      }
    };

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

  return (
    <div className="roles-page">
      <Toast ref={toastRef} />
      <ConfirmDialog />
      {mensajeError && <div className="roles-page__error">{mensajeError}</div>}

      <div className="tabla-personalizada">
        {!modoPanel && (
          <>
            <TableToolbar
              title="Roles"
              onNew={() => { setModoPanel('editar'); setRegistroPanel({} as Rol); }}
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
                  onLazyLoad={({ first, rows, sortField, sortOrder }) => {
                    const campoOrden = sortField ?? ordenTabla.campo;
                    const orden = (typeof sortOrder === 'number' ? sortOrder : ordenTabla.orden) as 1 | -1;
                    const filtrosAplicados = referenciaTabla.current?.getColumnFilters?.() || {};
                    setOrdenTabla({ campo: campoOrden, orden });
                    setTablaPaginacion({ first, rows });
                    cargarRoles({
                      first,
                      rows,
                      search: filtroBusquedaAplicado,
                      sortField: campoOrden,
                      sortOrder: orden,
                      filters: filtrosAplicados,
                    });
                  }}
                  onNew={() => { setModoPanel('editar'); setRegistroPanel({} as Rol); }}
                  onView={(registro) => { setModoPanel('ver'); setRegistroPanel(registro); }}
                  onEdit={(registro) => { setModoPanel('editar'); setRegistroPanel(registro); }}
                  onDelete={eliminarRol}
                  puede={{
                    ver: hasPermission('Roles', 'Ver'),
                    editar: hasPermission('Roles', 'Actualizar'),
                    borrar: hasPermission('Roles', 'Borrar'),
                  }}
                  allowDelete={(r) => String(r?.nombre || '').trim().toLowerCase() !== 'supervisor'}
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
                  await RolesAPI.updateRoleById(updated.id || (registroPanel as any).id, updated);
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
                toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Error guardando rol', life: 2500 });
                throw e;
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
