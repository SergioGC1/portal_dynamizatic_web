import React, { useEffect, useRef, useState } from 'react';
import { ColumnDef } from '../../../components/data-table/DataTable';
import { confirmDialog } from 'primereact/confirmdialog';
import EditarDatosUsuariosVista from './DatosUsuarios';
import usePermisos from '../../../hooks/usePermisos';
import UsuariosAPI from '../../../api-endpoints/usuarios/index';
import RolesAPI from '../../../api-endpoints/roles/index';
const normalizarRoles = (respuesta: any) => (Array.isArray(respuesta?.data) ? respuesta.data : Array.isArray(respuesta) ? respuesta : []);

interface Usuario {
  id?: number | string;
  nombreUsuario?: string;
  email?: string;
  apellidos?: string;
  rolId?: number | string;
  activoSn?: string;
  imagen?: string;
  password?: string;
  [clave: string]: any;
}

interface PropiedadesPanelUsuario {
  mode?: 'ver' | 'editar';
  record?: Usuario | null;
  columns?: ColumnDef<any>[];
  onClose?: () => void;
  onSave?: (usuarioActualizado: Usuario) => Promise<any>;
  onUploadSuccess?: (idUsuario: number) => void;
}

type PropsPagina = { userId?: string };

type Props = PropsPagina | PropiedadesPanelUsuario;

interface RolOption {
  label: string;
  value: string;
}

