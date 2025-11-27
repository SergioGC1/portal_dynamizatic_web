import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import '../../styles/pages/UsuariosPage.scss';
import GestorEditores from '../../components/ui/GestorEditores';
import DataTable, { ColumnDef, DataTableHandle } from '../../components/data-table/DataTable';
import TableToolbar from '../../components/ui/TableToolbar';
import UsuariosAPI from '../../api-endpoints/usuarios/index';
import CredencialesAPI from '../../api-endpoints/credenciales-usuarios/index';
import usePermisos from '../../hooks/usePermisos';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';

// ======================================================
// Tipos
// ======================================================

interface Usuario {
  id: number;
  nombreUsuario?: string;
  apellidos?: string;
  email?: string;
  imagen?: string;
  activoSn?: string;
  _cb?: number; // cache bust de imagen
  [key: string]: any;
}

interface EstadoPaginacion {
  first: number;
  rows: number;
}

interface ParametrosCargaUsuarios {
  first?: number;
  rows?: number;
  search?: string;
  sortField?: string | null;
  sortOrder?: number | null;
  filters?: Record<string, any>;
}

interface RespuestaUsuariosNormalizada {
  lista: Usuario[];
  total: number;
}

// ======================================================
// Constantes y utilidades
// ======================================================

// URL base para ficheros subidos (imágenes, etc.)
const API_UPLOAD_BASE_URL =
  process.env.REACT_APP_UPLOAD_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  '';

/**
 * Construye la URL completa de una imagen a partir de la ruta.
 */
const construirUrlImagen = (ruta?: string): string => {
  if (!ruta) return '';

  const texto = String(ruta);

  if (texto.startsWith('http://') || texto.startsWith('https://')) return texto;
  if (!API_UPLOAD_BASE_URL) return texto;
  if (texto.startsWith('/')) return `${API_UPLOAD_BASE_URL}${texto}`;

  return `${API_UPLOAD_BASE_URL}/${texto}`;
};

/**
 * Devuelve iniciales en mayúsculas a partir de nombre y apellidos.
 */
const obtenerInicialesUsuario = (nombre?: string, apellidos?: string): string => {
  const inicialNombre = (nombre || '').trim().charAt(0).toUpperCase();
  const inicialApellido = (apellidos || '').trim().charAt(0).toUpperCase();
  const combinadas = `${inicialNombre}${inicialApellido}`.trim();

  return combinadas || '?';
};

/**
 * Normaliza la respuesta del backend a un formato común { lista, total }.
 */
const normalizarRespuestaUsuarios = (respuesta: any): RespuestaUsuariosNormalizada => {
  if (respuesta && Array.isArray(respuesta.data)) {
    const total = typeof respuesta.total === 'number' ? respuesta.total : respuesta.data.length;
    return { lista: respuesta.data, total };
  }

  if (Array.isArray(respuesta)) {
    return { lista: respuesta, total: respuesta.length };
  }

  return { lista: [], total: 0 };
};

/**
 * Normaliza valores de activo: si/no -> S/N.
 */
const normalizarValorActivo = (valor: any): string => {
  const texto = String(valor ?? '').trim().toLowerCase();

  if (texto === 'si') return 'S';
  if (texto === 'no') return 'N';

  // Si no coincide con ninguno de los anteriores, devolvemos el valor original en mayúsculas.
  return String(valor ?? '').toUpperCase();
};

// ======================================================
// Componente principal
// ======================================================

