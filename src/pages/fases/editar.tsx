import React, { useCallback, useEffect, useRef, useState } from 'react';
import { confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import EditarDatosFasesVista from './EditarDatosFases';
import usePermisos from '../../hooks/usePermisos';
import { useAuth } from '../../contexts/AuthContext';
import RolesAPI from '../../api-endpoints/roles/index';
import FasesAPI from '../../api-endpoints/fases/index';
import TareasFasesAPI from '../../api-endpoints/tareas-fases/index';

interface Fase {
  id?: number;
  nombre?: string;
  codigo?: string;
  descripcion?: string;
  activo?: string;
  activoSn?: string;
  orden?: number;
  [clave: string]: any;
}

interface TareaFase {
  id?: number;
  faseId: number;
  nombre: string;
}

interface PropiedadesPanelFase {
  mode?: 'ver' | 'editar';
  record?: Fase | null;
  columns?: Array<{ key: string; title?: string; label?: string }>;
  onClose?: () => void;
  onSave?: (fase: Fase) => Promise<void>;
}

type PropsPagina = { faseId?: string };

type Props = PropsPagina | PropiedadesPanelFase;

export default function Editar(props: Props) {
  const esPanel = 'record' in props || 'mode' in props || 'onClose' in props || 'columns' in props;
  const propsPanel = esPanel ? (props as PropiedadesPanelFase) : null;
  const faseIdPagina = !esPanel ? (props as PropsPagina).faseId : undefined;

  const mode = esPanel ? propsPanel?.mode ?? 'ver' : 'editar';
  const registroPanel = propsPanel?.record ?? null;
  const onClose = propsPanel?.onClose;
  const onSave = propsPanel?.onSave;

  const [formulario, setFormulario] = useState<Fase | Record<string, any>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [tareas, setTareas] = useState<TareaFase[]>([]);
  const [dialogoVisible, setDialogoVisible] = useState(false);
  const [modoDialogo, setModoDialogo] = useState<'nuevo' | 'editar' | null>(null);
  const [tareaEnEdicion, setTareaEnEdicion] = useState<TareaFase | null>(null);
  const [nombreTarea, setNombreTarea] = useState('');
  const [guardandoTarea, setGuardandoTarea] = useState(false);
  const toastRef = useRef<Toast | null>(null);

  const { hasPermission } = usePermisos();
  const { user: authUser } = useAuth();
  const [rolActivo, setRolActivo] = useState<boolean | null>(null);

  const cargarTareasAsociadasALaFase = useCallback(async (faseId: number) => {
    try {
      const params = { filter: JSON.stringify({ where: { faseId: Number(faseId) } }) };
      const lista = await TareasFasesAPI.findTareasFases(params);
      setTareas(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error('Error cargando tareas de la fase:', error);
      setTareas([]);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    const inicializarFormulario = async () => {
      if (esPanel) {
        if (registroPanel) {
          setFormulario((registroPanel as any) || {});
          if ((registroPanel as any)?.id) await cargarTareasAsociadasALaFase((registroPanel as any).id);
          else setTareas([]);
        } else {
          setFormulario({});
          setTareas([]);
        }
        return;
      }

      if (faseIdPagina) {
        try {
          const data = await FasesAPI.getFaseById(faseIdPagina);
          if (!activo) return;
          setFormulario((data as any) || {});
          if ((data as any)?.id) await cargarTareasAsociadasALaFase((data as any).id);
          else setTareas([]);
        } catch (error) {
          console.error('Error cargando la fase por id:', error);
          if (activo) {
            setFormulario({});
            setTareas([]);
          }
        }
      } else {
        setFormulario({});
        setTareas([]);
      }
    };
    inicializarFormulario();
    return () => {
      activo = false;
    };
  }, [esPanel, registroPanel, faseIdPagina, cargarTareasAsociadasALaFase]);

  useEffect(() => {
    let montado = true;
    const comprobarRolActivo = async () => {
      try {
        let rolId: any = undefined;
        if (authUser && (authUser as any).rolId) {
          rolId = (authUser as any).rolId;
        } else {
          try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              const parsed = JSON.parse(storedUser);
              rolId = parsed?.rolId || parsed?.rol || (Array.isArray(parsed?.roles) ? parsed.roles[0] : undefined);
            }
          } catch (error) {
            // ignore
          }
        }

        if (!rolId) {
          if (montado) setRolActivo(true);
          return;
        }

        const rol = await RolesAPI.getRoleById(rolId);
        const activo = rol?.activoSn ?? rol?.activoSN ?? rol?.activo ?? 'S';
        if (montado) setRolActivo(String(activo).toUpperCase() === 'S');
      } catch (error) {
        console.warn('No se pudo comprobar el estado del rol, asumiendo activo', error);
        if (montado) setRolActivo(true);
      }
    };
    comprobarRolActivo();
    return () => {
      montado = false;
    };
  }, [authUser]);

  const mostrarAvisoDePermisos = (mensaje: string) => {
    if (toastRef.current) {
      toastRef.current.show({ severity: 'warn', summary: 'Permisos', detail: mensaje, life: 3000 });
    } else {
      alert(mensaje);
    }
  };

  const actualizarCampoDelFormulario = (clave: string, valor: any) => {
    setFormulario((estadoActual: any) => ({
      ...estadoActual,
      [clave]: valor,
    }));
  };

  const guardarFaseConValidaciones = async () => {
    setErrores({});

    const nombre = String((formulario as any).nombre || '').trim();
    if (!nombre || nombre.length < 2) {
      setErrores({ nombre: 'El nombre de la fase debe tener al menos 2 caracteres' });
      return;
    }

    const codigo = String((formulario as any).codigo || '').trim();
    if (codigo && codigo.length < 2) {
      setErrores({ codigo: 'El código debe tener al menos 2 caracteres' });
      return;
    }

    const orden = Number((formulario as any).orden || 0);
    if (orden < 0) {
      setErrores({ orden: 'El orden no puede ser negativo' });
      return;
    }

    const datosLimpios: any = { ...(formulario as any) };
    if (datosLimpios._cb !== undefined) delete datosLimpios._cb;

    if (onSave) await onSave(datosLimpios as Fase);
  };

  const abrirDialogoParaNuevaTarea = () => {
    if (!hasPermission('TareasFase', 'Nuevo')) {
      mostrarAvisoDePermisos('No tienes permiso para crear tareas');
      return;
    }
    setNombreTarea('');
    setTareaEnEdicion(null);
    setModoDialogo('nuevo');
    setDialogoVisible(true);
  };

  const abrirDialogoParaEditarTarea = (tarea: TareaFase) => {
    if (!hasPermission('TareasFase', 'Actualizar')) {
      mostrarAvisoDePermisos('No tienes permiso para editar tareas');
      return;
    }
    setNombreTarea(tarea.nombre);
    setTareaEnEdicion(tarea);
    setModoDialogo('editar');
    setDialogoVisible(true);
  };

  const cerrarDialogoDeTarea = () => {
    setDialogoVisible(false);
    setModoDialogo(null);
    setTareaEnEdicion(null);
    setNombreTarea('');
  };

  const guardarTareaEnElServidor = async () => {
    if (!nombreTarea.trim() || !(formulario as any)?.id) return;

    setGuardandoTarea(true);
    try {
      const payload = {
        faseId: Number((formulario as any).id),
        nombre: nombreTarea.trim(),
      };

      if (modoDialogo === 'nuevo') {
        await TareasFasesAPI.createTareasFase(payload);
      } else if (modoDialogo === 'editar' && tareaEnEdicion?.id) {
        await TareasFasesAPI.updateTareasFaseById(tareaEnEdicion.id, payload);
      }

      if ((formulario as any)?.id) await cargarTareasAsociadasALaFase(Number((formulario as any).id));
      cerrarDialogoDeTarea();
    } catch (error) {
      console.error('Error guardando tarea:', error);
    } finally {
      setGuardandoTarea(false);
    }
  };

  const eliminarTareaConConfirmacion = (tarea: TareaFase) => {
    if (!hasPermission('TareasFase', 'Borrar')) {
      mostrarAvisoDePermisos('No tienes permiso para eliminar tareas');
      return;
    }
    confirmDialog({
      message: `¿Estás seguro de que deseas eliminar la tarea "${tarea.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      rejectClassName: 'p-button-secondary',
      accept: async () => {
        try {
          if (tarea.id) {
            await TareasFasesAPI.deleteTareasFaseById(tarea.id);
            if ((formulario as any)?.id) await cargarTareasAsociadasALaFase(Number((formulario as any).id));
          }
        } catch (error) {
          console.error('Error eliminando tarea:', error);
        }
      },
    });
  };

  const hayFaseSeleccionada = Boolean((formulario as any)?.id);
  const puedeVerTareas = hasPermission('TareasFase', 'Ver') && rolActivo !== false;
  const puedeCrearTareas = mode === 'editar' && hasPermission('TareasFase', 'Nuevo');
  const puedeEditarTareas = mode === 'editar' && hasPermission('TareasFase', 'Actualizar');
  const puedeEliminarTareas = mode === 'editar' && hasPermission('TareasFase', 'Borrar');

  if (esPanel && !registroPanel) return null;

  return (
    <EditarDatosFasesVista
      modo={mode}
      formulario={formulario}
      errores={errores}
      onCampoChange={actualizarCampoDelFormulario}
      onGuardarClick={guardarFaseConValidaciones}
      onCerrarClick={onClose}
      puedeVerTareas={puedeVerTareas}
      puedeCrearTareas={puedeCrearTareas}
      puedeEditarTareas={puedeEditarTareas}
      puedeEliminarTareas={puedeEliminarTareas}
      hayFaseSeleccionada={hayFaseSeleccionada}
      tareas={tareas}
      onNuevaTareaClick={abrirDialogoParaNuevaTarea}
      onEditarTareaClick={abrirDialogoParaEditarTarea}
      onEliminarTareaClick={eliminarTareaConConfirmacion}
      dialogoVisible={dialogoVisible}
      modoDialogo={modoDialogo}
      nombreTarea={nombreTarea}
      onNombreTareaChange={setNombreTarea}
      onDialogoGuardar={guardarTareaEnElServidor}
      onDialogoCerrar={cerrarDialogoDeTarea}
      guardandoTarea={guardandoTarea}
      toastRef={toastRef}
    />
  );
}
