import React, { useMemo, useState, useRef } from 'react';
// Estilos globales para páginas y componentes
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import GestorEditores from '../../components/ui/GestorEditores';
import DataTable, { ColumnDef } from '../../components/data-table/DataTable';
import { DataTableHandle } from '../../components/data-table/DataTable';
import UsuariosAPI from '../../api-endpoints/usuarios/index';
import CredencialesAPI from '../../api-endpoints/credenciales-usuarios/index';
import TableToolbar from '../../components/ui/TableToolbar';
import usePermisos from '../../hooks/usePermisos';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import '../../styles/pages/UsuariosPage.scss';

const API_UPLOAD_BASE_URL =
  process.env.REACT_APP_UPLOAD_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  '';

const construirUrlImagen = (ruta?: string) => {
  if (!ruta) return '';
  const texto = String(ruta);
  if (texto.startsWith('http://') || texto.startsWith('https://')) return texto;
  if (!API_UPLOAD_BASE_URL) return texto;
  if (texto.startsWith('/')) return `${API_UPLOAD_BASE_URL}${texto}`;
  return `${API_UPLOAD_BASE_URL}/${texto}`;
};

const obtenerInicialesUsuario = (nombre?: string, apellidos?: string) => {
  const inicialNombre = (nombre || '').trim().charAt(0).toUpperCase();
  const inicialApellido = (apellidos || '').trim().charAt(0).toUpperCase();
  const combinadas = `${inicialNombre}${inicialApellido}`.trim();
  return combinadas || '?';
};

