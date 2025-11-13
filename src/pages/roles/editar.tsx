import React, { useEffect, useState } from 'react';
import { ColumnDef } from '../../components/data-table/DataTable';
import { confirmDialog } from 'primereact/confirmdialog';
import EditarDatosRolesVista from './EditarDatosRoles';
import UsuariosAPI from '../../api-endpoints/usuarios/index';
import RolesAPI from '../../api-endpoints/roles/index';

interface Rol {
  id?: number | string;
  nombre?: string;
  activoSn?: string;
  activo?: string;
  [clave: string]: any;
}

interface PropiedadesPanelRol {
  mode?: 'ver' | 'editar';
  record?: Rol | null;
  columns?: ColumnDef<any>[];
  onClose?: () => void;
  onSave?: (rolActualizado: Rol) => Promise<any>;
}

type PropsPagina = { rolId?: string };

type Props = PropsPagina | PropiedadesPanelRol;

export default function Editar(props: Props) {
  const esPanel = 'mode' in props || 'record' in props || 'onClose' in props || 'columns' in props;
  const propsPanel = esPanel ? (props as PropiedadesPanelRol) : null;
  const rolIdPagina = !esPanel ? (props as PropsPagina).rolId : undefined;

  const modo = esPanel ? propsPanel?.mode ?? 'ver' : 'editar';
  const registroPanel = propsPanel?.record ?? null;
  const onClose = propsPanel?.onClose;
  const onSave = propsPanel?.onSave;

  const [formulario, setFormulario] = useState<Rol>({ nombre: '', activoSn: 'N' });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);

  const normalizarRegistro = (data: any): Rol => {
    const nombre = data?.nombre ?? data?.name ?? '';
    const activo = data?.activoSn ?? data?.activoSN ?? data?.activo ?? 'N';
    return { ...(data || {}), nombre, activoSn: String(activo || 'N').toUpperCase() === 'S' ? 'S' : 'N' };
  };

  useEffect(() => {
    let componenteActivo = true;
    const cargarDatos = async () => {
      if (esPanel) {
        if (registroPanel) setFormulario(normalizarRegistro(registroPanel));
        else setFormulario({ nombre: '', activoSn: 'N' });
        return;
      }

      if (!rolIdPagina) {
        setFormulario({ nombre: '', activoSn: 'N' });
        return;
      }

      try {
        setCargando(true);
        const datos = await RolesAPI.getRoleById(rolIdPagina);
        if (componenteActivo) setFormulario(normalizarRegistro(datos));
      } catch (error) {
        console.error('Error cargando el rol:', error);
        if (componenteActivo) setErrores({ general: 'Error al cargar los datos del rol.' });
      } finally {
        if (componenteActivo) setCargando(false);
      }
    };
    cargarDatos();
    return () => {
      componenteActivo = false;
    };
  }, [esPanel, registroPanel, rolIdPagina]);

  const actualizarCampoDelFormulario = (clave: string, valor: any) => {
    setFormulario((estadoActual) => ({ ...estadoActual, [clave]: valor }));
    if (errores[clave]) {
      setErrores((estadoAnterior) => {
        const copia = { ...estadoAnterior };
        delete copia[clave];
        return copia;
      });
    }
  };

  const manejarCambioDeEstado = async (evento: any) => {
    const nuevoValor = evento.value ? 'S' : 'N';
    const esDesactivacion = nuevoValor === 'N' && formulario?.id;

    if (esDesactivacion) {
      try {
        const usuarios = await UsuariosAPI.findUsuarios();
        const usuariosConRol = usuarios.filter((usuario: any) => Number(usuario?.rolId) === Number(formulario.id));
        if (usuariosConRol.length > 0) {
          confirmDialog({
            message: `Hay ${usuariosConRol.length} usuario(s) con este rol. Si lo desactivas, perderán sus permisos. ¿Estás seguro?`,
            header: 'Confirmar desactivación',
            acceptLabel: 'Desactivar',
            rejectLabel: 'Cancelar',
            accept: () => actualizarCampoDelFormulario('activoSn', 'N'),
          });
          return;
        }
      } catch (error) {
        console.error('Error al verificar usuarios del rol:', error);
      }
    }

    actualizarCampoDelFormulario('activoSn', nuevoValor);
  };

  const guardarRol = async () => {
    setErrores({});
    const nombreLimpio = String(formulario?.nombre || '').trim();
    if (nombreLimpio.length < 3) {
      setErrores({ nombre: 'El nombre debe tener al menos 3 caracteres.' });
      return;
    }

    const payload: Rol = { ...formulario, nombre: nombreLimpio };

    try {
      setCargando(true);
      if (esPanel && onSave) {
        await onSave(payload);
      } else if (payload.id) {
        await RolesAPI.updateRoleById(payload.id, payload);
        alert('Rol actualizado correctamente.');
      } else {
        await RolesAPI.createRole(payload);
        alert('Rol creado correctamente.');
      }
    } catch (error: any) {
      console.error('Error al guardar el rol:', error);
      setErrores({ general: error?.message || 'Ocurrió un error al guardar.' });
    } finally {
      setCargando(false);
    }
  };

  if (esPanel && !registroPanel) return null;

  return (
    <div>
      {!esPanel && <h2>Editar rol</h2>}
      <EditarDatosRolesVista
        formulario={formulario}
        errores={errores}
        cargando={cargando}
        modo={modo}
        esPanel={esPanel}
        onCampoChange={actualizarCampoDelFormulario}
        onEstadoChange={manejarCambioDeEstado}
        onGuardarClick={guardarRol}
        onCerrarClick={onClose}
      />
    </div>
  );
}
