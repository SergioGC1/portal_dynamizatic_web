import React from 'react';

type PropsVistaPermisos = {
  puedeVerSeccion: boolean;
  rolIdSeleccionado?: string;
  titulo: string;
  mensajeError: string | null;
  cargando: boolean;
  listaRoles: any[];
  seccionesPantalla: { pantalla: string; acciones: string[] }[];
  obtenerPermisoMarcado: (rolIdLocal: any, pantalla: string, accion: string) => boolean;
  estaCeldaProcesando: (rolIdLocal: any, pantalla: string, accion: string) => boolean;
  onAlternarPermiso: (rolIdLocal: any, pantalla: string, accion: string) => void;
};

export default function EditarDatosPermisos({
  puedeVerSeccion,
  rolIdSeleccionado,
  titulo,
  mensajeError,
  cargando,
  listaRoles,
  seccionesPantalla,
  obtenerPermisoMarcado,
  estaCeldaProcesando,
  onAlternarPermiso,
}: PropsVistaPermisos) {
  if (!puedeVerSeccion) {
    return <div style={{ padding: 16, color: '#a00' }}>No tienes permisos para ver esta sección.</div>;
  }

  const mostrarRolEnTabla = (rol: any) => {
    if (!rolIdSeleccionado) return true;
    return String(rol.id) === String(rolIdSeleccionado);
  };

  return (
    <div style={{ maxWidth: 960 }}>
      <h3>{titulo}</h3>
      {mensajeError && <div style={{ color: 'red', margin: 8 }}>{mensajeError}</div>}
      {cargando && <div style={{ margin: 8 }}>Cargando permisos...</div>}

      {seccionesPantalla.map((seccion) => (
        <section key={seccion.pantalla} style={{ marginTop: 16 }}>
          <h4 style={{ background: '#2c2c2c', color: '#fff', padding: '6px 10px' }}>{seccion.pantalla}</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ padding: 10, borderBottom: '1px solid #ddd', textAlign: 'left' }}>ACCIÓN</th>
                {listaRoles.filter(mostrarRolEnTabla).map((rol) => (
                  <th
                    key={rol.id}
                    style={{ padding: 10, borderBottom: '1px solid #ddd', textAlign: 'center', background: '#f5f5f5', textTransform: 'uppercase' }}
                  >
                    {rol.nombre || rol.name || `Rol ${rol.id}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seccion.acciones.map((accion: string) => (
                <tr key={accion} style={{ borderBottom: '1px solid #f2f2f2' }}>
                  <td style={{ padding: 12 }}>{accion}</td>
                  {listaRoles.filter(mostrarRolEnTabla).map((rol) => {
                    const marcado = obtenerPermisoMarcado(rol.id, seccion.pantalla, accion);
                    const celdaBloqueada = estaCeldaProcesando(rol.id, seccion.pantalla, accion);
                    return (
                      <td key={rol.id} style={{ padding: 12, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={celdaBloqueada}
                          onChange={() => onAlternarPermiso(rol.id, seccion.pantalla, accion)}
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
