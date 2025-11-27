import React, { useEffect, useMemo, useState } from 'react'
import RolesAPI from '../../api-endpoints/roles/index'
import PermisosAPI from '../../api-endpoints/permisos/index'
import usePermisos from '../../hooks/usePermisos'
import '../../styles/pages/PermisosPage.scss'

/**
 * Tipo base de un permiso tal y como lo manejamos en la tabla
 */
type Permiso = {
  id?: string | number
  pantalla: string
  accion: string
  permisoSn: string
  rolId: number | string
}

/**
 * Normaliza la respuesta de RolesAPI a un array de roles plano.
 * Puede venir como {data: [...]} o directamente como [...]
 */
const normalizarRoles = (respuesta: any) =>
  Array.isArray(respuesta?.data)
    ? respuesta.data
    : Array.isArray(respuesta)
      ? respuesta
      : []

/**
 * Página de administración de permisos:
 * - Muestra una matriz Pantalla x Acción x Rol
 * - Permite alternar (S/N) los permisos por rol si el usuario tiene permiso de actualización
 */
export default function PaginaPermisos() {
  // Lista completa de roles (columnas)
  const [listaRoles, setListaRoles] = useState<any[]>([])
  // Lista completa de permisos existentes en BD
  const [listaPermisos, setListaPermisos] = useState<Permiso[]>([])
  // Estado de carga global de la página
  const [cargando, setCargando] = useState(false)
  // Identificador de la celda que se está guardando (para deshabilitar checkbox)
  const [celdaGuardando, setCeldaGuardando] = useState<string | null>(null)
  // Mensaje de error general (parte superior de la página)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  // --------------------------------------------------
  // Cargar roles y permisos en paralelo al montar
  // --------------------------------------------------
  useEffect(() => {
    setCargando(true)

    Promise.all([
      RolesAPI.findRoles({ fetchAll: true }),
      PermisosAPI.findPermisos({})
    ])
      .then(([datosRoles, datosPermisos]: any) => {
        setListaRoles(normalizarRoles(datosRoles))
        setListaPermisos(Array.isArray(datosPermisos) ? datosPermisos : [])
      })
      .catch((err) => {
        console.error(err)
        setMensajeError('Error cargando datos')
      })
      .finally(() => setCargando(false))
  }, [])

  // --------------------------------------------------
  // Seguridad en frontend: comprobación de permisos propios
  // --------------------------------------------------

  const { hasPermission: tienePermiso } = usePermisos()
  const puedeVerPagina =
    tienePermiso('Permisos', 'Ver') || tienePermiso('Permisos', 'Actualizar')
  const puedeModificar = tienePermiso('Permisos', 'Actualizar')

  // --------------------------------------------------
  // Construcción de la matriz Pantalla -> Acciones
  // --------------------------------------------------
  const pantallasSeccion = useMemo(() => {
    const agrupado: Record<string, Set<string>> = {}

    // 1) Forzar que 'Usuarios' y 'Roles' tengan siempre estas acciones mínimas
    agrupado['Usuarios'] = new Set([
      'Ver',
      'Nuevo',
      'Actualizar',
      'Borrar',
      'ActivoSn',
      'Rol'
    ])
    agrupado['Roles'] = new Set([
      'Ver',
      'Nuevo',
      'Actualizar',
      'Borrar',
      'ActivoSn'
    ])

    // 2) Añadir el resto de pantallas / acciones a partir de la BD
    listaPermisos.forEach((permisoItem) => {
      const nombrePantalla = permisoItem.pantalla || 'Desconocido'
      agrupado[nombrePantalla] = agrupado[nombrePantalla] || new Set<string>()
      if (permisoItem.accion) agrupado[nombrePantalla].add(permisoItem.accion)
    })

    // Transformamos a array de secciones: { pantalla, acciones[] }
    return Object.keys(agrupado).map((nombrePantalla) => ({
      pantalla: nombrePantalla,
      acciones: Array.from(agrupado[nombrePantalla])
    }))
  }, [listaPermisos])

  // Si el usuario no tiene permiso para ver esta pantalla, no renderizamos la tabla
  if (!puedeVerPagina) {
    return (
      <div className="permisos-page__no-access">
        No tienes permisos para ver esta sección.
      </div>
    )
  }

  // --------------------------------------------------
  // Helpers de búsqueda / actualización de permisos
  // --------------------------------------------------

  /**
   * Devuelve el permiso correspondiente a (rol, pantalla, acción) o null si no existe.
   */
  function buscarPermisoPorRol(
    rolId: any,
    nombrePantalla: string,
    nombreAccion: string
  ) {
    return (
      listaPermisos.find(
        (permisoItem) =>
          String(permisoItem.rolId) === String(rolId) &&
          permisoItem.accion === nombreAccion &&
          permisoItem.pantalla === nombrePantalla
      ) || null
    )
  }

  /**
   * Alterna un permiso concreto (checkbox):
   * - Si no existe, lo crea con permisoSn = 'S'
   * - Si existe, alterna entre 'S' y 'N'
   */
  async function alternarPermiso(
    rolId: any,
    nombrePantalla: string,
    nombreAccion: string
  ) {
    setMensajeError(null)

    if (!puedeModificar) {
      setMensajeError('No tienes permiso para modificar permisos')
      return
    }

    const permisoEncontrado = buscarPermisoPorRol(
      rolId,
      nombrePantalla,
      nombreAccion
    )

    // Clave única de la celda para marcarla como "guardando"
    const claveCelda = permisoEncontrado
      ? String(permisoEncontrado.id)
      : `${rolId}-${nombrePantalla}-${nombreAccion}`

    setCeldaGuardando(claveCelda)

    try {
      if (!permisoEncontrado) {
        // No existía: creamos el permiso con permisoSn = 'S'
        const creado = await PermisosAPI.createPermiso({
          pantalla: nombrePantalla,
          accion: nombreAccion,
          permisoSn: 'S',
          rolId
        })

        setListaPermisos((estadoAnterior) => estadoAnterior.concat(creado))
      } else {
        // Existía: alternamos S/N
        const nuevoValor = permisoEncontrado.permisoSn === 'S' ? 'N' : 'S'

        await PermisosAPI.updatePermisoById(permisoEncontrado.id, {
          permisoSn: nuevoValor
        })

        setListaPermisos((estadoAnterior) =>
          estadoAnterior.map((item) =>
            item.id === permisoEncontrado.id
              ? { ...item, permisoSn: nuevoValor }
              : item
          )
        )
      }
    } catch (err: any) {
      console.error(err)
      setMensajeError('Error actualizando permiso')
    } finally {
      setCeldaGuardando(null)
    }
  }

  // --------------------------------------------------
  // Render principal de la página
  // --------------------------------------------------

  return (
    <div className="permisos-page">
      {/* Mensaje de error global */}
      {mensajeError && (
        <div className="permisos-page__error">{mensajeError}</div>
      )}

      {/* Indicador de carga general */}
      {cargando && (
        <div className="permisos-page__loading">
          Cargando permisos y roles...
        </div>
      )}

      {/* Una sección por pantalla (Usuarios, Roles, Productos, etc.) */}
      {pantallasSeccion.map((seccion) => (
        <section
          key={seccion.pantalla}
          className="permisos-page__section"
        >
          <h2 className="permisos-page__section-title">
            {seccion.pantalla}
          </h2>

          <table className="permisos-page__table">
            <thead>
              <tr>
                <th className="permisos-page__th permisos-page__th--left">
                  ROL
                </th>
                {listaRoles.map((rol) => (
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
                  {/* Nombre de la acción (fila) */}
                  <td className="permisos-page__td permisos-page__accion">
                    {accion}
                  </td>

                  {/* Celdas: una por rol, con el checkbox de permiso */}
                  {listaRoles.map((rol) => {
                    const permisoParaCelda = buscarPermisoPorRol(
                      rol.id,
                      seccion.pantalla,
                      accion
                    )

                    const marcado = permisoParaCelda
                      ? permisoParaCelda.permisoSn === 'S'
                      : false

                    const claveCelda =
                      permisoParaCelda
                        ? String(permisoParaCelda.id)
                        : `${rol.id}-${seccion.pantalla}-${accion}`

                    const deshabilitado = celdaGuardando === claveCelda

                    return (
                      <td
                        key={rol.id}
                        className="permisos-page__td permisos-page__td--checkbox"
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={deshabilitado}
                          onChange={() =>
                            alternarPermiso(
                              rol.id,
                              seccion.pantalla,
                              accion
                            )
                          }
                          className="permisos-page__checkbox"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}
