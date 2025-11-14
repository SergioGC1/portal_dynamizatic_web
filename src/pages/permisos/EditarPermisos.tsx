import React from 'react';
import '../../styles/pages/PermisosPage.scss';

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
    return <div className="permisos-page__no-access">No tienes permisos para ver esta sección.</div>;
  }

  const mostrarRolEnTabla = (rol: any) => {
    if (!rolIdSeleccionado) return true;
    return String(rol.id) === String(rolIdSeleccionado);
  };

  return (
    <div className="permisos-page permisos-page--editar">
      <h2>{titulo}</h2>
      {mensajeError && <div className="permisos-page__error">{mensajeError}</div>}
      {cargando && <div className="permisos-page__loading">Cargando permisos...</div>}

      {seccionesPantalla.map((seccion) => (
        <section key={seccion.pantalla} className="permisos-page__section">
          <h4 className="permisos-page__section-title">{seccion.pantalla}</h4>
          <table className="permisos-page__table">
            <thead>
              <tr>
                <th className="permisos-page__th permisos-page__th--left">ACCIÓN</th>
                {listaRoles.filter(mostrarRolEnTabla).map((rol) => (
                  <th
                    key={rol.id}
                    className="permisos-page__th permisos-page__th--role"
                  >
                    {rol.nombre || rol.name || `Rol ${rol.id}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seccion.acciones.map((accion: string) => (
                <tr key={accion}>
                  <td className="permisos-page__td permisos-page__accion">{accion}</td>
                  {listaRoles.filter(mostrarRolEnTabla).map((rol) => {
                    const marcado = obtenerPermisoMarcado(rol.id, seccion.pantalla, accion);
                    const celdaBloqueada = estaCeldaProcesando(rol.id, seccion.pantalla, accion);
                    return (
                      <td key={rol.id} className="permisos-page__td permisos-page__td--checkbox">
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={celdaBloqueada}
                          onChange={() => onAlternarPermiso(rol.id, seccion.pantalla, accion)}
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