export default function Editar(props: Props) {
  const esPanel = 'mode' in props || 'record' in props || 'onClose' in props || 'onSave' in props;
  const propsPanel = esPanel ? (props as PropiedadesPanelUsuario) : null;
  const userIdDesdePagina = !esPanel ? (props as PropsPagina).userId : undefined;

  const modo = esPanel ? propsPanel?.mode ?? 'ver' : 'editar';
  const registroPanel = propsPanel?.record ?? null;
  const onClose = propsPanel?.onClose;
  const onSave = propsPanel?.onSave;
  const onUploadSuccess = propsPanel?.onUploadSuccess;

  const [formulario, setFormulario] = useState<Usuario | Record<string, any>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [opcionesRoles, setOpcionesRoles] = useState<RolOption[]>([]);
  const [rolSeleccionado, setRolSeleccionado] = useState<string | null>(null);
  const [estaSubiendoImagen, setEstaSubiendoImagen] = useState(false);
  const [urlVistaPrevia, setUrlVistaPrevia] = useState<string | null>(null);
  const [mostrarPasswordCrear, setMostrarPasswordCrear] = useState(false);
  const [mostrarPasswordEditar, setMostrarPasswordEditar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const { hasPermission } = usePermisos();

  useEffect(() => {
    let activo = true;
    const cargarUsuario = async () => {
      if (esPanel) {
        if (registroPanel) {
          setFormulario((registroPanel as any) || {});
        } else {
          setFormulario({});
        }
        setUrlVistaPrevia(null);
        return;
      }

      if (!userIdDesdePagina) {
        setFormulario({});
        setUrlVistaPrevia(null);
        return;
      }

      try {
        const data = await UsuariosAPI.getUsuarioById(userIdDesdePagina);
        if (activo) {
          setFormulario((data as any) || {});
          setUrlVistaPrevia(null);
        }
      } catch (error) {
        console.error('Error cargando usuario por id', error);
      }
    };
    cargarUsuario();
    return () => {
      activo = false;
    };
  }, [esPanel, registroPanel, userIdDesdePagina]);

  useEffect(() => {
    let montado = true;
    const cargarRoles = async () => {
      try {
        const roles = await RolesAPI.findRoles({fetchAll: true});
        if (montado) {
          const rolesLista = normalizarRoles(roles);
          const opciones = (rolesLista || []).map((rol: any) => ({
            label: rol.nombre || rol.name || String(rol.id),
            value: String(rol.id),
          }));
          setOpcionesRoles(opciones);
        }
      } catch (error) {
        console.error('Error cargando opciones de roles:', error);
      }
    };
    cargarRoles();
    return () => {
      montado = false;
    };
  }, []);

  useEffect(() => {
  const rolId = (formulario as any)?.rolId ?? (formulario as any)?.rol;
  if (rolId === undefined || rolId === null || rolId === '') {
    setRolSeleccionado(null);
  } else {
    setRolSeleccionado(String(rolId));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [(formulario as any)?.rolId, (formulario as any)?.rol]);


  useEffect(() => {
    return () => {
      try {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      } catch {
        // ignore
      }
    };
  }, []);

  const actualizarCampoDelFormulario = (campo: string, valor: any) => {
    setFormulario((estadoActual: any) => ({ ...estadoActual, [campo]: valor }));
    setErrores((prev) => {
      if (!prev || !prev[campo]) return prev;
      const copia = { ...prev };
      delete copia[campo];
      return copia;
    });
  };

  const manejarRolChange = (rolId: string | null) => {
    setRolSeleccionado(rolId);
    actualizarCampoDelFormulario('_assignedRoles', rolId ? [rolId] : []);
    if (rolId === null) {
      actualizarCampoDelFormulario('rolId', null);
      return;
    }
    const parsed = Number(rolId);
    actualizarCampoDelFormulario('rolId', Number.isNaN(parsed) ? rolId : parsed);
  };

  const manejarSeleccionDeArchivo = (archivo?: File) => {
    if (!archivo) return;
    try {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    } catch (error) {
      console.error('Error limpiando URL anterior:', error);
    }
    const nuevaUrl = URL.createObjectURL(archivo);
    objectUrlRef.current = nuevaUrl;
    setUrlVistaPrevia(nuevaUrl);
    actualizarCampoDelFormulario('_imagenFile', archivo);
  };

  const eliminarImagenEnServidor = async () => {
    try {
      if ((formulario as any)?.id) {
        await UsuariosAPI.updateUsuarioById((formulario as any).id, { imagen: null });
      }
      actualizarCampoDelFormulario('imagen', '');
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      alert('Error al eliminar la imagen. Inténtalo nuevamente.');
    }
  };

  const manejarEliminarImagen = () => {
    if (urlVistaPrevia) {
      try {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      } catch (error) {
        console.error('Error limpiando URL de vista previa:', error);
      }
      objectUrlRef.current = null;
      setUrlVistaPrevia(null);
      setFormulario((prev: any) => {
        const copia = { ...prev };
        delete copia._imagenFile;
        return copia;
      });
      return;
    }

    confirmDialog({
      message: '¿Estás seguro de que deseas eliminar esta imagen? Esta acción no se puede deshacer.',
      header: 'Confirmar eliminación de imagen',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      rejectClassName: 'p-button-secondary',
      accept: eliminarImagenEnServidor,
    });
  };

  const baseApi =
    (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) || 'http://127.0.0.1:3000';

  const construirUrlDeImagen = (ruta?: string) => {
    if (!ruta) return '';
    const rutaTexto = String(ruta);
    if (rutaTexto.startsWith('http://') || rutaTexto.startsWith('https://')) return rutaTexto;
    if (rutaTexto.startsWith('/')) return `${baseApi}${rutaTexto}`;
    return `${baseApi}/${rutaTexto}`;
  };

  const valorImagen = (formulario as any)?.imagen;
  const urlImagen =
    urlVistaPrevia || (formulario as any)?._imagenUrl || (valorImagen ? construirUrlDeImagen(valorImagen) : '');
  const mostrarImagen = modo === 'editar' || Boolean(valorImagen || urlVistaPrevia);
  const estaActivo = String((formulario as any)?.activoSn ?? '').toUpperCase() === 'S';

  const puedeEditarEstado =
    !!hasPermission &&
    (hasPermission('Usuarios', 'ActivoSN') ||
      hasPermission('Usuarios', 'ActivoSn') ||
      hasPermission('Usuarios', 'Activo'));

  const puedeEditarRol =
    !!hasPermission &&
    (hasPermission('Usuarios', 'Rol') ||
      hasPermission('Usuarios', 'EditarRol') ||
      hasPermission('Usuarios', 'Editar Rol'));

  const manejarCambioEstadoActivo = (valor: boolean) => {
    const nuevoValor = valor ? 'S' : 'N';
    const estaActualmenteActivo = String((formulario as any)?.activoSn ?? '').toUpperCase() === 'S';
    const esDesactivacion = estaActualmenteActivo && nuevoValor === 'N' && (formulario as any)?.id;

    if (modo === 'editar' && esDesactivacion) {
      confirmDialog({
        message: 'Si desactivas al usuario no podrá iniciar sesión. ¿Estás seguro?',
        header: 'Confirmar desactivación',
        acceptLabel: 'Desactivar',
        rejectLabel: 'Cancelar',
        acceptClassName: 'p-button-danger',
        rejectClassName: 'p-button-secondary',
        accept: () => actualizarCampoDelFormulario('activoSn', 'N'),
      });
      return;
    }

    actualizarCampoDelFormulario('activoSn', nuevoValor);
  };

  const intentarSubirImagenDespuesDeGuardar = async (archivoPendiente?: File) => {
    const archivo = archivoPendiente || (formulario as any)?._imagenFile;
    if (!archivo) return;

    let idDelUsuario = (formulario as any)?.id;
    const maxRetries = 10;
    let intento = 0;
    while ((!idDelUsuario || Number.isNaN(Number(idDelUsuario))) && intento < maxRetries) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 100));
      idDelUsuario = (formulario as any)?.id;
      intento += 1;
    }

    if (!idDelUsuario) {
      alert('Usuario guardado, pero no se pudo subir la imagen automáticamente. Inténtalo manualmente.');
      return;
    }

    try {
      await subirImagenDelUsuario(archivo, idDelUsuario);
    } catch (error) {
      console.error('Error en subida automática:', error);
    }
  };

  const subirImagenDelUsuario = async (archivo?: File, idUsuarioEspecifico?: number | string) => {
    const archivoASubir: File | undefined = archivo || (formulario as any)?._imagenFile;
    let idDelUsuario = idUsuarioEspecifico || (formulario as any)?.id;

    if (!archivoASubir) {
      alert('Selecciona un archivo antes de subir');
      return;
    }
    if (!idDelUsuario) {
      alert('Guarda el usuario primero para poder subir la imagen');
      return;
    }

    try {
      setEstaSubiendoImagen(true);
      const nombreOriginal = archivoASubir.name || 'imagen';
      const coincidenciaExtension = nombreOriginal.match(/(\.[0-9a-zA-Z]+)$/);
      const extension = coincidenciaExtension ? coincidenciaExtension[1] : '.jpg';
      const nombreDeseado = `${idDelUsuario}${extension}`;

      const respuesta = await UsuariosAPI.uploadUsuarioImagen(idDelUsuario, archivoASubir, nombreDeseado);
      if (respuesta && respuesta.path) {
        actualizarCampoDelFormulario('imagen', respuesta.path);
        if (respuesta.url) actualizarCampoDelFormulario('_imagenUrl', respuesta.url);
        setFormulario((prev: any) => {
          const copia = { ...prev };
          delete copia._imagenFile;
          return copia;
        });
        try {
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        } catch (error) {
          console.error('Error limpiando URL:', error);
        }
        objectUrlRef.current = null;
        setUrlVistaPrevia(null);
        if (onUploadSuccess) {
          const idNumero = Number(idDelUsuario);
          if (!Number.isNaN(idNumero)) onUploadSuccess(idNumero);
        }
      } else {
        throw new Error('Respuesta del servidor sin ruta válida');
      }
    } catch (error: any) {
      console.error('Error subiendo imagen del usuario:', error);
      alert('Error subiendo la imagen: ' + (error?.message || error));
    } finally {
      setEstaSubiendoImagen(false);
    }
  };

  const guardarUsuarioConValidaciones = async () => {
    setErrores({});
    const nuevosErrores: Record<string, string> = {};

    const nombre = String((formulario as any)?.nombreUsuario || '').trim();
    if (!nombre) nuevosErrores.nombreUsuario = 'El nombre es obligatorio';

    const correo = String((formulario as any)?.email || '').trim();
    if (!correo) nuevosErrores.email = 'El correo electrónico es obligatorio';

    const apellidos = String((formulario as any)?.apellidos || '').trim();
    if (!apellidos) nuevosErrores.apellidos = 'Los apellidos son obligatorios';

    const esNuevo = !(formulario as any)?.id;
    const passwordActual = String((formulario as any)?.password || '');
    if (esNuevo) {
      if (!passwordActual || passwordActual.length < 8) {
        nuevosErrores.password = 'La contraseña debe tener al menos 8 caracteres';
      }
    } else if (passwordActual && passwordActual.length < 8) {
      nuevosErrores.password = 'La nueva contraseña debe tener al menos 8 caracteres';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    const archivoPendiente: File | undefined = (formulario as any)?._imagenFile;
    const payload: any = { ...(formulario as any) };
    delete payload._imagenFile;
    delete payload._imagenPreview;
    delete payload._imagenUrl;
    if (payload._cb !== undefined) delete payload._cb;
    if (!esNuevo && Object.prototype.hasOwnProperty.call(payload, 'password')) {
      delete payload.password;
    }

    let resultadoGuardado: any = null;
    try {
      if (esPanel && onSave) {
        resultadoGuardado = await onSave(payload as Usuario);
      } else if (esNuevo) {
        resultadoGuardado = await UsuariosAPI.register(payload);
        if (resultadoGuardado?.id) {
          setFormulario((prev: any) => ({ ...prev, id: resultadoGuardado.id }));
        }
      } else if (payload.id) {
        await UsuariosAPI.updateUsuarioById(payload.id, payload);
        resultadoGuardado = { id: payload.id };
      }
    } catch (e: any) {
      const erroresGuardado: Record<string, string> = {};
      const mensaje = e?.message || '';
      let mensajeBackend: string | null = null;
      let detalles: any = null;
      const indiceJson = mensaje.indexOf('{');
      if (indiceJson >= 0) {
        try {
          const jsonStr = mensaje.slice(indiceJson);
          const parsed = JSON.parse(jsonStr);
          mensajeBackend = parsed?.error?.message || null;
          detalles = parsed?.error?.details || null;
        } catch {
          // ignore
        }
      }
      const base = (mensajeBackend || mensaje).toLowerCase();
      if (/correo|email/.test(base)) erroresGuardado.email = 'Este correo ya está en uso';
      if (/usuario|nombre\s*de\s*usuario/.test(base)) erroresGuardado.nombreUsuario = 'Este nombre de usuario ya está en uso';
      if (/additionalproperties/.test(base) && /password/.test(base)) {
        erroresGuardado.password = 'No se puede cambiar la contraseña desde este formulario.';
      }
      if (!erroresGuardado.password && Array.isArray(detalles)) {
        const conflictivo = detalles.find(
          (detalle: any) =>
            (detalle?.code === 'additionalProperties' || /additionalproperties/i.test(String(detalle?.code))) &&
            detalle?.info?.additionalProperty === 'password',
        );
        if (conflictivo) {
          erroresGuardado.password = 'No se puede cambiar la contraseña desde este formulario.';
        }
      }
      if (Object.keys(erroresGuardado).length === 0) {
        erroresGuardado.general = mensajeBackend || 'Revisa los datos enviados';
      }
      setErrores(erroresGuardado);
      return;
    }

    try {
      const idNuevo =
        (resultadoGuardado && (resultadoGuardado.id || resultadoGuardado?.data?.id)) ||
        (formulario as any)?.id;
      if (archivoPendiente && idNuevo) {
        await subirImagenDelUsuario(archivoPendiente, idNuevo);
      } else {
        await intentarSubirImagenDespuesDeGuardar(archivoPendiente);
      }
    } catch (error) {
      console.error('Error en subida automática de imagen:', error);
    }
  };

  if (esPanel && !registroPanel) return null;

  return (
    <div>
      {!esPanel && <h2>Editar usuario</h2>}
      <EditarDatosUsuariosVista
        modo={modo}
        esPanel={esPanel}
        formulario={formulario}
        errores={errores}
        puedeEditarEstado={puedeEditarEstado}
        puedeEditarRol={puedeEditarRol}
        mostrarImagen={mostrarImagen}
        urlImagen={urlImagen}
        urlVistaPrevia={urlVistaPrevia}
        estaActivo={estaActivo}
        estaSubiendoImagen={estaSubiendoImagen}
        rolSeleccionado={rolSeleccionado}
        opcionesRol={opcionesRoles}
        mostrarPasswordCrear={mostrarPasswordCrear}
        mostrarPasswordEditar={mostrarPasswordEditar}
        fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
        onCampoChange={actualizarCampoDelFormulario}
        onGuardarClick={guardarUsuarioConValidaciones}
        onCerrarClick={onClose}
        onEstadoActivoChange={manejarCambioEstadoActivo}
        onRolChange={manejarRolChange}
        onSeleccionarArchivo={manejarSeleccionDeArchivo}
        onEliminarImagenClick={manejarEliminarImagen}
        onSubirImagenClick={() => subirImagenDelUsuario()}
        onTogglePasswordCrear={() => setMostrarPasswordCrear((prev) => !prev)}
        onTogglePasswordEditar={() => setMostrarPasswordEditar((prev) => !prev)}
      />
    </div>
  );
}
