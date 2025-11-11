import React, { useMemo, useState, useRef, useEffect } from 'react';
// Estilos globales para páginas y componentes
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import GestorPaneles from '../../components/ui/GestorPaneles';
import DataTable, { ColumnDef } from '../../components/data-table/DataTable';
import { DataTableHandle } from '../../components/data-table/DataTable';
import UsuariosAPI from '../../api-endpoints/usuarios/index';
import CredencialesAPI from '../../api-endpoints/credenciales-usuarios/index';
import TableToolbar from '../../components/ui/TableToolbar';
import usePermisos from '../../hooks/usePermisos';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';

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
      filterable: false,
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
  const [toast, setToast] = useState<any>(null);
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
  const [totalRecords, setTotalRecords] = useState<number | null>(null)
  const [pageState, setPageState] = useState<{ first: number; rows: number }>({ first: 0, rows: 10 })
  // Estados locales del panel (ver / editar)
  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null);
  const [registroPanel, setRegistroPanel] = useState<any | null>(null);

  const refresh = async () => {
    // Congelar el valor actual del filtro para esta búsqueda
    const filtro = filtroBusquedaTemporal
    setFiltroBusquedaAplicar(filtro)
    // Reset pagination to first page when searching
    setPageState({ first: 0, rows: pageState.rows })
    await loadUsuariosPage({ first: 0, rows: pageState.rows, filterText: filtro })
  }

  const loadUsuariosPage = async ({ first = 0, rows = 10, filterText = '' } : { first?: number; rows?: number; filterText?: string }) => {
    setLoading(true)
    setError(null)
    try {
      // Build where clause for search if provided
      let whereObj: any = {}
      if (filterText && String(filterText).trim()) {
        const t = String(filterText).trim()
        whereObj = { or: [ { nombreUsuario: { like: `%${t}%`, options: 'i' } }, { email: { like: `%${t}%`, options: 'i' } }, { apellidos: { like: `%${t}%`, options: 'i' } } ] }
      }

      // Count total
      try {
        const cnt = await UsuariosAPI.countUsuarios({ where: JSON.stringify(whereObj) })
        const total = (cnt && (cnt.count !== undefined)) ? Number(cnt.count) : Number(cnt || 0)
        setTotalRecords(total)
      } catch (errCount) {
        console.warn('No se pudo obtener count de usuarios', errCount)
        setTotalRecords(null)
      }

      // Fetch page
      const params: any = { filter: JSON.stringify({ where: whereObj, limit: rows, skip: first, order: 'id DESC' }) }
      const list = await UsuariosAPI.findUsuarios(params)
      setUsers(list || [])
      setHasSearched(true)
      setPageState({ first, rows })
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
      <Toast ref={setToast} />
      <ConfirmDialog />
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

            {hasSearched && (
              <div style={{ position: 'relative' }}>
                <DataTable
                  ref={tableRef}
                  columns={columns}
                  data={usuarios}
                  pageSize={pageState.rows}
                  lazy
                  totalRecords={totalRecords ?? undefined}
                  onLazyLoad={({ first, rows }) => loadUsuariosPage({ first, rows, filterText: filtroBusquedaAplicar })}
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
                  onDelete={(row) => {
                  if (!row) return
                  // No permitir borrar al usuario autenticado
                  const esPropio = currentEmail && String(row.email) === String(currentEmail)
                  if (esPropio) {
                    if (toast && toast.show) toast.show({ severity: 'warn', summary: 'No permitido', detail: 'No puedes eliminar tu propio usuario', life: 2500 })
                    return
                  }
                  confirmDialog({
                    message: `¿Seguro que deseas eliminar al usuario "${row?.nombreUsuario || row?.email || row?.id}"?`,
                    header: 'Confirmar eliminación',
                    icon: 'pi pi-exclamation-triangle',
                    acceptLabel: 'Sí, eliminar',
                    rejectLabel: 'Cancelar',
                    acceptClassName: 'p-button-danger',
                    accept: async () => {
                      try {
                        // 1) Eliminar credenciales del usuario (capa cliente para evitar FK)
                        try {
                          const todas = await CredencialesAPI.findCredencialesUsuarios()
                          const asociadas = Array.isArray(todas) ? todas.filter((c: any) => Number(c?.usuarioId) === Number(row.id)) : []
                          for (const c of asociadas) {
                            if (c && c.id !== undefined) {
                              // eslint-disable-next-line no-await-in-loop
                              await CredencialesAPI.deleteCredencialesUsuarioById(c.id)
                            }
                          }
                        } catch (eBorrarCred) {
                          // Si falla limpiar credenciales, seguimos; el backend puede manejarlo
                          console.warn('No se pudieron eliminar todas las credenciales del usuario antes del borrado:', eBorrarCred)
                        }

                        // 2) Intentar eliminar el usuario
                        await UsuariosAPI.deleteUsuarioById(row.id)
                        if (toast && toast.show) toast.show({ severity: 'success', summary: 'Eliminado', detail: 'Usuario eliminado correctamente', life: 2000 })
                        await refresh()
                      } catch (e: any) {
                        console.error(e)
                        // Fallback: desactivar el usuario si persisten dependencias (FK)
                        try {
                          await UsuariosAPI.updateUsuarioById(row.id, { activoSn: 'N' })
                          const msgRaw = String(e?.message || '')
                          const porFK = /foreign key|credenciales_usuario|constraint/i.test(msgRaw)
                          const detail = porFK
                            ? 'No se pudo eliminar por dependencias (credenciales vinculadas). Usuario desactivado.'
                            : 'No se pudo eliminar el usuario. Se ha desactivado en su lugar.'
                          if (toast && toast.show) toast.show({ severity: 'info', summary: 'Desactivado', detail, life: 3500 })
                          await refresh()
                        } catch (e2) {
                          console.error(e2)
                          if (toast && toast.show) toast.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar ni desactivar el usuario', life: 3000 })
                        }
                      }
                    }
                  })
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
                // Salvaguarda: en edición, el backend no acepta 'password' en PATCH
                // Nos aseguramos de no enviarlo nunca en el update
                if (payload && payload.id) {
                  if (Object.prototype.hasOwnProperty.call(payload, 'password')) {
                    delete payload.password
                  }
                }
                // Aplicar cambio de rol SOLO si el usuario tiene permiso explícito para ello
                const puedeEditarRol = (
                  hasPermission('Usuarios', 'Rol') ||
                  hasPermission('Usuarios', 'EditarRol') ||
                  hasPermission('Usuarios', 'Editar Rol')
                )
                if (puedeEditarRol) {
                  // si hay roles asignados, mantenemos compatibilidad con el esquema actual usando `rolId` (primer rol)
                  if (assignedRoles && assignedRoles.length) {
                    const parsed = Number(assignedRoles[0])
                    payload.rolId = Number.isNaN(parsed) ? assignedRoles[0] : parsed
                  }
                } else {
                  // Si no hay permiso para editar rol, ignorar cualquier cambio recibido
                  delete payload.rolId
                }

                let resultado: any
                if (updated.id) {
                  await UsuariosAPI.updateUsuarioById(updated.id, payload)
                  resultado = { id: updated.id }
                } else {
                  // Para creación de usuario usamos el flujo de registro que acepta contraseña
                  // El GestorPaneles añade `password` al form cuando entityType === 'usuario'
                  const creado = await UsuariosAPI.register(payload)
                  // devolver el usuario creado (o al menos su id) para que el Panel suba la imagen
                  resultado = creado
                }
                setModoPanel(null)
                setRegistroPanel(null)
                await refresh()
                return resultado
              } catch (e) {
                console.error(e)
                // Re-propagar el error para que PanelUsuario pueda mapearlo a campos y mostrarlos en rojo
                throw e
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
