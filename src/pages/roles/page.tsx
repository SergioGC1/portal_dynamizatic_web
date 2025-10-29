import React, { useEffect, useMemo, useState } from 'react';
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import RecordPanel from '../../components/ui/RecordPanel';
import TableToolbar from '../../components/ui/TableToolbar';
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

  const loadRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await RolesAPI.findRoles();
      setRoles(list || []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Error cargando roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

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

      <h2>Roles</h2>
      {cargando && <div>Cargando roles...</div>}
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
                allowDelete={(r) => String(r?.nombre || '').trim().toLowerCase() !== 'supervisor'}
              />
            </>
          )}
          {modoPanel && registroPanel && (
            <RecordPanel
              mode={modoPanel}
              record={registroPanel}
              columns={columns}
              onClose={async () => {
                setModoPanel(null);
                setRegistroPanel(null);
                await refresh();
              }}
              onSave={async (updated) => {
                try {
                  await RolesAPI.updateRoleById(updated.id || registroPanel.id, updated);
                  setModoPanel(null);
                  setRegistroPanel(null);
                  toast.show({
                    severity: 'success',
                    summary: 'Guardado',
                    detail: 'Rol actualizado correctamente',
                    life: 2500,
                  });
                  await refresh();
                } catch (e) {
                  console.error(e);
                  toast.show({ severity: 'error', summary: 'Error', detail: 'Error guardando rol', life: 2500 });
                }
              }}
            />
          )}
        </div>
      )}

      {/* idSeleccionado/edit flow removed: panelMode/panelRecord handles view/edit */}
    </div>
  );
}
