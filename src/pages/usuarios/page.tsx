import React, { useEffect, useMemo, useState } from 'react';
// Estilos globales para páginas y componentes
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import Editar from './editar';
import { useLocation } from 'react-router-dom';
import DataTable, { ColumnDef } from '../../components/data-table/DataTable';
import UsuariosAPI from '../../api-endpoints/usuarios/index';

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
  const [columnasDefinicion, setCols] = useState<ColumnDef<any>[]>([]);

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
        if (Array.isArray(list) && list.length > 0) {
          const keys = Object.keys(list[0]);
          // Construimos definiciones de columna a partir de las claves del primer registro
          setCols(keys.map(k => ({ key: k, title: String(k).charAt(0).toUpperCase() + String(k).slice(1), sortable: true })));
        } else {
          setCols([]);
        }
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
        <div>
          <DataTable
            columns={columns}
            data={usuarios}
            pageSize={10}
            onRowClick={(r) => setSelectedId(String(r.id || r._id || ''))}
            // onNew abre el editor en modo creación (usamos cadena vacía como marcador)
            onNew={() => setSelectedId('')}
            // onDownloadCSV: generar CSV simple a partir de la lista de usuarios
            onDownloadCSV={() => {
              try {
                const cols = columns.map(c => c.key);
                const rows = [cols.join(',')].concat((usuarios || []).map(u => cols.map(k => `"${String((u as any)[k] || '').replace(/"/g, '""')}"`).join(',')));
                const csv = rows.join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'usuarios.csv'; a.click();
                URL.revokeObjectURL(url);
              } catch (e) { console.error(e); }
            }}
          />
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
