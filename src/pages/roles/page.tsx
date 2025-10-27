import React, { useEffect, useMemo, useState } from 'react';
// Estilos globales para páginas y componentes
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import Editar from './editar';
import { useLocation } from 'react-router-dom';
import DataTable, { ColumnDef } from '../../components/data-table/DataTable';
import RolesAPI from '../../api-endpoints/roles/index';

// Page principal para Roles — obtiene la lista usando el adaptador en src/api-endpoints/roles
export default function PageRoles() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const idFromQuery = params.get('id') || undefined;

  const [roles, setRoles] = useState<any[]>([]);
  const [cargando, setLoading] = useState(false);
  const [mensajeError, setError] = useState<string | null>(null);
  const [idSeleccionado, setSelectedId] = useState<string | undefined>(idFromQuery || undefined);
  // Columnas explícitas para Roles. Edita este arreglo para cambiar las columnas mostradas.
  const [columnasDefinicion] = useState<ColumnDef<any>[]>([
    { key: 'id', title: 'ID', sortable: true },
    { key: 'nombre', title: 'Nombre', sortable: true },
    { key: 'activoSN', title: 'Activo', sortable: true },
  ]);

  useEffect(() => {
    setSelectedId(idFromQuery || undefined);
  }, [idFromQuery]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    RolesAPI.findRoles()
      .then(list => {
        if (!mounted) return;
        setRoles(list || []);
      })
      .catch(e => { console.error(e); if (mounted) setError(e?.message || 'Error cargando roles'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const columns = useMemo(() => (columnasDefinicion.length ? columnasDefinicion : [{ key: 'id', title: 'ID' }]), [columnasDefinicion]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Roles</h2>
      {cargando && <div>Cargando roles...</div>}
      {mensajeError && <div style={{ color: 'red' }}>{mensajeError}</div>}
      {!cargando && !mensajeError && (
        <div className='tabla-personalizada'>
          <DataTable
            columns={columns}
            data={roles}
            pageSize={10}
            onRowClick={(r) => setSelectedId(String(r.id || r._id || ''))}
            onNew={() => setSelectedId('')}
            onDownloadCSV={() => {
              try {
                const cols = columns.map(c => c.key);
                const rows = [cols.join(',')].concat((roles || []).map(u => cols.map(k => `"${String((u as any)[k] || '').replace(/"/g, '""')}"`).join(',')));
                const csv = rows.join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'roles.csv'; a.click();
                URL.revokeObjectURL(url);
              } catch (e) { console.error(e); }
            }}
          />
        </div>
      )}

      {idSeleccionado !== undefined && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setSelectedId(undefined)} style={{ marginBottom: 12 }}>← Volver a la lista</button>
          <Editar rolId={idSeleccionado} />
        </div>
      )}
    </div>
  );
}
