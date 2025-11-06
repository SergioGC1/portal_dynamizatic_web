import React, { useMemo, useState, useRef, useEffect } from 'react';
// Estilos globales para páginas y componentes
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import GestorPaneles from '../../components/ui/GestorPaneles';
import DataTable, { ColumnDef } from '../../components/data-table/DataTable';
import { DataTableHandle } from '../../components/data-table/DataTable';
import UsuariosAPI from '../../api-endpoints/usuarios/index';
import TableToolbar from '../../components/ui/TableToolbar';
import usePermisos from '../../hooks/usePermisos';
import { useAuth } from '../../contexts/AuthContext';

// Page principal para Usuarios — obtiene la lista usando el adaptador en src/api-endpoints/usuarios
export default function PageUsuarios() {
  // - usuarios: lista de usuarios cargada desde la API
  // - cargando: indicador de carga mientras se consulta la API
  // - mensajeError: texto con el error si ocurre
  // - idSeleccionado: id del usuario actualmente seleccionado
  // - columnasDefinicion: definición de columnas calculada a partir de los datos
  const [usuarios, setUsers] = useState<any[]>([]); // lista de usuarios (setter mantiene nombre técnico `setUsers`)
  const [cargando, setLoading] = useState(false);
  const [mensajeError, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false); // Indica si ya se ha realizado una búsqueda

  // Definición explícita de columnas que queremos mostrar en la tabla de Usuarios.
  // Edita este arreglo para mostrar u ocultar atributos.
  // Columnas basadas en la definición de la tabla `usuarios` en la BD
  const [columnasDefinicion] = useState<ColumnDef<any>[]>([
    // Avatar / imagen (primera columna)
    {
      key: 'imagen',
      title: 'Usuario',
      sortable: false,
      render: (value: any, row: any) => {
        const img = value || row?.imagen || ''
        const apiBase = (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) || 'http://127.0.0.1:3000'
        const buildSrc = (p: string) => {
          const s = String(p)
          if (s.startsWith('http://') || s.startsWith('https://')) return s
          if (s.startsWith('/')) return `${apiBase}${s}`
          return `${apiBase}/${s}`
        }
        const nombreUsuario = String(row?.nombreUsuario || '')
        const apellidos = String(row?.apellidos || '')
        // iniciales: primera letra de nombreUsuario + primera letra del primer apellido
        const iniciales = (nombreUsuario.trim().charAt(0).toUpperCase() + apellidos.charAt(0)).toUpperCase()
        const displayName = `${nombreUsuario}${apellidos ? ' ' + apellidos : ''}`.trim()
        // Si el registro trae un cache-buster local (`_cb`) lo añadimos para forzar
        // la recarga del avatar tras una subida reciente.
        const cb = (row && (row as any)._cb) ? `cb=${(row as any)._cb}` : ''
        const srcWithCb = cb ? (buildSrc(String(img)) + (String(buildSrc(String(img))).includes('?') ? `&${cb}` : `?${cb}`)) : buildSrc(String(img))
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {img ? (
              <div className="user-avatar">
                <img src={srcWithCb} alt={String(displayName)} />
              </div>
            ) : (
              <div className="user-avatar avatar-placeholder">{iniciales || '?'}</div>
            )}
          </div>
        )
      }
    },
    { key: 'nombreUsuario', title: 'Nombre', sortable: true },
    { key: 'apellidos', title: 'Apellidos', sortable: true },
    { key: 'email', title: 'Email', sortable: true },
    {
      key: 'activoSn',
      title: 'Activo',
      sortable: true,
      render: (value: any) => {
        const v = String(value ?? '').toUpperCase()
        const isActive = v === 'S'
        return (
          <span className={`badge-estado ${isActive ? 'badge-activo' : 'badge-inactivo'}`}>
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        )
      },
    },
  ]);
  const tableRef = useRef<DataTableHandle | null>(null);
  // Obtener usuario actual desde el AuthContext (usa el objeto guardado en login/register)
  const { user: authUser } = useAuth();
  // Cargar permisos del rol actual
  const { hasPermission } = usePermisos()
  // Obtener email del usuario actual
  // 1) authUser.email si está en el contexto
  // 2) Si no, leer el objeto `user` guardado en localStorage y usar su email
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
  // Filtro de búsqueda temporal (no aplica hasta pulsar "Buscar")
  const [filtroBusquedaTemporal, establecerFiltroBusquedaTemporal] = useState<string>('');
  const [filtroBusquedaAplicar, setFiltroBusquedaAplicar] = useState<string>('');
  // Estados locales del panel (ver / editar)
  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null);
  const [registroPanel, setRegistroPanel] = useState<any | null>(null);

  const refresh = async () => {
    // Congelar el valor actual del filtro para esta búsqueda
    setFiltroBusquedaAplicar(filtroBusquedaTemporal)
    setLoading(true)
    setError(null)
    try {
      const list = await UsuariosAPI.findUsuarios()
      setUsers(list || [])
      setHasSearched(true) // Marcar que ya se ha realizado una búsqueda
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }

  // Aplicar el filtro cuando la tabla esté visible (no cargando) tras una búsqueda
  useEffect(() => {
    if (hasSearched && !cargando) {
      tableRef.current?.setGlobalFilter(filtroBusquedaAplicar)
    }
  }, [hasSearched, cargando, filtroBusquedaAplicar])

  // El input solo cambia el filtro temporal; la búsqueda se hace exclusivamente al pulsar "Buscar".

  // (removed query param handling) Página no abre edición al clicar fila; el panel se controla con panelMode/panelRecord
  // NOTA: No cargamos datos automáticamente - solo cuando el usuario presiona "Buscar"

  const columns = useMemo(() => (columnasDefinicion.length ? columnasDefinicion : [{ key: 'id', title: 'ID' }]), [columnasDefinicion]);

  return (
    <div style={{ padding: 16 }}>
      {mensajeError && <div style={{ color: 'red' }}>{mensajeError}</div>}

      <div className="tabla-personalizada">
        {!modoPanel && (
          <>
            <TableToolbar
              title="Usuarios"
              onNew={() => { setModoPanel('editar'); setRegistroPanel({}) }}
              puede={{ nuevo: hasPermission('Usuarios', 'Nuevo') }}
              onDownloadCSV={() => tableRef.current?.downloadCSV()}
              onSearch={refresh} // Conectar búsqueda con refresh
              globalFilter={filtroBusquedaTemporal}
              setGlobalFilter={(texto: string) => {
                // Solo actualizamos el filtro temporal; la tabla no cambia hasta pulsar "Buscar"
                establecerFiltroBusquedaTemporal(texto)
              }}
              clearFilters={() => {
                // Limpiar filtros sin perder datos
                establecerFiltroBusquedaTemporal('')
                tableRef.current?.clearFilters()
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
                  Usuarios
                </h4>
              </div>
            )}

            {cargando && <div style={{ textAlign: 'center', padding: 20 }}>Cargando usuarios...</div>}

            {hasSearched && !cargando && (
              <DataTable
                ref={tableRef}
                columns={columns}
                data={usuarios}
                pageSize={10}
                onNew={() => {
                  setModoPanel('editar')
                  setRegistroPanel({})
                }}
                onView={(r) => {
                  setModoPanel('ver')
                  setRegistroPanel(r)
                }}
                onEdit={(r) => {
                  setModoPanel('editar')
                  setRegistroPanel(r)
                }}
                // Permisos para acciones: usamos hasPermission con la pantalla 'Usuarios'
                puede={{
                  ver: hasPermission('Usuarios', 'Ver'),
                  editar: hasPermission('Usuarios', 'Actualizar'),
                  borrar: hasPermission('Usuarios', 'Borrar'),
                }}
                // Ocultar botón eliminar si la fila corresponde al usuario logado.
                // Usamos solo el email del usuario autenticado como criterio (prefieres esta convención).
                allowDelete={(row) => {
                  if (!row) return true;
                  try {
                    if (currentEmail && String(row.email) === String(currentEmail)) return false;
                  } catch (e) {
                    // En caso de error en la comparación, permitimos la acción por seguridad
                  }
                  return true;
                }}
              />
            )}
          </>
        )}

        {modoPanel && registroPanel && (
          <GestorPaneles
            mode={modoPanel}
            record={registroPanel}
            entityType="usuario"
            columns={columns}
            // cuando GestorPaneles suba una imagen correctamente, refrescamos la lista
            onUploadSuccess={async (userId: number) => {
              try {
                // recargar la lista desde el servidor
                await refresh()
                // forzar cache-bust local para el usuario recién subido (evita mostrar imagen caché)
                setUsers((prev) => prev.map(u => (u && Number(u.id) === Number(userId)) ? { ...u, _cb: Date.now() } : u))
              } catch (e) { console.error(e) }
            }}
            onClose={async () => {
              setModoPanel(null)
              setRegistroPanel(null)
              await refresh()
            }}
            onSave={async (updated) => {
              try {
                // extraer roles asignados (desde GestorPaneles) y limpiar el payload
                const assignedRoles = (updated as any)._assignedRoles || []
                const payload: any = { ...updated }
                delete payload._assignedRoles
                // si hay roles asignados, mantenemos compatibilidad con el esquema actual usando `rolId` (primer rol)
                if (assignedRoles && assignedRoles.length) {
                  const parsed = Number(assignedRoles[0])
                  payload.rolId = Number.isNaN(parsed) ? assignedRoles[0] : parsed
                }

                if (updated.id) await UsuariosAPI.updateUsuarioById(updated.id, payload)
                else {
                  // Para creación de usuario usamos el flujo de registro que acepta contraseña
                  // El GestorPaneles añade `password` al form cuando entityType === 'usuario'
                  await UsuariosAPI.register(payload)
                }
                setModoPanel(null)
                setRegistroPanel(null)
                await refresh()
              } catch (e) {
                console.error(e)
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
