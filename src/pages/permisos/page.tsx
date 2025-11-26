import React, { useEffect, useMemo, useState } from 'react';
import RolesAPI from '../../api-endpoints/roles/index';
import PermisosAPI from '../../api-endpoints/permisos/index';
import usePermisos from '../../hooks/usePermisos';
import '../../styles/pages/PermisosPage.scss';

type Permiso = { id?: string | number; pantalla: string; accion: string; permisoSn: string; rolId: number | string };
const normalizarRoles = (respuesta: any) => (Array.isArray(respuesta?.data) ? respuesta.data : Array.isArray(respuesta) ? respuesta : []);

export default function PaginaPermisos() {
  const [listaRoles, setListaRoles] = useState<any[]>([]);
  const [listaPermisos, setListaPermisos] = useState<Permiso[]>([]);
  const [cargando, setCargando] = useState(false);
  const [celdaGuardando, setCeldaGuardando] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Cargar roles y permisos en paralelo
  useEffect(() => {
    setCargando(true);
    Promise.all([RolesAPI.findRoles({fetchAll: true}), PermisosAPI.findPermisos({})])
      .then(([datosRoles, datosPermisos]: any) => {
        setListaRoles(normalizarRoles(datosRoles));
        setListaPermisos(Array.isArray(datosPermisos) ? datosPermisos : []);
      })
      .catch((err) => { console.error(err); setMensajeError('Error cargando datos'); })
      .finally(() => setCargando(false));
  }, []);

  // Seguridad en frontend: comprobar si el usuario tiene permiso para ver/gestionar permisos
  const { hasPermission: tienePermiso } = usePermisos()
  const puedeVerPagina = tienePermiso('Permisos', 'Ver') || tienePermiso('Permisos', 'Actualizar')
  const puedeModificar = tienePermiso('Permisos', 'Actualizar')

  // Calcular pantallas y sus acciones a partir de los permisos existentes
  const pantallasSeccion = useMemo(() => {
    const agrupado: Record<string, Set<string>> = {};
    
    // PRIMERO: Asegurar que 'Usuarios' y 'Roles' siempre existen con sus acciones obligatorias
    agrupado['Usuarios'] = new Set(['Ver', 'Nuevo', 'Actualizar', 'Borrar', 'ActivoSn', 'Rol']);
    agrupado['Roles'] = new Set(['Ver', 'Nuevo', 'Actualizar', 'Borrar', 'ActivoSn']);
    
    // SEGUNDO: Añadir permisos existentes de la BD
    listaPermisos.forEach(permisoItem => {
      const nombrePantalla = permisoItem.pantalla || 'Desconocido';
      agrupado[nombrePantalla] = agrupado[nombrePantalla] || new Set<string>();
      if (permisoItem.accion) agrupado[nombrePantalla].add(permisoItem.accion);
    });
    
    return Object.keys(agrupado).map(nombre => ({ pantalla: nombre, acciones: Array.from(agrupado[nombre]) }));
  }, [listaPermisos]);

  if (!puedeVerPagina) {
    return <div className="permisos-page__no-access">No tienes permisos para ver esta sección.</div>
  }

  // Helper: obtener permiso por rol+pantalla+accion
  function buscarPermisoPorRol(rolId: any, nombrePantalla: string, nombreAccion: string) {
    return listaPermisos.find(permisoItem => String(permisoItem.rolId) === String(rolId) && permisoItem.accion === nombreAccion && permisoItem.pantalla === nombrePantalla) || null;
  }

  async function alternarPermiso(rolId: any, nombrePantalla: string, nombreAccion: string) {
    setMensajeError(null);
    if (!puedeModificar) {
      setMensajeError('No tienes permiso para modificar permisos');
      return
    }
    const permisoEncontrado = buscarPermisoPorRol(rolId, nombrePantalla, nombreAccion);
    const claveCelda = permisoEncontrado ? String(permisoEncontrado.id) : `${rolId}-${nombrePantalla}-${nombreAccion}`;
    setCeldaGuardando(claveCelda);
    try {
      if (!permisoEncontrado) {
        // crear con 'S'
        const creado = await PermisosAPI.createPermiso({ pantalla: nombrePantalla, accion: nombreAccion, permisoSn: 'S', rolId });
        setListaPermisos(prev => prev.concat(creado));
      } else {
        const nuevoValor = permisoEncontrado.permisoSn === 'S' ? 'N' : 'S';
        await PermisosAPI.updatePermisoById(permisoEncontrado.id, { permisoSn: nuevoValor });
        setListaPermisos(prev => prev.map(item => item.id === permisoEncontrado.id ? { ...item, permisoSn: nuevoValor } : item));
      }
    } catch (err: any) {
      console.error(err);
      setMensajeError('Error actualizando permiso');
    } finally {
      setCeldaGuardando(null);
    }
  }

  // Render por pantalla
  return (
    <div className="permisos-page">
      {mensajeError && <div className="permisos-page__error">{mensajeError}</div>}
      {cargando && <div className="permisos-page__loading">Cargando permisos y roles...</div>}

      {pantallasSeccion.map(seccion => (
        <section key={seccion.pantalla} className="permisos-page__section">
          <h2 className="permisos-page__section-title">{seccion.pantalla}</h2>
          <table className="permisos-page__table">
            <thead>
              <tr>
                <th className="permisos-page__th permisos-page__th--left">ROL</th>
                {listaRoles.map(rol => (
                  <th key={rol.id} className="permisos-page__th permisos-page__th--role">{rol.nombre || rol.name || `Rol ${rol.id}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seccion.acciones.map((accion: string) => (
                <tr key={accion}>
                  <td className="permisos-page__td permisos-page__accion">{accion}</td>
                  {listaRoles.map(rol => {
                    const permisoParaCelda = buscarPermisoPorRol(rol.id, seccion.pantalla, accion);
                    const marcado = permisoParaCelda ? permisoParaCelda.permisoSn === 'S' : false;
                    const deshabilitado = celdaGuardando === (permisoParaCelda ? String(permisoParaCelda.id) : `${rol.id}-${seccion.pantalla}-${accion}`);
                    return (
                      <td key={rol.id} className="permisos-page__td permisos-page__td--checkbox">
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={deshabilitado}
                          onChange={() => alternarPermiso(rol.id, seccion.pantalla, accion)}
                          className="permisos-page__checkbox"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
