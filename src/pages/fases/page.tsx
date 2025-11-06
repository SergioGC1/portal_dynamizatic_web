import React, { useMemo, useState, useRef, useEffect } from 'react';
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import GestorPaneles from '../../components/ui/GestorPaneles';
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
    // Filtro de búsqueda temporal (solo se aplica a la tabla al pulsar "Buscar")
    const [filtroBusquedaTemporal, establecerFiltroBusquedaTemporal] = useState<string>('');
    const [filtroBusquedaAplicar, setFiltroBusquedaAplicar] = useState<string>('');
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
        // Congelar filtro en el momento del clic en Buscar
        setFiltroBusquedaAplicar(filtroBusquedaTemporal);
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

    // Aplicar el filtro una vez que la tabla esté visible tras la búsqueda
    useEffect(() => {
        if (hasSearched && !cargando) {
            tableRef.current?.setGlobalFilter(filtroBusquedaAplicar);
        }
    }, [hasSearched, cargando, filtroBusquedaAplicar]);

    // El input solo cambia el filtro temporal; la búsqueda se realiza al pulsar "Buscar".

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
                        globalFilter={filtroBusquedaTemporal}
                        setGlobalFilter={(texto: string) => {
                            // Solo actualizamos el filtro temporal; la tabla no cambia hasta pulsar "Buscar"
                            establecerFiltroBusquedaTemporal(texto);
                        }}
                        clearFilters={() => {
                            // Limpiar filtros manteniendo los datos visibles
                            establecerFiltroBusquedaTemporal('');
                            tableRef.current?.clearFilters();
                            setHasSearched(true);
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
                    <GestorPaneles
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