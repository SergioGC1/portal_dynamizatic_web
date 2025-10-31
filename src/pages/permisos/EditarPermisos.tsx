import React, { useEffect, useMemo, useState } from 'react';
import PermisosAPI from '../../api-endpoints/permisos/index';
import RolesAPI from '../../api-endpoints/roles/index';
import usePermisos from '../../hooks/usePermisos';

type Permiso = { id?: string | number; pantalla: string; accion: string; permisoSn: string; rolId: number | string };

type Props = { rolId?: string };

export default function EditarPermisos({ rolId }: Props) {
  // Estado local: listas de roles y permisos, indicadores de carga y errores
  const [listaPermisos, setListaPermisos] = useState<Permiso[]>([]);
  const [listaRoles, setListaRoles] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [celdaGuardando, setCeldaGuardando] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Hook para comprobar permisos del rol actual (frontend)
  const { hasPermission: tienePermiso } = usePermisos();
  const puedeVer = tienePermiso('Permisos', 'Ver') || tienePermiso('Permisos', 'Actualizar');
  const puedeModificar = tienePermiso('Permisos', 'Actualizar');

  // Al montar el componente: obtener roles y permisos del backend
  useEffect(() => {
    setCargando(true);
    Promise.all([RolesAPI.findRoles({}), PermisosAPI.findPermisos({})])
      .then(([rolesData, permisosData]: any) => {
        setListaRoles(Array.isArray(rolesData) ? rolesData : []);
        // Si se pasó `rolId` como prop, filtramos los permisos para ese rol concreto
        const lista = Array.isArray(permisosData) ? permisosData : [];
        setListaPermisos(rolId ? lista.filter((permisoItem: any) => String(permisoItem.rolId) === String(rolId)) : lista);
      })
      .catch((err) => { console.error(err); setMensajeError('Error cargando datos'); })
      .finally(() => setCargando(false));
  }, [rolId]);

  // Construir la lista de pantallas y sus acciones a partir de los permisos cargados
  const pantallasSeccion = useMemo(() => {
    const agrupado: Record<string, Set<string>> = {};
    listaPermisos.forEach(permisoItem => {
      const nombrePantalla = permisoItem.pantalla || 'Desconocido';
      agrupado[nombrePantalla] = agrupado[nombrePantalla] || new Set<string>();
      if (permisoItem.accion) agrupado[nombrePantalla].add(permisoItem.accion);
    });
    return Object.keys(agrupado).map(nombre => ({ pantalla: nombre, acciones: Array.from(agrupado[nombre]) }));
  }, [listaPermisos]);

  /** Buscar un permiso concreto por rol/pantalla/acción */
  function buscarPermisoPorRol(rolIdLocal: any, nombrePantalla: string, nombreAccion: string) {
    return listaPermisos.find(permisoItem => String(permisoItem.rolId) === String(rolIdLocal) && permisoItem.accion === nombreAccion && permisoItem.pantalla === nombrePantalla) || null;
  }

  /** Alternar (crear o actualizar) el valor de un permiso para un rol/pantalla/acción */
  async function alternarPermiso(rolIdLocal: any, nombrePantalla: string, nombreAccion: string) {
    setMensajeError(null);
    if (!puedeModificar) {
      setMensajeError('No tienes permiso para modificar permisos');
      return;
    }
    const permisoEncontrado = buscarPermisoPorRol(rolIdLocal, nombrePantalla, nombreAccion);
    const claveCelda = permisoEncontrado ? String(permisoEncontrado.id) : `${rolIdLocal}-${nombrePantalla}-${nombreAccion}`;
    setCeldaGuardando(claveCelda);
    try {
      if (!permisoEncontrado) {
        const creado = await PermisosAPI.createPermiso({ pantalla: nombrePantalla, accion: nombreAccion, permisoSn: 'S', rolId: rolIdLocal });
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

  // Comprobación rápida: si no puede ver la sección mostramos mensaje
  if (!puedeVer) {
    return <div style={{ padding: 16, color: '#a00' }}>No tienes permisos para ver esta sección.</div>
  }

  return (
    <div style={{ maxWidth: 960 }}>
  <h3>{rolId ? `Editar permisos del rol ${rolId}` : 'Editar permisos'}</h3>
  {mensajeError && <div style={{ color: 'red', margin: 8 }}>{mensajeError}</div>}
  {cargando && <div style={{ margin: 8 }}>Cargando permisos...</div>}

      {pantallasSeccion.map(seccion => (
        <section key={seccion.pantalla} style={{ marginTop: 16 }}>
          <h4 style={{ background: '#2c2c2c', color: '#fff', padding: '6px 10px' }}>{seccion.pantalla}</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ padding: 10, borderBottom: '1px solid #ddd', textAlign: 'left' }}>ACCION</th>
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
                    // Si se pasó `rolId` como prop, sólo renderizamos la columna del rol solicitado
                    if (rolId && String(rol.id) !== String(rolId)) return <td key={rol.id} style={{ padding: 12 }} />;
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
