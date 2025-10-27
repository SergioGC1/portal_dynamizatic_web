import React, { useEffect, useMemo, useState, useRef } from 'react';
// Estilos globales para páginas y componentes
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import Editar from './editar';
import { useLocation } from 'react-router-dom';
import DataTable, { ColumnDef } from '../../components/data-table/DataTable';
import { DataTableHandle } from '../../components/data-table/DataTable';
import UsuariosAPI from '../../api-endpoints/usuarios/index';
import TableToolbar from '../../components/ui/TableToolbar';

// Page principal para Usuarios — obtiene la lista usando el adaptador en src/api-endpoints/usuarios
export default function PageUsuarios() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const idFromQuery = params.get('id') || undefined;

  // - usuarios: lista de usuarios cargada desde la API
  // - cargando: indicador de carga mientras se consulta la API
  // - mensajeError: texto con el error si ocurre
  // - idSeleccionado: id del usuario actualmente seleccionado
  // - columnasDefinicion: definición de columnas calculada a partir de los datos
  const [usuarios, setUsers] = useState<any[]>([]); // lista de usuarios (setter mantiene nombre técnico `setUsers`)
  const [cargando, setLoading] = useState(false);
  const [mensajeError, setError] = useState<string | null>(null);
  const [idSeleccionado, setSelectedId] = useState<string | undefined>(idFromQuery || undefined);
  // Definición explícita de columnas que queremos mostrar en la tabla de Usuarios.
  // Edita este arreglo para mostrar u ocultar atributos.
  // Columnas basadas en la definición de la tabla `usuarios` en la BD
  const [columnasDefinicion] = useState<ColumnDef<any>[]>([

    { key: 'nombreUsuario', title: 'Usuario', sortable: true },
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

  useEffect(() => {
    setSelectedId(idFromQuery || undefined);
  }, [idFromQuery]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    UsuariosAPI.findUsuarios()
      .then(list => {
        if (!mounted) return;
        // Actualizamos la lista de usuarios (setter conserva nombre en inglés para claridad técnica)
        setUsers(list || []);
      })
      .catch(e => { console.error(e); if (mounted) setError(e?.message || 'Error cargando usuarios'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const columns = useMemo(() => (columnasDefinicion.length ? columnasDefinicion : [{ key: 'id', title: 'ID' }]), [columnasDefinicion]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Usuarios</h2>
      {cargando && <div>Cargando usuarios...</div>}
      {mensajeError && <div style={{ color: 'red' }}>{mensajeError}</div>}
      {!cargando && !mensajeError && (
        <div className="tabla-personalizada">
          <TableToolbar
            title="Secciones"
            onNew={() => setSelectedId('')}
            onDownloadCSV={() => tableRef.current?.downloadCSV()}
            globalFilter={globalFilter}
            setGlobalFilter={(v: string) => {
              setGlobalFilter(v)
              tableRef.current?.setGlobalFilter(v)
            }}
            clearFilters={() => tableRef.current?.clearFilters()}
          />

          <div className="tabla-contenido">
            <DataTable
              ref={tableRef}
              columns={columns}
              data={usuarios}
              pageSize={10}
              onRowClick={(r) => setSelectedId(String(r.id || r._id || ''))}
              // onNew abre el editor en modo creación (usamos cadena vacía como marcador)
              onNew={() => setSelectedId('')}
            />
          </div>
        </div>
      )}

      {idSeleccionado !== undefined && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setSelectedId(undefined)} style={{ marginBottom: 12 }}>← Volver a la lista</button>
          <Editar userId={idSeleccionado} />
        </div>
      )}
    </div>
  );
}