export default function PageUsuarios() {
  // --------------------------------------------------
  // Refs
  // --------------------------------------------------
  const referenciaTabla = useRef<DataTableHandle | null>(null);
  const toastRef = useRef<Toast | null>(null);

  // --------------------------------------------------
  // Estado de datos y tabla
  // --------------------------------------------------
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [estaCargando, setEstaCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [haBuscado, setHaBuscado] = useState(false);
  const [perfilEmailPendiente, setPerfilEmailPendiente] = useState<string | null>(null);

  const [tablaPaginacion, setTablaPaginacion] = useState<EstadoPaginacion>({
    first: 0,
    rows: 10,
  });

  // Filtros y orden de la tabla
  const [filtroBusquedaTemporal, setFiltroBusquedaTemporal] = useState('');
  const [filtroBusquedaAplicado, setFiltroBusquedaAplicado] = useState('');
  const [ordenTabla, setOrdenTabla] = useState<{ campo: string | null; orden: 1 | -1 }>({
    campo: 'nombreUsuario',
    orden: -1,
  });

  // Panel lateral (ver/editar usuario)
  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null);
  const [registroPanel, setRegistroPanel] = useState<Usuario | null>(null);

  // --------------------------------------------------
  // Autenticación y permisos
  // --------------------------------------------------
  const { user: usuarioAutenticado } = useAuth();
  const { hasPermission } = usePermisos();
  const tienePermiso = hasPermission;

  /**
   * Email del usuario actual (contexto o localStorage).
   */
  const emailUsuarioActual = useMemo(() => {
    if (usuarioAutenticado && (usuarioAutenticado as any).email) {
      return (usuarioAutenticado as any).email as string;
    }

    try {
      const almacenado = localStorage.getItem('user');
      if (!almacenado) return null;

      const parseado = JSON.parse(almacenado);
      return parseado?.email || null;
    } catch {
      return null;
    }
  }, [usuarioAutenticado]);

  // --------------------------------------------------
  // Columnas de la tabla
  // --------------------------------------------------
  const [columnasDefinicion] = useState<ColumnDef<Usuario>[]>([
    {
      key: 'imagen',
      title: 'Usuario',
      sortable: false,
      filterable: false,
      render: (value: any, row: Usuario) => {
        const imagen = value || row?.imagen || '';
        const nombreUsuario = String(row?.nombreUsuario || '');
        const apellidos = String(row?.apellidos || '');
        const iniciales = obtenerInicialesUsuario(nombreUsuario, apellidos);
        const nombreParaMostrar = `${nombreUsuario}${apellidos ? ' ' + apellidos : ''}`.trim();
        const cacheBust = row && row._cb ? `cb=${row._cb}` : '';

        const baseSrc = construirUrlImagen(String(imagen));
        const srcConCache =
          cacheBust && baseSrc
            ? baseSrc + (baseSrc.includes('?') ? `&${cacheBust}` : `?${cacheBust}`)
            : baseSrc;

        return (
          <div className="usuarios-page__avatar">
            {srcConCache ? (
              <div className="user-avatar">
                <img src={srcConCache} alt={nombreParaMostrar} />
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
        { label: 'Si', value: 'S' },
        { label: 'No', value: 'N' },
      ],
      render: (value: any) => {
        const normalizado = normalizarValorActivo(value);
        const estaActivo = normalizado === 'S';

        return (
          <span className={`badge-estado ${estaActivo ? 'badge-activo' : 'badge-inactivo'}`}>
            {estaActivo ? 'Si' : 'No'}
          </span>
        );
      },
    },
  ]);

  const columnas = useMemo<ColumnDef<Usuario>[]>(
    () =>
      columnasDefinicion.length
        ? columnasDefinicion
        : [{ key: 'id', title: 'ID' } as ColumnDef<Usuario>],
    [columnasDefinicion],
  );

  /**
   * Asegura un orden inicial por nombreUsuario DESC cuando campo es null.
   */
  useEffect(() => {
    if (ordenTabla.campo === null) {
      setOrdenTabla({ campo: 'nombreUsuario', orden: -1 });
    }
  }, [ordenTabla.campo]);

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
   * Carga usuarios desde el backend con paginación, búsqueda, ordenación y filtros.
   */
  const cargarUsuarios = useCallback(
    async ({
      first = tablaPaginacion.first,
      rows = tablaPaginacion.rows,
      search = filtroBusquedaAplicado,
      sortField = ordenTabla.campo,
      sortOrder = ordenTabla.orden,
      filters = {},
    }: ParametrosCargaUsuarios = {}) => {
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

        // Filtros de columna
        Object.entries(filters || {}).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;

          const lower = key.toLowerCase();
          const esBool = lower.includes('s') || lower.includes('si') || lower.includes('n') || lower.includes('no');

          if (esBool) {
            params[key] = normalizarValorActivo(value);
            return;
          }

          params[key] = value;
        });

        const respuesta = await UsuariosAPI.findUsuarios(params);
        const { lista, total } = normalizarRespuestaUsuarios(respuesta);

        setUsuarios(lista || []);
        setTotalUsuarios(typeof total === 'number' ? total : Array.isArray(lista) ? lista.length : 0);
        setTablaPaginacion({ first, rows });
        setHaBuscado(true);
      } catch (e: any) {
        console.error(e);
        setMensajeError(e?.message || 'Error cargando usuarios');
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
   * Reaplica la carga de usuarios con los parámetros actuales.
   */
  const recargarUsuarios = useCallback(async () => {
    await cargarUsuarios({
      first: tablaPaginacion.first,
      rows: tablaPaginacion.rows,
      search: filtroBusquedaAplicado,
      sortField: ordenTabla.campo,
      sortOrder: ordenTabla.orden,
    });
  }, [
    cargarUsuarios,
    tablaPaginacion.first,
    tablaPaginacion.rows,
    filtroBusquedaAplicado,
    ordenTabla.campo,
    ordenTabla.orden,
  ]);

  // -------------------------------
  // Apertura directa del perfil propio (sin recargar tabla)
  // -------------------------------
  const abrirPerfilPorEmail = useCallback(
    async (emailPerfil: string) => {
      const emailLower = String(emailPerfil || '').toLowerCase();
      try {
        let usuarioEncontrado: Usuario | null = null;

        // 1) Si tenemos id de usuario autenticado, intentar por id
        const userId = (usuarioAutenticado as any)?.id;
        if (userId) {
          try {
            const u = await UsuariosAPI.getUsuarioById(userId);
            if (u && u.email && String(u.email).toLowerCase() === emailLower) {
              usuarioEncontrado = u as Usuario;
            }
          } catch {
            /* ignore */
          }
        }

        // 2) Fallback: buscar por email usando findUsuarios, pero sin tocar la tabla
        if (!usuarioEncontrado) {
          try {
            const resp = await UsuariosAPI.findUsuarios({ search: emailPerfil, limit: 1, offset: 0 });
            const normalizada = normalizarRespuestaUsuarios(resp);
            usuarioEncontrado = (normalizada.lista && normalizada.lista[0]) || null;
          } catch {
            /* ignore */
          }
        }

        if (usuarioEncontrado) {
          setModoPanel('editar');
          setRegistroPanel(usuarioEncontrado);
          setPerfilEmailPendiente(null);
          return;
        }

        // Si no se encontró, dejamos pendiente para que abra cuando la tabla lo cargue
        setPerfilEmailPendiente(emailPerfil);
      } catch (err) {
        console.error('No se pudo abrir perfil por email', err);
      }
    },
    [usuarioAutenticado],
  );

  // Detectar petición de perfil desde otras pantallas (sessionStorage)
  useEffect(() => {
    try {
      const emailPerfil = sessionStorage.getItem('perfilEmailActivo');
      if (emailPerfil) {
        sessionStorage.removeItem('perfilEmailActivo');
        abrirPerfilPorEmail(emailPerfil);
      }
    } catch {
      /* ignore */
    }
  }, [abrirPerfilPorEmail]);

  // Fallback: si hay pendiente y la tabla ya cargó, intentar abrir con los datos ya cargados
  useEffect(() => {
    if (perfilEmailPendiente && usuarios && usuarios.length) {
      const emailLower = perfilEmailPendiente.toLowerCase();
      const match = usuarios.find((u) => u && u.email && String(u.email).toLowerCase() === emailLower);
      if (match) {
        setModoPanel('editar');
        setRegistroPanel(match);
        setPerfilEmailPendiente(null);
      }
    }
  }, [perfilEmailPendiente, usuarios]);

  // Detectar petición de ir al perfil desde otras pantallas
  useEffect(() => {
    try {
      const emailPerfil = sessionStorage.getItem('perfilEmailActivo');
      if (emailPerfil) {
        setPerfilEmailPendiente(emailPerfil);
        sessionStorage.removeItem('perfilEmailActivo');
        cargarUsuarios({ first: 0, rows: tablaPaginacion.rows, search: emailPerfil });
      }
    } catch {
      /* ignore */
    }
  }, [cargarUsuarios, tablaPaginacion.rows]);

  // Abrir editor automáticamente cuando el email pendiente esté en la lista
  useEffect(() => {
    if (perfilEmailPendiente && usuarios && usuarios.length) {
      const match = usuarios.find(
        (u) => u && u.email && String(u.email).toLowerCase() === String(perfilEmailPendiente).toLowerCase(),
      );
      if (match) {
        setModoPanel('editar');
        setRegistroPanel(match);
        setPerfilEmailPendiente(null);
      }
    }
  }, [perfilEmailPendiente, usuarios]);

  // ======================================================
  // Manejadores de acciones
  // ======================================================

  /**
   * Aplica el filtro de búsqueda global y recarga desde primera página.
   */
  const manejarBusqueda = () => {
    const criterio = filtroBusquedaTemporal.trim();
    setFiltroBusquedaAplicado(criterio);

    cargarUsuarios({
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
      cargarUsuarios({
        first: 0,
        rows: tablaPaginacion.rows,
        search: '',
        sortField: ordenTabla.campo,
        sortOrder: ordenTabla.orden,
      });
    }
  };

  /**
   * Elimina un usuario: primero intenta borrar credenciales, luego el usuario.
   * Si no se puede por FK, lo desactiva (activoSn = 'N').
   */
  const manejarEliminarUsuario = async (usuario: Usuario) => {
    try {
      // 1) Eliminar credenciales asociadas (si las hay)
      try {
        const todas = await CredencialesAPI.findCredencialesUsuarios();

        const asociadas = Array.isArray(todas)
          ? todas.filter((c: any) => Number(c?.usuarioId) === Number(usuario.id))
          : [];

        for (const credencial of asociadas) {
          if (credencial && credencial.id !== undefined) {
            // eslint-disable-next-line no-await-in-loop
            await CredencialesAPI.deleteCredencialesUsuarioById(credencial.id);
          }
        }
      } catch (eBorrarCredenciales) {
        console.warn(
          'No se pudieron eliminar todas las credenciales del usuario antes del borrado:',
          eBorrarCredenciales,
        );
      }

      // 2) Eliminar el usuario
      await UsuariosAPI.deleteUsuarioById(usuario.id);

      mostrarToast({
        severity: 'success',
        summary: 'Eliminado',
        detail: 'Usuario eliminado correctamente',
        life: 2000,
      });

      await recargarUsuarios();
    } catch (e: any) {
      console.error(e);

      // 3) Fallback: desactivar usuario si no se puede eliminar
      try {
        await UsuariosAPI.updateUsuarioById(usuario.id, { activoSn: 'N' });

        const mensajeBruto = String(e?.message || '');
        const porFk = /foreign key|credenciales_usuario|constraint/i.test(mensajeBruto);
        const detalle = porFk
          ? 'No se pudo eliminar por dependencias. Usuario desactivado.'
          : 'No se pudo eliminar el usuario. Se ha desactivado en su lugar.';

        mostrarToast({
          severity: 'info',
          summary: 'Desactivado',
          detail: detalle,
          life: 3500,
        });

        await recargarUsuarios();
      } catch (e2) {
        console.error(e2);
        mostrarToast({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar ni desactivar el usuario',
          life: 3000,
        });
      }
    }
  };

  /**
   * Guarda un usuario (alta o edición), aplicando reglas de rol y limpieza de payload.
   */
  const manejarGuardarUsuario = async (actualizado: any) => {
    try {
      const rolesAsignados = (actualizado as any)._assignedRoles || [];
      const payload: any = { ...actualizado };
      delete payload._assignedRoles;

      // En edición no se envía password en PATCH
      if (payload && payload.id && Object.prototype.hasOwnProperty.call(payload, 'password')) {
        delete payload.password;
      }

      // Control de permisos sobre el rol
      const puedeEditarRol =
        tienePermiso('Usuarios', 'Rol') ||
        tienePermiso('Usuarios', 'EditarRol') ||
        tienePermiso('Usuarios', 'Editar Rol');

      if (puedeEditarRol) {
        if (rolesAsignados && rolesAsignados.length) {
          const primerRol = Number(rolesAsignados[0]);
          payload.rolId = Number.isNaN(primerRol) ? rolesAsignados[0] : primerRol;
        }
      } else {
        delete payload.rolId;
      }

      let resultado: any;

      if (actualizado.id) {
        await UsuariosAPI.updateUsuarioById(actualizado.id, payload);
        resultado = { id: actualizado.id };
      } else {
        const creado = await UsuariosAPI.register(payload);
        resultado = creado;
      }

      setModoPanel(null);
      setRegistroPanel(null);
      await recargarUsuarios();

      return resultado;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // ======================================================
  // Render
  // ======================================================

  return (
    <div className="usuarios-page">
      <Toast ref={toastRef} />
      <ConfirmDialog />

      {mensajeError && <div className="usuarios-page__error">{mensajeError}</div>}

      <div className="tabla-personalizada">
        {!modoPanel && (
          <>
            {/* Toolbar superior (nuevo, buscar, exportar CSV...) */}
            <TableToolbar
              title="Usuarios"
              onNew={() => {
                setModoPanel('editar');
                setRegistroPanel({} as Usuario);
              }}
              puede={{ nuevo: tienePermiso('Usuarios', 'Nuevo') }}
              onDownloadCSV={() => referenciaTabla.current?.downloadCSV()}
              onSearch={manejarBusqueda}
              globalFilter={filtroBusquedaTemporal}
              setGlobalFilter={(texto: string) => setFiltroBusquedaTemporal(texto)}
              clearFilters={limpiarFiltros}
            />

            {/* Placeholder inicial cuando aún no se ha buscado */}
            {!haBuscado && !estaCargando && (
              <div className="usuarios-page__placeholder">
                <h4 className="usuarios-page__placeholder-title">Usuarios</h4>
              </div>
            )}

            {/* Mensaje de carga inicial */}
            {estaCargando && !haBuscado && (
              <div className="usuarios-page__loading">Cargando usuarios...</div>
            )}

            {/* Tabla de resultados una vez se ha lanzado una búsqueda */}
            {haBuscado && (
              <div className="usuarios-page__table-wrapper">
                <DataTable
                  ref={referenciaTabla}
                  columns={columnas}
                  data={usuarios}
                  pageSize={tablaPaginacion.rows}
                  sortField={ordenTabla.campo}
                  sortOrder={ordenTabla.orden}
                  lazy
                  totalRecords={totalUsuarios}
                  onLazyLoad={({ first, rows, sortField, sortOrder, filters = {} }) => {
                    const campoOrden = sortField ?? ordenTabla.campo;
                    const orden = (typeof sortOrder === 'number' ? sortOrder : ordenTabla.orden) as 1 | -1;

                    setOrdenTabla({ campo: campoOrden, orden });

                    cargarUsuarios({
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
                    setRegistroPanel({} as Usuario);
                  }}
                  onView={(registro: Usuario) => {
                    setModoPanel('ver');
                    setRegistroPanel(registro);
                  }}
                  onEdit={(registro: Usuario) => {
                    setModoPanel('editar');
                    setRegistroPanel(registro);
                  }}
                  onDelete={(registro: Usuario) => {
                    if (!registro) return;

                    const esSuPropioUsuario =
                      emailUsuarioActual && String(registro.email) === String(emailUsuarioActual);

                    if (esSuPropioUsuario) {
                      mostrarToast({
                        severity: 'warn',
                        summary: 'No permitido',
                        detail: 'No puedes eliminar tu propio usuario',
                        life: 2500,
                      });
                      return;
                    }

                    confirmDialog({
                      message: `Seguro que deseas eliminar al usuario "${registro?.nombreUsuario || registro?.email || registro?.id}"?`,
                      header: 'Confirmar eliminación',
                      icon: 'pi pi-exclamation-triangle',
                      acceptLabel: 'Si, eliminar',
                      rejectLabel: 'Cancelar',
                      acceptClassName: 'p-button-danger',
                      accept: () => manejarEliminarUsuario(registro),
                    });
                  }}
                  puede={{
                    ver: tienePermiso('Usuarios', 'Ver'),
                    editar: tienePermiso('Usuarios', 'Actualizar'),
                    borrar: tienePermiso('Usuarios', 'Borrar'),
                  }}
                  allowDelete={(registro: Usuario) => {
                    if (!registro) return true;
                    try {
                      if (emailUsuarioActual && String(registro.email) === String(emailUsuarioActual)) {
                        return false;
                      }
                    } catch {
                      return true;
                    }
                    return true;
                  }}
                />

                {estaCargando && (
                  <div className="usuarios-page__table-overlay">
                    <div className="usuarios-page__table-overlay-box">Cargando...</div>
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
            columns={columnas}
            onUploadSuccess={async (userId: number) => {
              try {
                await recargarUsuarios();
                setUsuarios((anteriores) =>
                  anteriores.map((usuario) =>
                    usuario && Number(usuario.id) === Number(userId)
                      ? { ...usuario, _cb: Date.now() }
                      : usuario,
                  ),
                );
              } catch (e) {
                console.error(e);
              }
            }}
            onClose={async () => {
              setModoPanel(null);
              setRegistroPanel(null);
              await recargarUsuarios();
            }}
            onSave={manejarGuardarUsuario}
          />
        )}
      </div>
    </div>
  );
}