// Page principal para Usuarios — obtiene la lista usando el adaptador en src/api-endpoints/usuarios
export default function PageUsuarios() {
  // - usuarios: lista de usuarios cargada desde la API
  // - cargando: indicador de carga mientras se consulta la API
  // - mensajeError: texto con el error si ocurre
  const [usuarios, setUsers] = useState<any[]>([]); // lista de usuarios
  const [cargando, setLoading] = useState(false);
  const [mensajeError, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false); // Indica si ya se ha realizado una búsqueda

  // Paginación server-side
  const [tablaPaginacion, setTablaPaginacion] = useState<{ first: number; rows: number }>({
    first: 0,
    rows: 10,
  });
  const [totalUsuarios, setTotalUsuarios] = useState(0);

  // Definición explícita de columnas que queremos mostrar en la tabla de Usuarios.
  const [columnasDefinicion] = useState<ColumnDef<any>[]>([
    // Avatar / imagen (primera columna)
    {
      key: 'imagen',
      title: 'Usuario',
      sortable: false,
      filterable: false,
      render: (value: any, row: any) => {
        const img = value || row?.imagen || '';
        const nombreUsuario = String(row?.nombreUsuario || '');
        const apellidos = String(row?.apellidos || '');
        const iniciales = obtenerInicialesUsuario(nombreUsuario, apellidos);
        const displayName = `${nombreUsuario}${apellidos ? ' ' + apellidos : ''}`.trim();
        const cb = row && (row as any)._cb ? `cb=${(row as any)._cb}` : '';
        const baseSrc = construirUrlImagen(String(img));
        const srcWithCb =
          cb && baseSrc
            ? baseSrc + (baseSrc.includes('?') ? `&${cb}` : `?${cb}`)
            : baseSrc;

        return (
          <div className="usuarios-page__avatar">
            {srcWithCb ? (
              <div className="user-avatar">
                <img src={srcWithCb} alt={String(displayName)} />
              </div>
            ) : (
              <div className="user-avatar avatar-placeholder">{iniciales}</div>
            )}
          </div>
        );
      },
    },
    { key: 'nombreUsuario', title: 'Nombre', sortable: true },
    { key: 'apellidos', title: 'Apellidos', sortable: true },
    { key: 'email', title: 'Email', sortable: true },
    {
      key: 'activoSn',
      title: 'Activo',
      sortable: true,
      filterable: true,
      filterOptions: [
        { label: "Sí", value: "S" },
        { label: "No", value: "N" }
      ],
      render: (value: any) => {
        const v = String(value ?? '').toUpperCase();
        const isActive = v === 'S';
        return (
          <span className={`badge-estado ${isActive ? 'badge-activo' : 'badge-inactivo'}`}>
              {isActive ? 'Sí' : 'No'}
            </span>
        );
      },
    },

  ]);

  const tableRef = useRef<DataTableHandle | null>(null);
  const [toast, setToast] = useState<any>(null);

  // Obtener usuario actual desde el AuthContext (usa el objeto guardado en login/register)
  const { user: authUser } = useAuth();
  // Cargar permisos del rol actual
  const { hasPermission } = usePermisos();

  // Obtener email del usuario actual (authUser o localStorage)
  const currentEmail = React.useMemo(() => {
    if (authUser && (authUser as any).email) return (authUser as any).email;
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed?.email || null;
    } catch (e) {
      return null;
    }
  }, [authUser]);

  // Filtro de búsqueda (texto) — solo se aplica al pulsar "Buscar"
  const [filtroBusquedaTemporal, establecerFiltroBusquedaTemporal] = useState<string>('');
  const [filtroBusquedaAplicar, setFiltroBusquedaAplicar] = useState<string>('');

  // Estados locales del panel (ver / editar)
  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null);
  const [registroPanel, setRegistroPanel] = useState<any | null>(null);

  // Normalizar respuesta de la API (compatibilidad: array plano o {data,total})
  const normalizarRespuestaUsuarios = (respuesta: any): { lista: any[]; total: number } => {
    if (respuesta && Array.isArray(respuesta.data)) {
      const total =
        typeof respuesta.total === 'number' ? respuesta.total : respuesta.data.length;
      return { lista: respuesta.data, total };
    }
    if (Array.isArray(respuesta)) {
      return { lista: respuesta, total: respuesta.length };
    }
    return { lista: [], total: 0 };
  };

  // Carga paginada desde backend
  // Carga paginada desde backend con ordenación incluida
  const fetchUsuarios = async ({
    first = tablaPaginacion.first,
    rows = tablaPaginacion.rows,
    search = filtroBusquedaAplicar,
    sortField = null,
    sortOrder = null,
    filters = {},   // 👈 AQUI
  }: {
    first?: number;
    rows?: number;
    search?: string;
    sortField?: string | null;
    sortOrder?: number | null;
    filters?: any;  // 👈 Y AQUI
  } = {}) => {


    try {
      const params: any = {
        limit: rows,
        offset: first,
      };

      if (search) params.search = search;
      if (sortField) params.sortField = sortField;
      if (typeof sortOrder === 'number') params.sortOrder = sortOrder;
      // Aplicar filtro de columna "activoSn"
      if (filters.activoSn !== undefined && filters.activoSn !== null) {
        params.activoSn = filters.activoSn;
      }

      const respuesta = await UsuariosAPI.findUsuarios(params);
      const { lista, total } = normalizarRespuestaUsuarios(respuesta);

      setUsers(lista || []);
      setTotalUsuarios(total);
      setTablaPaginacion({ first, rows });
      setHasSearched(true);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };



  const refresh = async () => {
    await fetchUsuarios({
      first: tablaPaginacion.first,
      rows: tablaPaginacion.rows,
      search: filtroBusquedaAplicar,
    });
  };

  // Columnas para el DataTable
  const columns = useMemo(
    () => (columnasDefinicion.length ? columnasDefinicion : [{ key: 'id', title: 'ID' }]),
    [columnasDefinicion],
  );

  return (
    <div className="usuarios-page">
      <Toast ref={setToast} />
      <ConfirmDialog />
      {mensajeError && <div className="usuarios-page__error">{mensajeError}</div>}

      <div className="tabla-personalizada">
        {!modoPanel && (
          <>
            <TableToolbar
              title="Usuarios"
              onNew={() => {
                setModoPanel('editar');
                setRegistroPanel({});
              }}
              puede={{ nuevo: hasPermission('Usuarios', 'Nuevo') }}
              onDownloadCSV={() => tableRef.current?.downloadCSV()}
              onSearch={() => {
                const criterio = filtroBusquedaTemporal.trim();
                setFiltroBusquedaAplicar(criterio);
                // Siempre reiniciamos a la primera página al buscar
                fetchUsuarios({ first: 0, rows: tablaPaginacion.rows, search: criterio });
              }}
              globalFilter={filtroBusquedaTemporal}
              setGlobalFilter={(texto: string) => {
                // Solo actualizamos el filtro temporal; la tabla no cambia hasta pulsar "Buscar"
                establecerFiltroBusquedaTemporal(texto);
              }}
              clearFilters={() => {
                // Limpiar filtro de búsqueda y recargar sin filtro (si ya se buscó antes)
                establecerFiltroBusquedaTemporal('');
                setFiltroBusquedaAplicar('');
                tableRef.current?.clearFilters();
                if (hasSearched) {
                  fetchUsuarios({ first: 0, rows: tablaPaginacion.rows, search: '' });
                }
              }}
            />

            {!hasSearched && !cargando && (
              <div className="usuarios-page__placeholder">
                <h4 className="usuarios-page__placeholder-title">Usuarios</h4>
              </div>
            )}

            {cargando && !hasSearched && (
              <div className="usuarios-page__loading">Cargando usuarios...</div>
            )}

            {hasSearched && (
              <div className="usuarios-page__table-wrapper">
                <DataTable
                  ref={tableRef}
                  columns={columns}
                  data={usuarios}
                  pageSize={tablaPaginacion.rows}
                  // 🔹 Activamos modo server-side
                  lazy
                  totalRecords={totalUsuarios}
                  onLazyLoad={({ first, rows, sortField, sortOrder }) => {
                    fetchUsuarios({
                      first,
                      rows,
                      search: filtroBusquedaAplicar,
                      sortField,
                      sortOrder,
                      filters: tableRef.current?.getColumnFilters?.()
                    });
                  }}



                  onNew={() => {
                    setModoPanel('editar');
                    setRegistroPanel({});
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
                    // No permitir borrar al usuario autenticado
                    const esPropio =
                      currentEmail && String(row.email) === String(currentEmail);
                    if (esPropio) {
                      if (toast && toast.show)
                        toast.show({
                          severity: 'warn',
                          summary: 'No permitido',
                          detail: 'No puedes eliminar tu propio usuario',
                          life: 2500,
                        });
                      return;
                    }
                    confirmDialog({
                      message: `¿Seguro que deseas eliminar al usuario "${row?.nombreUsuario || row?.email || row?.id
                        }"?`,
                      header: 'Confirmar eliminación',
                      icon: 'pi pi-exclamation-triangle',
                      acceptLabel: 'Sí, eliminar',
                      rejectLabel: 'Cancelar',
                      acceptClassName: 'p-button-danger',
                      accept: async () => {
                        try {
                          // 1) Eliminar credenciales del usuario (capa cliente para evitar FK)
                          try {
                            const todas = await CredencialesAPI.findCredencialesUsuarios();
                            const asociadas = Array.isArray(todas)
                              ? todas.filter(
                                (c: any) =>
                                  Number(c?.usuarioId) === Number(row.id),
                              )
                              : [];
                            for (const c of asociadas) {
                              if (c && c.id !== undefined) {
                                // eslint-disable-next-line no-await-in-loop
                                await CredencialesAPI.deleteCredencialesUsuarioById(
                                  c.id,
                                );
                              }
                            }
                          } catch (eBorrarCred) {
                            console.warn(
                              'No se pudieron eliminar todas las credenciales del usuario antes del borrado:',
                              eBorrarCred,
                            );
                          }

                          // 2) Intentar eliminar el usuario
                          await UsuariosAPI.deleteUsuarioById(row.id);
                          if (toast && toast.show)
                            toast.show({
                              severity: 'success',
                              summary: 'Eliminado',
                              detail: 'Usuario eliminado correctamente',
                              life: 2000,
                            });
                          await refresh();
                        } catch (e: any) {
                          console.error(e);
                          // Fallback: desactivar el usuario si persisten dependencias (FK)
                          try {
                            await UsuariosAPI.updateUsuarioById(row.id, {
                              activoSn: 'N',
                            });
                            const msgRaw = String(e?.message || '');
                            const porFK =
                              /foreign key|credenciales_usuario|constraint/i.test(
                                msgRaw,
                              );
                            const detail = porFK
                              ? 'No se pudo eliminar por dependencias (credenciales vinculadas). Usuario desactivado.'
                              : 'No se pudo eliminar el usuario. Se ha desactivado en su lugar.';
                            if (toast && toast.show)
                              toast.show({
                                severity: 'info',
                                summary: 'Desactivado',
                                detail,
                                life: 3500,
                              });
                            await refresh();
                          } catch (e2) {
                            console.error(e2);
                            if (toast && toast.show)
                              toast.show({
                                severity: 'error',
                                summary: 'Error',
                                detail:
                                  'No se pudo eliminar ni desactivar el usuario',
                                life: 3000,
                              });
                          }
                        }
                      },
                    });
                  }}
                  // Permisos para acciones: usamos hasPermission con la pantalla 'Usuarios'
                  puede={{
                    ver: hasPermission('Usuarios', 'Ver'),
                    editar: hasPermission('Usuarios', 'Actualizar'),
                    borrar: hasPermission('Usuarios', 'Borrar'),
                  }}
                  // Ocultar botón eliminar si la fila corresponde al usuario logado.
                  allowDelete={(row) => {
                    if (!row) return true;
                    try {
                      if (
                        currentEmail &&
                        String(row.email) === String(currentEmail)
                      )
                        return false;
                    } catch (e) {
                      // En caso de error en la comparación, permitimos la acción por seguridad
                    }
                    return true;
                  }}
                />
                {cargando && (
                  <div className="usuarios-page__table-overlay">
                    <div className="usuarios-page__table-overlay-box">
                      Cargando...
                    </div>
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
            entityType="usuario"
            columns={columns}
            // cuando GestorEditores suba una imagen correctamente, refrescamos la lista
            onUploadSuccess={async (userId: number) => {
              try {
                await refresh();
                // forzar cache-bust local para el usuario recién subido
                setUsers((prev) =>
                  prev.map((u) =>
                    u && Number(u.id) === Number(userId)
                      ? { ...u, _cb: Date.now() }
                      : u,
                  ),
                );
              } catch (e) {
                console.error(e);
              }
            }}
            onClose={async () => {
              setModoPanel(null);
              setRegistroPanel(null);
              await refresh();
            }}
            onSave={async (updated) => {
              try {
                // extraer roles asignados (desde GestorEditores) y limpiar el payload
                const assignedRoles = (updated as any)._assignedRoles || [];
                const payload: any = { ...updated };
                delete payload._assignedRoles;
                // Salvaguarda: en edición, el backend no acepta 'password' en PATCH
                if (payload && payload.id) {
                  if (Object.prototype.hasOwnProperty.call(payload, 'password')) {
                    delete payload.password;
                  }
                }
                // Aplicar cambio de rol SOLO si el usuario tiene permiso explícito para ello
                const puedeEditarRol =
                  hasPermission('Usuarios', 'Rol') ||
                  hasPermission('Usuarios', 'EditarRol') ||
                  hasPermission('Usuarios', 'Editar Rol');

                if (puedeEditarRol) {
                  if (assignedRoles && assignedRoles.length) {
                    const parsed = Number(assignedRoles[0]);
                    payload.rolId = Number.isNaN(parsed)
                      ? assignedRoles[0]
                      : parsed;
                  }
                } else {
                  delete payload.rolId;
                }

                let resultado: any;
                if (updated.id) {
                  await UsuariosAPI.updateUsuarioById(updated.id, payload);
                  resultado = { id: updated.id };
                } else {
                  const creado = await UsuariosAPI.register(payload);
                  resultado = creado;
                }
                setModoPanel(null);
                setRegistroPanel(null);
                await refresh();
                return resultado;
              } catch (e) {
                console.error(e);
                throw e;
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
