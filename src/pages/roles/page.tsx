import React, { useMemo, useState } from 'react';
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import GestorPaneles from '../../components/ui/GestorPaneles';
import TableToolbar from '../../components/ui/TableToolbar';
import usePermisos from '../../hooks/usePermisos';
import { DataTableHandle } from '../../components/data-table/DataTable';
import { useRef } from 'react';
import DataTable, { ColumnDef } from '../../components/data-table/DataTable';
import RolesAPI from '../../api-endpoints/roles/index';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';

export default function PageRoles() {
  // query param handling removed; panel controlled via panelMode/panelRecord

  const [roles, setRoles] = useState<any[]>([]);
  const [cargando, setLoading] = useState(false);
  const [mensajeError, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false); // Indica si ya se ha realizado una búsqueda
  // Estado local para el panel de ver/editar
  const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null);
  const [registroPanel, setRegistroPanel] = useState<any | null>(null);
  const tableRef = useRef<DataTableHandle | null>(null);
  const [globalFilter, setGlobalFilter] = useState<string>('');

  const [columnasDefinicion] = useState<ColumnDef<any>[]>([
    { key: 'nombre', title: 'Nombre', sortable: true },
    {
      key: 'activoSn',
      title: 'Activo',
      sortable: true,
      render: (value: any) => {
        const isActive = String(value) === 'S';
        return (
          <span className={`badge-estado ${isActive ? 'badge-activo' : 'badge-inactivo'}`}>
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        );
      },
    },
  ]);

  const columns = useMemo(
    () => (columnasDefinicion.length ? columnasDefinicion : [{ key: 'id', title: 'ID' }]),
    [columnasDefinicion]
  );

  const [toast, setToast] = useState<any>(null);

  const { hasPermission } = usePermisos()

  const loadRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await RolesAPI.findRoles();
      setRoles(list || []);
      setHasSearched(true); // Marcar que ya se ha realizado una búsqueda
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Error cargando roles');
    } finally {
      setLoading(false);
    }
  };

  // NOTA: No cargamos datos automáticamente - solo cuando el usuario presiona "Buscar"

  // Función de refrescar - alias para loadRoles para mantener compatibilidad
  const refresh = async () => {
    await loadRoles();
  };

  const eliminarRol = async (rol: any) => {
    // Prevención temprana: no permitir eliminar el rol 'Supervisor'
    if (String(rol?.nombre || '').trim().toLowerCase() === 'supervisor') {
      if (toast && toast.show) {
        toast.show({ severity: 'warn', summary: 'No permitido', detail: 'El rol Supervisor no puede eliminarse', life: 3000 })
      }
      return
    }
    confirmDialog({
      message: `¿Seguro que deseas eliminar el rol "${rol.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await RolesAPI.deleteRoleById(rol.id);
          toast.show({ severity: 'success', summary: 'Eliminado', detail: 'Rol eliminado correctamente', life: 2500 });
          await refresh();
        } catch (e) {
          console.error(e);
          toast.show({ severity: 'error', summary: 'Error', detail: 'Error eliminando rol', life: 2500 });
        }
      },
    });
  };

  return (
    <div style={{ padding: 16 }}>
      <Toast ref={setToast} />
      <ConfirmDialog />
      {mensajeError && <div style={{ color: 'red' }}>{mensajeError}</div>}
      
      <div className="tabla-personalizada">
        {!modoPanel && (
          <>
            <TableToolbar
              title="Roles"
              onNew={() => { setModoPanel('editar'); setRegistroPanel({}) }}
              puede={{ nuevo: hasPermission('Roles', 'Nuevo') }}
              onDownloadCSV={() => tableRef.current?.downloadCSV()}
              onSearch={loadRoles} // Conectar búsqueda con loadRoles
              globalFilter={globalFilter}
              setGlobalFilter={(v: string) => {
                setGlobalFilter(v)
                tableRef.current?.setGlobalFilter(v)
              }}
              clearFilters={() => {
                setRoles([])
                setHasSearched(false)
                tableRef.current?.clearFilters()
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
                  Buscar Roles
                </h4>
              </div>
            )}

            {cargando && <div style={{ textAlign: 'center', padding: 20 }}>Cargando roles...</div>}

            {hasSearched && !cargando && (
              <DataTable
                ref={tableRef}
                columns={columns}
                data={roles}
                pageSize={10}
                onNew={() => { setModoPanel('editar'); setRegistroPanel({}) }}
                onView={(r) => {
                  setModoPanel('ver');
                  setRegistroPanel(r);
                }}
                onEdit={(r) => {
                  setModoPanel('editar');
                  setRegistroPanel(r);
                }}
                  onDelete={eliminarRol}
                  puede={{
                    ver: hasPermission('Roles', 'Ver'),
                    editar: hasPermission('Roles', 'Actualizar'),
                    borrar: hasPermission('Roles', 'Borrar'),
                  }}
                allowDelete={(r) => String(r?.nombre || '').trim().toLowerCase() !== 'supervisor'}
              />
            )}
          </>
        )}
        {modoPanel && registroPanel && (
            <GestorPaneles
              mode={modoPanel}
              record={registroPanel}
              columns={columns}
              entityType="rol"
              onClose={async () => {
                setModoPanel(null);
                setRegistroPanel(null);
                await refresh();
              }}
              onSave={async (updated: any) => {
                try {
                  // Actualizar campos del rol primero
                  await RolesAPI.updateRoleById(updated.id || registroPanel.id, updated);

                  

                  setModoPanel(null);
                  setRegistroPanel(null);
                  toast.show({
                    severity: 'success',
                    summary: 'Guardado',
                    detail: 'Rol actualizado correctamente',
                    life: 2500,
                  });
                  await loadRoles();
                } catch (e) {
                  console.error(e);
                  toast.show({ severity: 'error', summary: 'Error', detail: 'Error guardando rol', life: 2500 });
                }
              }}
            />
          )}
        </div>
    </div>
  );
}
