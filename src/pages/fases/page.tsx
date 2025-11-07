import React, { useMemo, useState, useRef, useEffect } from 'react';
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import GestorPaneles from '../../components/ui/GestorPaneles';
import DataTable, { ColumnDef } from '../../components/data-table/DataTable';
import { DataTableHandle } from '../../components/data-table/DataTable';
import FasesAPI from '../../api-endpoints/fases/index';
import TareasFasesAPI from '../../api-endpoints/tareas-fases/index';
import TableToolbar from '../../components/ui/TableToolbar';
import usePermisos from '../../hooks/usePermisos';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';

// Tipos para las entidades basados en la estructura real de la BD
interface Fase {
    id?: number;
    nombre: string;
    codigo?: string;
}

interface TareaFase {
    id?: number;
    faseId: number;
    nombre: string;
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
    const [toast, setToast] = useState<any>(null);

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

    // Eliminar fase con confirmación y borrado de tareas asociadas (si existen)
    const eliminarFaseConConfirmacion = async (row: Fase) => {
        // 1) Consultar si existen tareas asociadas a la fase
        let tareasAsociadas: TareaFase[] = []
        try {
            const params = { filter: JSON.stringify({ where: { faseId: Number(row.id) } }) }
            const lista = await TareasFasesAPI.findTareasFases(params)
            tareasAsociadas = Array.isArray(lista) ? (lista as TareaFase[]) : []
        } catch (e) {
            // Si falla la consulta, continuamos con confirmación estándar
            console.warn('No se pudo comprobar tareas asociadas, continuando con borrado simple...', e)
        }

        const totalTareas = tareasAsociadas.length
        const mensaje = totalTareas > 0
            ? `La fase "${row?.nombre || row?.id}" tiene ${totalTareas} tarea(s) asociada(s).\n\n¿Deseas eliminar también esas tareas y la fase?`
            : `¿Seguro que deseas eliminar la fase "${row?.nombre || row?.id}"?`

        confirmDialog({
            message: mensaje,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: totalTareas > 0 ? 'Sí, eliminar tareas y fase' : 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    // 2) Si hay tareas, eliminarlas primero
                    if (totalTareas > 0) {
                        // borrar en serie para mensajes claros (o usar Promise.all si el backend soporta)
                        for (const t of tareasAsociadas) {
                            if (t?.id != null) {
                                try {
                                    await TareasFasesAPI.deleteTareasFaseById(t.id)
                                } catch (errT) {
                                    console.error('Error eliminando tarea asociada:', errT)
                                }
                            }
                        }
                    }

                    // 3) Ahora eliminar la fase
                    if (row?.id != null) {
                        await FasesAPI.deleteFaseById(row.id)
                    }
                    if (toast && (toast as any).show) {
                        const detail = totalTareas > 0
                            ? `Fase y ${totalTareas} tarea(s) eliminadas correctamente`
                            : 'Fase eliminada correctamente'
                        ;(toast as any).show({ severity: 'success', summary: 'Eliminado', detail, life: 2200 })
                    }
                    await refresh()
                } catch (e) {
                    console.error(e)
                    if (toast && (toast as any).show) (toast as any).show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la fase', life: 2800 })
                }
            }
        })
    }

    return (
        <div style={{ padding: 16 }}>
            <Toast ref={setToast} />
            <ConfirmDialog />
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
                        onDelete={async (row) => {
                            if (!row) return;
                            await eliminarFaseConConfirmacion(row);
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