import React, { useEffect, useMemo, useState, useRef } from 'react';
// Estilos globales para páginas y componentes
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import RecordPanel from '../../components/ui/RecordPanel';
import DataTable, { ColumnDef } from '../../components/data-table/DataTable';
import { DataTableHandle } from '../../components/data-table/DataTable';
import UsuariosAPI from '../../api-endpoints/usuarios/index';
import TableToolbar from '../../components/ui/TableToolbar';

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
        const nombreUsuario = String(row?.nombreUsuario || '')
        const apellidos = String(row?.apellidos || '')
        // iniciales: primera letra de nombreUsuario + primera letra del primer apellido
        const iniciales = (nombreUsuario.trim().charAt(0).toUpperCase() + apellidos.charAt(0)).toUpperCase()
        const displayName = `${nombreUsuario}${apellidos ? ' ' + apellidos : ''}`.trim()
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {img ? (
              <div className="user-avatar">
                <img src={String(img)} alt={String(displayName)} />
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
  const [globalFilter, setGlobalFilter] = useState<string>('');
  // Estados locales del panel (ver / editar)
  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null);
  const [registroPanel, setRegistroPanel] = useState<any | null>(null);

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await UsuariosAPI.findUsuarios()
      setUsers(list || [])
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }

  // (removed query param handling) Página no abre edición al clicar fila; el panel se controla con panelMode/panelRecord

  useEffect(() => {
    let mounted = true;
    // usar refresh pero proteger mounted flag
    (async () => {
      if (!mounted) return
      await refresh()
    })()
    return () => { mounted = false }
  }, [])

  const columns = useMemo(() => (columnasDefinicion.length ? columnasDefinicion : [{ key: 'id', title: 'ID' }]), [columnasDefinicion]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Usuarios</h2>
      {cargando && <div>Cargando usuarios...</div>}
      {mensajeError && <div style={{ color: 'red' }}>{mensajeError}</div>}
      {!cargando && !mensajeError && (
        <div className="tabla-personalizada">
          {!modoPanel && (
            <>
                <TableToolbar
                title="Secciones"
                onNew={() => { setModoPanel('editar'); setRegistroPanel({}) }}
                onDownloadCSV={() => tableRef.current?.downloadCSV()}
                globalFilter={globalFilter}
                setGlobalFilter={(v: string) => {
                  setGlobalFilter(v)
                  tableRef.current?.setGlobalFilter(v)
                }}
                clearFilters={() => tableRef.current?.clearFilters()}
              />

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
              />
            </>
          )}

          {modoPanel && registroPanel && (
            <RecordPanel
              mode={modoPanel}
              record={registroPanel}
              columns={columns}
              onClose={async () => {
                setModoPanel(null)
                setRegistroPanel(null)
                await refresh()
              }}
              onSave={async (updated) => {
                try {
                  if (updated.id) await UsuariosAPI.updateUsuarioById(updated.id, updated)
                  else await UsuariosAPI.createUsuario(updated)
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
      )}
    </div>
  );
}
