import React, { useMemo, useState, useRef } from 'react';
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import RecordPanel from '../../components/ui/RecordPanel';
import DataTable, { ColumnDef } from '../../components/data-table/DataTable';
import { DataTableHandle } from '../../components/data-table/DataTable';
import FasesAPI from '../../api-endpoints/fases/index';
import TableToolbar from '../../components/ui/TableToolbar';
import usePermisos from '../../hooks/usePermisos';
import { Button } from 'primereact/button';

// Tipos para las entidades basados en la estructura real de la BD
interface Fase {
    id?: number;
    nombre: string;
    codigo?: string;
}

export default function PageFases() {
    const [fases, setFases] = useState<Fase[]>([]);
    const [cargando, setCargando] = useState(false);
    const [mensajeError, setMensajeError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const tableRef = useRef<DataTableHandle | null>(null);

    // Estados para el panel de ver/editar
    const [modoPanel, setModoPanel] = useState<'ver' | 'editar' | null>(null);
    const [registroPanel, setRegistroPanel] = useState<Fase | null>(null);

    // Permisos
    const { hasPermission } = usePermisos();

    // Definición de columnas para la tabla de fases (solo campos reales de la BD)
    const [columnasDefinicion] = useState<ColumnDef<Fase>[]>([
        {
            key: 'codigo',
            title: 'Código',
            sortable: true,
            render: (value) => value || '-'
        },
        {
            key: 'nombre',
            title: 'Nombre',
            sortable: true
        }
    ]);

    // Cargar datos de fases
    const refresh = async () => {
        setCargando(true);
        setMensajeError(null);
        try {
            const list = await FasesAPI.findFases();
            setFases(list || []);
            setHasSearched(true);
        } catch (e: any) {
            console.error(e);
            setMensajeError(e?.message || 'Error cargando fases');
        } finally {
            setCargando(false);
        }
    };

    const columns = useMemo(() =>
        columnasDefinicion.length ? columnasDefinicion : [{ key: 'id', title: 'ID' }],
        [columnasDefinicion]
    );

    return (
        <div style={{ padding: 16 }}>
            {mensajeError && (
                <div style={{
                    color: 'red',
                    padding: 12,
                    backgroundColor: '#fee',
                    borderRadius: 4,
                    marginBottom: 16
                }}>
                    {mensajeError}
                    <Button
                        icon="pi pi-times"
                        className="p-button-text p-button-sm"
                        onClick={() => setMensajeError(null)}
                        style={{ float: 'right', marginTop: -4 }}
                    />
                </div>
            )}

            <div className="tabla-personalizada">
                {!modoPanel && (
                    <TableToolbar
                        title="Fases"
                        onNew={() => {
                            setModoPanel('editar');
                            setRegistroPanel({ nombre: '' });
                        }}
                        puede={{ nuevo: hasPermission('Fases', 'Nuevo') }}
                        onDownloadCSV={() => tableRef.current?.downloadCSV()}
                        onSearch={refresh}
                        globalFilter={globalFilter}
                        setGlobalFilter={(v: string) => {
                            setGlobalFilter(v);
                            tableRef.current?.setGlobalFilter(v);
                        }}
                        clearFilters={() => {
                            setFases([]);
                            setHasSearched(false);
                            tableRef.current?.clearFilters();
                        }}
                    />
                )}

                {!hasSearched && !cargando && (
                    <div style={{
                        textAlign: 'center',
                        padding: 40,
                        background: '#f8f9fa',
                        borderRadius: 8,
                        margin: '20px 0'
                    }}>
                        <h4 style={{ color: '#666', marginBottom: 16 }}>
                            Fases
                        </h4>
                    </div>
                )}

                {cargando && (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                        Cargando fases...
                    </div>
                )}

                {hasSearched && !cargando && !modoPanel && (
                    <DataTable
                        ref={tableRef}
                        columns={columns}
                        data={fases}
                        pageSize={10}
                        onNew={() => {
                            setModoPanel('editar');
                            setRegistroPanel({ nombre: '' });
                        }}
                        onView={(r) => {
                            setModoPanel('ver');
                            setRegistroPanel(r);
                        }}
                        onEdit={(r) => {
                            setModoPanel('editar');
                            setRegistroPanel(r);
                        }}
                        puede={{
                            ver: hasPermission('Fases', 'Ver'),
                            editar: hasPermission('Fases', 'Actualizar'),
                            borrar: hasPermission('Fases', 'Borrar'),
                        }}
                    />
                )}

                {/* Panel para ver/editar fase */}
                {modoPanel && registroPanel && (
                    <RecordPanel
                        mode={modoPanel}
                        record={registroPanel}
                        entityType="fase"
                        columns={columns}
                        onClose={() => {
                            setModoPanel(null);
                            setRegistroPanel(null);
                        }}
                        onSave={async (updated: any) => {
                            try {
                                if (updated.id) {
                                    await FasesAPI.updateFaseById(updated.id, updated);
                                } else {
                                    await FasesAPI.createFase(updated);
                                }
                                setModoPanel(null);
                                setRegistroPanel(null);
                                await refresh();
                            } catch (e: any) {
                                console.error(e);
                                setMensajeError(e?.message || 'Error guardando fase');
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
}