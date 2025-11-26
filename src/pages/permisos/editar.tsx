import React, { useEffect, useMemo, useState } from 'react';
import EditarDatosPermisos from './EditarPermisos';
import PermisosAPI from '../../api-endpoints/permisos/index';
import RolesAPI from '../../api-endpoints/roles/index';
import usePermisos from '../../hooks/usePermisos';
const normalizarRoles = (respuesta: any) => (Array.isArray(respuesta?.data) ? respuesta.data : Array.isArray(respuesta) ? respuesta : []);

type Permiso = {
  id?: string | number;
  pantalla: string;
  accion: string;
  permisoSn: string;
  rolId: number | string;
};

type Props = { rolId?: string };

export default function Editar({ rolId }: Props) {
  const [listaPermisos, setListaPermisos] = useState<Permiso[]>([]);
  const [listaRoles, setListaRoles] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [celdaEnProceso, setCeldaEnProceso] = useState<string | null>(null);

  const { hasPermission: tienePermiso } = usePermisos();
  const puedeVerSeccion = tienePermiso('Permisos', 'Ver') || tienePermiso('Permisos', 'Actualizar');
  const puedeModificar = tienePermiso('Permisos', 'Actualizar');

  useEffect(() => {
    let componenteActivo = true;
    const cargarDatosIniciales = async () => {
      setCargando(true);
      setMensajeError(null);
      try {
        const [rolesRespuesta, permisosRespuesta] = await Promise.all([
          RolesAPI.findRoles({fetchAll: true}),
          PermisosAPI.findPermisos({}),
        ]);
        if (!componenteActivo) return;
        const rolesLimpios = normalizarRoles(rolesRespuesta);
        const permisosLimpios = Array.isArray(permisosRespuesta) ? permisosRespuesta : [];
        setListaRoles(rolesLimpios);
        setListaPermisos(
          rolId ? permisosLimpios.filter((permisoItem: any) => String(permisoItem.rolId) === String(rolId)) : permisosLimpios,
        );
      } catch (error) {
        console.error('Error cargando datos del backend:', error);
        if (componenteActivo) {
          setMensajeError('Error cargando datos del servidor');
          setListaRoles([]);
          setListaPermisos([]);
        }
      } finally {
        if (componenteActivo) setCargando(false);
      }
    };
    cargarDatosIniciales();
    return () => {
      componenteActivo = false;
    };
  }, [rolId]);

  const seccionesPantalla = useMemo(() => {
    const mapaPantallas: Record<string, Set<string>> = {};
    listaPermisos.forEach((permisoItem) => {
      const nombrePantalla = permisoItem.pantalla || 'Desconocido';
      mapaPantallas[nombrePantalla] = mapaPantallas[nombrePantalla] || new Set<string>();
      if (permisoItem.accion) mapaPantallas[nombrePantalla].add(permisoItem.accion);
    });
    return Object.keys(mapaPantallas).map((nombrePantalla) => ({
      pantalla: nombrePantalla,
      acciones: Array.from(mapaPantallas[nombrePantalla]),
    }));
  }, [listaPermisos]);

  const buscarPermisoPorRol = (rolIdLocal: any, nombrePantalla: string, nombreAccion: string) => {
    return (
      listaPermisos.find(
        (permisoItem) =>
          String(permisoItem.rolId) === String(rolIdLocal) &&
          permisoItem.accion === nombreAccion &&
          permisoItem.pantalla === nombrePantalla,
      ) || null
    );
  };

  const obtenerPermisoMarcado = (rolIdLocal: any, nombrePantalla: string, nombreAccion: string) => {
    const permisoEncontrado = buscarPermisoPorRol(rolIdLocal, nombrePantalla, nombreAccion);
    return permisoEncontrado ? permisoEncontrado.permisoSn === 'S' : false;
  };

  const estaCeldaProcesando = (rolIdLocal: any, nombrePantalla: string, nombreAccion: string) => {
    const permisoEncontrado = buscarPermisoPorRol(rolIdLocal, nombrePantalla, nombreAccion);
    const claveCelda = permisoEncontrado ? String(permisoEncontrado.id) : `${rolIdLocal}-${nombrePantalla}-${nombreAccion}`;
    return celdaEnProceso === claveCelda;
  };

  const alternarPermiso = async (rolIdLocal: any, nombrePantalla: string, nombreAccion: string) => {
    setMensajeError(null);
    if (!puedeModificar) {
      setMensajeError('No tienes permiso para modificar permisos');
      return;
    }
    const permisoEncontrado = buscarPermisoPorRol(rolIdLocal, nombrePantalla, nombreAccion);
    const claveCelda = permisoEncontrado ? String(permisoEncontrado.id) : `${rolIdLocal}-${nombrePantalla}-${nombreAccion}`;
    setCeldaEnProceso(claveCelda);
    try {
      if (!permisoEncontrado) {
        const permisoCreado = await PermisosAPI.createPermiso({
          pantalla: nombrePantalla,
          accion: nombreAccion,
          permisoSn: 'S',
          rolId: rolIdLocal,
        });
        setListaPermisos((prev) => prev.concat(permisoCreado));
      } else {
        const nuevoValor = permisoEncontrado.permisoSn === 'S' ? 'N' : 'S';
        await PermisosAPI.updatePermisoById(permisoEncontrado.id, { permisoSn: nuevoValor });
        setListaPermisos((prev) =>
          prev.map((item) => (item.id === permisoEncontrado.id ? { ...item, permisoSn: nuevoValor } : item)),
        );
      }
    } catch (error) {
      console.error('Error actualizando permiso:', error);
      setMensajeError('Error actualizando permiso');
    } finally {
      setCeldaEnProceso(null);
    }
  };

  const titulo = rolId ? `Editar permisos del rol ${rolId}` : 'Editar permisos';

  return (
    <EditarDatosPermisos
      puedeVerSeccion={puedeVerSeccion}
      rolIdSeleccionado={rolId}
      titulo={titulo}
      mensajeError={mensajeError}
      cargando={cargando}
      listaRoles={listaRoles}
      seccionesPantalla={seccionesPantalla}
      obtenerPermisoMarcado={obtenerPermisoMarcado}
      estaCeldaProcesando={estaCeldaProcesando}
      onAlternarPermiso={alternarPermiso}
    />
  );
}
