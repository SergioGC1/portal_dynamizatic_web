import React, { useEffect, useMemo, useState } from 'react';
import RolesAPI from '../../api-endpoints/roles/index';
import PermisosAPI from '../../api-endpoints/permisos/index';
import usePermisos from '../../hooks/usePermisos';

type Permiso = { id?: string | number; pantalla: string; accion: string; permisoSn: string; rolId: number | string };

export default function PaginaPermisos() {
  const [listaRoles, setListaRoles] = useState<any[]>([]);
  const [listaPermisos, setListaPermisos] = useState<Permiso[]>([]);
  const [cargando, setCargando] = useState(false);
  const [celdaGuardando, setCeldaGuardando] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Cargar roles y permisos en paralelo
  useEffect(() => {
    setCargando(true);
    Promise.all([RolesAPI.findRoles({}), PermisosAPI.findPermisos({})])
      .then(([datosRoles, datosPermisos]: any) => {
        setListaRoles(Array.isArray(datosRoles) ? datosRoles : []);
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
    listaPermisos.forEach(permisoItem => {
      const nombrePantalla = permisoItem.pantalla || 'Desconocido';
      agrupado[nombrePantalla] = agrupado[nombrePantalla] || new Set<string>();
      if (permisoItem.accion) agrupado[nombrePantalla].add(permisoItem.accion);
    });
    return Object.keys(agrupado).map(nombre => ({ pantalla: nombre, acciones: Array.from(agrupado[nombre]) }));
  }, [listaPermisos]);

  if (!puedeVerPagina) {
    return <div style={{ padding: 16, color: '#a00' }}>No tienes permisos para ver esta sección.</div>
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
    <div>
      {mensajeError && <div style={{ color: 'red', margin: 8 }}>{mensajeError}</div>}
      {cargando && <div style={{ margin: 8 }}>Cargando permisos y roles...</div>}

      {pantallasSeccion.map(seccion => (
        <section key={seccion.pantalla} style={{ marginTop: 16 }}>
            <h3 style={{ background: '#2c2c2c', color: '#fff', padding: '8px 12px' }}>{seccion.pantalla}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ padding: 10, borderBottom: '1px solid #ddd', textAlign: 'left' }}>ROL</th>
                {listaRoles.map(rol => (
                  <th key={rol.id} style={{ padding: 10, borderBottom: '1px solid #ddd', textAlign: 'center', background: '#f5f5f5', textTransform: 'uppercase' }}>{rol.nombre || rol.name || `Rol ${rol.id}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seccion.acciones.map((accion: string) => (
                <tr key={accion} style={{ borderBottom: '1px solid #f2f2f2' }}>
                  <td style={{ padding: 12 }}>{accion}</td>
                  {listaRoles.map(rol => {
                    const permisoParaCelda = buscarPermisoPorRol(rol.id, seccion.pantalla, accion);
                    const marcado = permisoParaCelda ? permisoParaCelda.permisoSn === 'S' : false;
                    const deshabilitado = celdaGuardando === (permisoParaCelda ? String(permisoParaCelda.id) : `${rol.id}-${seccion.pantalla}-${accion}`);
                    return (
                      <td key={rol.id} style={{ padding: 12, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={deshabilitado}
                          onChange={() => alternarPermiso(rol.id, seccion.pantalla, accion)}
                          style={{ width: 18, height: 18, accentColor: '#1976d2', boxShadow: marcado ? '0 0 6px rgba(25,118,210,0.4)' : 'none' }}
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
