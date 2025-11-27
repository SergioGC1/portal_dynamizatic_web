import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ColumnDef } from '../../../components/data-table/DataTable'
import { Calendar } from 'primereact/calendar'
import { InputSwitch } from 'primereact/inputswitch'
import EditarDatosProductos from './DatosProductos'
import usePermisos from '../../../hooks/usePermisos'
import { useAuth } from '../../../contexts/AuthContext'
import productosAPI from '../../../api-endpoints/productos/index'
import estadosAPI from '../../../api-endpoints/estados/index'
import fasesAPI from '../../../api-endpoints/fases'
import tareasFasesAPI from '../../../api-endpoints/tareas-fases'
import productosFasesTareasAPI from '../../../api-endpoints/productos-fases-tareas'
import RolesAPI from '../../../api-endpoints/roles'
import '../../../styles/pages/ProductosEditar.scss'
import { confirmDialog } from 'primereact/confirmdialog'
import FasesTareasProducto from '../fasesTareas/FasesTareasProducto'

/* ========================================================================
 * Tipos auxiliares
 * ===================================================================== */

interface Producto {
  id?: number | string
  nombre?: string
  descripcion?: string
  precio?: number
  categoria?: string
  stock?: number
  activo?: string // 'S' | 'N'
  codigoBarras?: string
  peso?: number
  dimensiones?: string
  imagen?: string
  [k: string]: any
}

type Modo = 'ver' | 'editar'

interface PropiedadesPanelProducto {
  // Uso como panel embebido
  mode: Modo
  record: Producto | null
  columns?: ColumnDef<any>[]
  onClose: () => void
  onSave?: (producto: Producto) => Promise<void>
  onUploadSuccess?: (idProducto: number) => void
  entityType?: string // opcional, compatibilidad
}

// Uso como página (ruta /productos/:id)
type PropsPagina = { productId?: string }

// Unión de ambas formas de uso: como página o como panel
type Props = PropsPagina | PropiedadesPanelProducto

// Descriptor de un campo “dinámico” que se renderiza en la rejilla
type CampoRenderizado = {
  key: string
  label: string
  contenido: React.ReactNode
}

/* ========================================================================
 * COMPONENTE CONTENEDOR / LÓGICO: Editar
 * - Detecta si se usa como página (productId) o como panel (props.mode)
 * - Gestiona estado local del formulario y carga inicial
 * - Controla permisos, estado, imagen y fases/tareas
 * - Llama a onSave y a la API cuando toca
 * ===================================================================== */

export default function Editar (props: Props) {
  // --- Detección de contexto: página vs panel ---
  const propsPanel = props as PropiedadesPanelProducto
  const propsPagina = props as PropsPagina
  const esPanel = (propsPanel as any).mode !== undefined

  const record = esPanel ? propsPanel.record : null
  const productIdDesdePagina = propsPagina.productId

  const modeLocal = esPanel ? propsPanel.mode : 'editar'
  const mode = modeLocal

  const onSave = esPanel ? propsPanel.onSave : undefined
  const onClose = esPanel ? propsPanel.onClose : undefined
  const onUploadSuccess = esPanel ? propsPanel.onUploadSuccess : undefined
  const columnsProp = esPanel ? (propsPanel.columns || []) : []
  const esRegistroDeProducto = true

  // --- Estado de formulario y errores ---
  const [formulario, setFormulario] = useState<Producto | Record<string, any>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})

  // --- Estado y refs de imagen (file + objectURL local) ---
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const currentObjectUrlRef = useRef<string | null>(null)

  // --- Permisos / usuario ---
  const { hasPermission: tienePermiso } = usePermisos()
  const { user } = useAuth()
  const pantalla = 'Productos'

  // Permiso específico para cambiar campo “activoSn/activo”
  const puedeEditarActivo = () => {
    if (!tienePermiso) return false
    return (
      tienePermiso(pantalla, 'ActivoSN') ||
      tienePermiso(pantalla, 'ActivoSn') ||
      tienePermiso(pantalla, 'Activo')
    )
  }

  // Carga inicial del producto (desde panel o desde página)
  useEffect(() => {
    let montado = true

    // Caso panel: recibimos el registro ya cargado
    if (esPanel && record) {
      setFormulario((record as any) || {})
      return () => { montado = false }
    }

    // Caso página: si hay productId en URL, lo cargamos de backend
    if (!esPanel && productIdDesdePagina) {
      ;(async () => {
        try {
          const data = await productosAPI.getProductoById(productIdDesdePagina)
          if (!montado) return
          setFormulario((data as any) || {})
        } catch (error) {
          console.error('Error cargando producto por id', error)
        }
      })()
    }

    return () => {
      montado = false
    }
  }, [esPanel, record, productIdDesdePagina])

  // Helper genérico para actualizar cualquier campo del formulario
  const actualizarCampoDelFormulario = (clave: string, valor: any) =>
    setFormulario((formularioActual: any) => ({ ...formularioActual, [clave]: valor }))

  // Construcción de URL de imagen según base de API (fallback local)
  const baseDeApi = process.env.REACT_APP_API_BASE_URL

  const construirUrlDeImagen = (rutaImagen?: string) => {
    if (!rutaImagen) return ''
    const ruta = String(rutaImagen)
    if (ruta.startsWith('http://') || ruta.startsWith('https://')) return ruta
    if (ruta.startsWith('/')) return `${baseDeApi}${ruta}`
    return `${baseDeApi}/${ruta}`
  }

  // URL que se muestra en la imagen (prioriza _imagenUrl con cache busting)
  const urlVistaPrevia =
    (formulario as any)?._imagenUrl ||
    ((formulario as any)?.imagen
      ? construirUrlDeImagen((formulario as any).imagen)
      : '')

  const vistaPreviaLocal = localPreviewUrl

  // --- Determinar campo que actúa como “título” del producto ---
  const claveTitulo = (() => {
    if (!columnsProp || columnsProp.length === 0) return 'nombre'

    for (const definicionColumna of columnsProp) {
      const claveColumnaNormalizada = String(definicionColumna.key).toLowerCase()
      if (
        claveColumnaNormalizada.includes('nombre') ||
        claveColumnaNormalizada.includes('name') ||
        claveColumnaNormalizada.includes('titulo') ||
        claveColumnaNormalizada.includes('title')
      ) {
        return definicionColumna.key
      }
    }
    return columnsProp[0].key || 'nombre'
  })()

  // Columnas que se mostrarán en la rejilla (excluimos imagen, acciones y título)
  const columnasDeLaCuadricula = (columnsProp || []).filter((definicionColumna) => {
    const claveNormalizada = String(definicionColumna.key).toLowerCase()
    if (claveNormalizada.includes('accion') || claveNormalizada.includes('acciones')) return false
    if (String(definicionColumna.key).toLowerCase() === 'imagen') return false
    if (definicionColumna.key === claveTitulo) return false
    return true
  })

  // --- Carga de estados y fases (para estadoId y lógica de tareas) ---
  const [estados, setEstados] = useState<any[]>([])
  const [fases, setFases] = useState<any[]>([])

  // Refs para controlar diálogos de confirmación y evitar duplicados
  const confirmPendientePromiseRef = useRef<Promise<boolean> | null>(null)
  const confirmPendienteActiveRef = useRef(false)
  const confirmEliminarImagenRef = useRef(false)

  useEffect(() => {
    let montado = true

    const cargarEstadosYFases = async () => {
      try {
        const listaEstados = await estadosAPI.findEstados()
        if (montado) setEstados(Array.isArray(listaEstados) ? listaEstados : [])
      } catch (errorEstados) {
        console.warn('No se pudieron cargar estados en EditarDatosProductos', errorEstados)
      }

      try {
        const listaFasesRemotas =
          typeof (fasesAPI as any).findFases === 'function'
            ? await (fasesAPI as any).findFases()
            : await (fasesAPI as any).find?.()
        if (montado) setFases(Array.isArray(listaFasesRemotas) ? listaFasesRemotas : [])
      } catch (errorFases) {
        console.warn('No se pudieron cargar fases', errorFases)
      }
    }

    cargarEstadosYFases()
    return () => {
      montado = false
    }
  }, [])

  // Mapa auxiliar estadoId -> nombre de estado
  const estadosMap: Record<string, string> = {}
  for (const estado of estados || []) {
    if (estado && estado.id !== undefined) {
      estadosMap[String(estado.id)] = String(
        estado.nombre || estado.name || estado.title || ''
      )
    }
  }

  // Valor que se muestra como “nombre del producto”
  const valorTitulo = String((formulario as any)?.[claveTitulo] ?? '')

  // Nombre de archivo seleccionado (si hay _imagenFile en el formulario)
  const nombreArchivoSeleccionado: string | undefined = (formulario as any)?._imagenFile
    ? ((formulario as any)._imagenFile as File).name
    : undefined

  const tieneProductoId = Boolean((formulario as any)?.id)
  const debeMostrarImagen = Boolean(mode === 'editar' || (formulario as any)?.imagen)

  // Permite limpiar la selección de imagen local y, si no hay preview, eliminar en servidor
  const limpiarSeleccionDeImagen = () => {
    if (localPreviewUrl) {
      try {
        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current)
        }
      } catch {
        // ignorar errores de revoke
      }
      currentObjectUrlRef.current = null
      setLocalPreviewUrl(null)
      setFormulario((actual: any) => {
        const copia = { ...actual }
        delete copia._imagenFile
        return copia
      })
      return
    }

    // No hay preview local: confirmamos eliminación en servidor
    eliminarImagenDelProductoConConfirmacion()
  }

  // Helpers de renderización simple
  const renderSoloLectura = (texto: string) => (
    <div className="record-panel__value record-panel__value--view">{texto}</div>
  )

  const renderError = (clave: string) =>
    errores[clave] ? (
      <div className="record-panel__error">{errores[clave]}</div>
    ) : null

  // --- Resolución de rol para saber si es supervisor ---
  const [esSupervisor, setEsSupervisor] = useState(false)

  useEffect(() => {
    let montado = true

    const resolverRolUsuario = async () => {
      try {
        const rolId =
          (user as any)?.rolId ||
          (user as any)?.roleId ||
          (() => {
            try {
              const stored = localStorage.getItem('user')
              const parsed = stored ? JSON.parse(stored) : null
              return parsed?.rolId || parsed?.roleId
            } catch {
              return null
            }
          })()

        if (!rolId) {
          if (montado) setEsSupervisor(false)
          return
        }

        const rol = await RolesAPI.getRoleById(rolId)
        const nombreRol = (rol?.nombre || rol?.name || '').toString().trim().toLowerCase()

        if (montado) setEsSupervisor(nombreRol === 'supervisor')
      } catch (errorRol) {
        console.error('No se pudo resolver rol del usuario', errorRol)
        if (montado) setEsSupervisor(false)
      }
    }

    resolverRolUsuario()
    return () => {
      montado = false
    }
  }, [user])

  // Permiso efectivo para cambiar estadoId (solo supervisores y en modo editar)
  const puedeEditarEstado = () => {
    if (mode !== 'editar') return false
    return esSupervisor
  }

  // Cuenta cuántas tareas pendientes hay en una fase concreta
  const contarPendientesFase = async (faseId: number) => {
    const paramsT = {
      filter: JSON.stringify({ where: { faseId: Number(faseId) } }),
    }
    const resultadoT = await (tareasFasesAPI as any).findTareasFases(paramsT)
    const tareasDeFase = Array.isArray(resultadoT) ? resultadoT : []
    if (!tareasDeFase.length) return 0

    const filtroProductosTareas = {
      filter: JSON.stringify({
        where: {
          productoId: Number((formulario as any)?.id),
          faseId: Number(faseId),
        },
      }),
    }

    const resultadoProductosTareas =
      await (productosFasesTareasAPI as any).findProductosFasesTareas(
        filtroProductosTareas
      )
    const registrosProductosTareas = Array.isArray(resultadoProductosTareas)
      ? resultadoProductosTareas
      : []

    // Mapa tareaFaseId -> registro productos_fases_tareas
    const mapaRegistrosPorTarea: Record<number, any> = {}
    for (const registro of registrosProductosTareas) {
      const tareaId = Number(registro.tareaFaseId)
      if (!Number.isNaN(tareaId)) mapaRegistrosPorTarea[tareaId] = registro
    }

    let pendientes = 0
    for (const tarea of tareasDeFase) {
      const registro = mapaRegistrosPorTarea[Number((tarea as any).id)]
      const claveCompletada = registro
        ? Object.keys(registro).find((k) => /complet/i.test(k)) || 'completadaSn'
        : 'completadaSn'
      if (!registro || String(registro[claveCompletada] ?? '').toUpperCase() !== 'S') {
        pendientes += 1
      }
    }
    return pendientes
  }

  // Resetea TODAS las tareas de TODAS las fases del producto (completada/validada = 'N')
  const resetearTareas = async () => {
    try {
      const listaFases = Array.isArray(fases) ? fases : []

      for (const fase of listaFases) {
        const paramsT = {
          filter: JSON.stringify({ where: { faseId: Number((fase as any).id) } }),
        }
        const tareasDeFase = await (tareasFasesAPI as any).findTareasFases(paramsT)
        const listaTareas = Array.isArray(tareasDeFase) ? tareasDeFase : []

        for (const tarea of listaTareas) {
          const filtroRegistro = {
            filter: JSON.stringify({
              where: {
                productoId: Number((formulario as any)?.id),
                faseId: Number((fase as any).id),
                tareaFaseId: Number((tarea as any).id),
              },
            }),
          }

          const existentes =
            await (productosFasesTareasAPI as any).findProductosFasesTareas(
              filtroRegistro
            )
          const registrosExistentes = Array.isArray(existentes) ? existentes : []

          const claveCompletada = registrosExistentes[0]
            ? Object.keys(registrosExistentes[0]).find((k) => /complet/i.test(k)) ||
              'completadaSn'
            : 'completadaSn'

          const claveValidada = registrosExistentes[0]
            ? Object.keys(registrosExistentes[0]).find((k) =>
                /validada|supervisor/i.test(k)
              ) || 'validadaSupervisrSN'
            : 'validadaSupervisrSN'

          if (registrosExistentes.length) {
            // Actualizamos registros existentes
            for (const registro of registrosExistentes) {
              await (productosFasesTareasAPI as any).updateProductosFasesTareasById(
                registro.id,
                { [claveCompletada]: 'N', [claveValidada]: 'N' }
              )
            }
          } else {
            // Creamos registro nuevo para esa combinación producto-fase-tarea
            const payload: any = {
              productoId: Number((formulario as any)?.id),
              faseId: Number((fase as any).id),
              tareaFaseId: Number((tarea as any).id),
              [claveCompletada]: 'N',
              [claveValidada]: 'N',
            }
            await (productosFasesTareasAPI as any).createProductosFasesTareas(payload)
          }
        }
      }
    } catch (errorReset) {
      console.error('No se pudieron resetear las tareas del producto', errorReset)
    }
  }

  // Marca todas las validaciones de supervisor como 'N' para el producto actual
  const resetearValidacionesSupervisor = async () => {
    try {
      const filtro = {
        filter: JSON.stringify({
          where: { productoId: Number((formulario as any)?.id) },
        }),
      }
      const existentes =
        await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
      const registrosExistentes = Array.isArray(existentes) ? existentes : []

      for (const registro of registrosExistentes) {
        const claveValidada = registro
          ? Object.keys(registro).find((k) => /validada|supervisor/i.test(k)) ||
            'validadaSupervisrSN'
          : 'validadaSupervisrSN'

        await (productosFasesTareasAPI as any).updateProductosFasesTareasById(
          registro.id,
          { [claveValidada]: 'N' }
        )
      }
    } catch (errorResetValid) {
      console.error(
        'No se pudieron resetear las validaciones de supervisor del producto',
        errorResetValid
      )
    }
  }

  // Fases ordenadas por id ascendente para recorrerlas en orden lógico
  const fasesOrdenadas = useMemo(() => {
    return [...(Array.isArray(fases) ? fases : [])].sort(
      (faseA, faseB) => Number(faseA.id) - Number(faseB.id)
    )
  }, [fases])

  // Diálogo de confirmación para avanzar de estado con tareas pendientes
  const confirmarAvanceConPendientes = async (pendientes: string[]) =>
    new Promise<boolean>((resolve) => {
      if (confirmPendienteActiveRef.current) return
      confirmPendienteActiveRef.current = true

      confirmDialog({
        message: `Te quedan ${pendientes.join(
          ', '
        )}. ¿Seguro que quieres avanzar de estado?`,
        header: 'Confirmar avance',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, avanzar',
        rejectLabel: 'Cancelar',
        accept: () => {
          confirmPendienteActiveRef.current = false
          resolve(true)
        },
        reject: () => {
          confirmPendienteActiveRef.current = false
          resolve(false)
        },
        closeOnEscape: true,
      })
    })

  // Renderizado de cada campo dinámico según su tipo (estado, año, S/N, activo, genérico…)
  const generarContenidoParaCampo = (claveCampo: string): React.ReactNode => {
    const valor = (formulario as any)?.[claveCampo]
    const normalizado = String(claveCampo).toLowerCase()

    // Campo de estado (estadoId / similar)
    if (normalizado.includes('estado')) {
      const etiquetaEstado =
        estadosMap[String(valor ?? '')] ||
        (formulario as any)?._estadoNombre ||
        String(valor ?? '')

      // Supervisor con permiso: combo editable
      if (puedeEditarEstado()) {
        const opcionesEstado = (estados || []).map((estado) => ({
          label: String(estado?.nombre || estado?.name || estado?.title || ''),
          value: String(estado?.id),
        }))

        return (
          <>
            <select
              value={valor ?? ''}
              onChange={async (evento) => {
                const nuevoValor = evento.target.value
                const estadoAnterior = (formulario as any)?.estadoId

                try {
                  if (nuevoValor && nuevoValor !== estadoAnterior) {
                    const idDestino = Number(nuevoValor)
                    const idPrevio = Number(estadoAnterior)

                    // Avanzar de estado
                    if (
                      !Number.isNaN(idDestino) &&
                      !Number.isNaN(idPrevio) &&
                      idDestino > idPrevio
                    ) {
                      const listaFasesTrabajo = fasesOrdenadas.length
                        ? fasesOrdenadas
                        : (estados || []).map((estado: any) => ({
                            id: estado.id,
                            nombre:
                              estado.nombre || estado.name || estado.title,
                          }))

                      const fasesIncompletas: string[] = []
                      for (const fase of listaFasesTrabajo) {
                        if (Number(fase.id) >= idDestino) continue
                        const pendientes = await contarPendientesFase(
                          Number(fase.id)
                        )
                        if (pendientes > 0) {
                          fasesIncompletas.push(
                            `${pendientes} pendientes en ${
                              fase.nombre || fase.id
                            }`
                          )
                        }
                      }

                      if (fasesIncompletas.length) {
                        if (!confirmPendientePromiseRef.current) {
                          confirmPendientePromiseRef.current =
                            confirmarAvanceConPendientes(fasesIncompletas)
                        }
                        const ok = await confirmPendientePromiseRef.current
                        confirmPendientePromiseRef.current = null
                        if (!ok) return
                      }
                    }

                    // Retroceder de estado
                    if (
                      !Number.isNaN(idDestino) &&
                      !Number.isNaN(idPrevio) &&
                      idDestino <= idPrevio
                    ) {
                      const nombreEstadoActual =
                        estadosMap[String(estadoAnterior ?? '')] ||
                        String(estadoAnterior ?? '')

                      const nombreEstadoNuevo =
                        estadosMap[String(nuevoValor ?? '')] ||
                        String(nuevoValor ?? '')

                      confirmDialog({
                        message:
                          `Vas a retroceder del estado "${nombreEstadoActual}" al estado "${nombreEstadoNuevo}".\n\n` +
                          'Se reiniciarán las tareas y validaciones asociadas y los usuarios deberán volver a completar las tareas y enviar de nuevo los correos de validación.\n\n' +
                          '¿Deseas continuar?',
                        header: 'Confirmar retroceso de estado',
                        icon: 'pi pi-exclamation-triangle',
                        acceptLabel: 'Sí, retroceder',
                        rejectLabel: 'Cancelar',
                        acceptClassName: 'p-button-danger',
                        rejectClassName: 'p-button-secondary',
                        closeOnEscape: true,
                        accept: async () => {
                          try {
                            await resetearTareas()
                            await resetearValidacionesSupervisor()
                          } catch (errorReset) {
                            console.error(
                              'Error reseteando tareas / validaciones al retroceder estado',
                              errorReset
                            )
                          }
                          actualizarCampoDelFormulario('estadoId', nuevoValor)
                        },
                      })

                      // No actualizamos aquí; solo en el accept del diálogo
                      return
                    }
                  }
                } catch (errorCambioEstado) {
                  console.error(
                    'Error validando el cambio de estado del producto',
                    errorCambioEstado
                  )
                }

                // Caso normal (sin retroceso especial): actualizamos directamente
                actualizarCampoDelFormulario('estadoId', nuevoValor)
              }}
              className={`record-panel__input ${
                errores[claveCampo] ? 'record-panel__input--error' : ''
              }`}
            >
              <option value="">Selecciona estado</option>
              {opcionesEstado.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
            {renderError(claveCampo)}
          </>
        )
      }

      // Usuario sin permiso -> solo lectura
      return (
        <>
          {renderSoloLectura(etiquetaEstado)}
          {renderError(claveCampo)}
        </>
      )
    }

    // Campo año / anyo / año (numérico, gestionado con Calendar en vista year)
    const esCampoAnyo =
      normalizado.includes('anyo') || normalizado.includes('año')

    if (esCampoAnyo) {
      if (mode === 'ver') {
        return (
          <>
            {renderSoloLectura(String(valor ?? ''))}
            {renderError(claveCampo)}
          </>
        )
      }

      const fechaSeleccionada = valor ? new Date(Number(valor), 0, 1) : null
      return (
        <>
          <Calendar
            value={fechaSeleccionada}
            onChange={(evento: any) =>
              actualizarCampoDelFormulario(
                claveCampo,
                evento.value ? (evento.value as Date).getFullYear() : ''
              )
            }
            view="year"
            dateFormat="yy"
            showIcon
            className={`record-panel__input ${
              errores[claveCampo] ? 'record-panel__input--error' : ''
            }`}
            maxDate={new Date(new Date().getFullYear(), 11, 31)}
            minDate={new Date(1900, 0, 1)}
            inputClassName="productos-editar-calendar"
          />
          {renderError(claveCampo)}
        </>
      )
    }

    // Campos tipo S/N (esBiodegradable, eléctrico, *_Sn, *_SN, etc.)
    const esCampoSn =
      normalizado.includes('esbiodegrad') ||
      normalizado.includes('esbiodegradable') ||
      normalizado.endsWith('sns') ||
      normalizado.endsWith('sn') ||
      normalizado.includes('electrico')

    if (esCampoSn) {
      if (mode === 'ver') {
        return (
          <>
            {renderSoloLectura(
              String(valor ?? '').toUpperCase() === 'S' ? 'Sí' : 'No'
            )}
            {renderError(claveCampo)}
          </>
        )
      }

      const valorNormalizado = String(valor ?? 'N')
      return (
        <>
          <select
            value={valorNormalizado}
            onChange={(evento) =>
              actualizarCampoDelFormulario(
                claveCampo,
                evento.target.value as 'S' | 'N'
              )
            }
            className={`record-panel__input ${
              errores[claveCampo] ? 'record-panel__input--error' : ''
            }`}
          >
            <option value="S">Sí</option>
            <option value="N">No</option>
          </select>
          {renderError(claveCampo)}
        </>
      )
    }

    // Campo de estado activo/inactivo
    if (normalizado.includes('activo')) {
      const estaActivo = String(valor ?? '').toUpperCase() === 'S'

      if (mode === 'ver') {
        return (
          <>
            <div className="productos-editar-switch-row">
              <InputSwitch checked={estaActivo} disabled />
              <span className="productos-editar-switch-text">
                {estaActivo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {renderError(claveCampo)}
          </>
        )
      }

      return (
        <>
          <div className="productos-editar-switch-row">
            <InputSwitch
              checked={estaActivo}
              onChange={(evento: any) =>
                actualizarCampoDelFormulario(
                  claveCampo,
                  evento.value ? 'S' : 'N'
                )
              }
              disabled={!(puedeEditarActivo && puedeEditarActivo())}
            />
            <span className="productos-editar-switch-text">
              {estaActivo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          {renderError(claveCampo)}
        </>
      )
    }

    // Campo genérico en modo ver: solo lectura
    if (mode === 'ver') {
      return (
        <>
          {renderSoloLectura(String(valor ?? ''))}
          {renderError(claveCampo)}
        </>
      )
    }

    // Campo genérico en modo editar: input de texto
    return (
      <>
        <input
          value={valor ?? ''}
          onChange={(evento: React.ChangeEvent<HTMLInputElement>) =>
            actualizarCampoDelFormulario(claveCampo, evento.target.value)
          }
          className={`record-panel__input ${
            errores[claveCampo] ? 'record-panel__input--error' : ''
          }`}
        />
        {renderError(claveCampo)}
      </>
    )
  }

  // Transformamos columnas en estructura de campos dinámicos para la vista de presentación
  const camposDinamicos: CampoRenderizado[] = (columnasDeLaCuadricula || []).map(
    (columna) => ({
      key: columna.key,
      label:
        (columna as any).title ||
        (columna as any).label ||
        (columna as any).header ||
        columna.key,
      contenido: generarContenidoParaCampo(columna.key),
    })
  )

  // Campo “Descripción” por defecto si no viene en columnas
  const descripcionCampo =
    !(columnasDeLaCuadricula || []).some((columna) => columna.key === 'descripcion') ? (
      <div className="record-panel__field">
        <label className="record-panel__label">Descripción</label>
        {mode === 'ver' ? (
          renderSoloLectura(String((formulario as any)?.descripcion ?? ''))
        ) : (
          <>
            <input
              value={(formulario as any)?.descripcion ?? ''}
              onChange={(evento) =>
                actualizarCampoDelFormulario('descripcion', evento.target.value)
              }
              className="record-panel__input"
            />
            {renderError('descripcion')}
          </>
        )}
      </div>
    ) : null

  // Panel de fases/tareas integrado dentro de la ficha de producto
  const panelFases =
    esRegistroDeProducto && (formulario as any)?.id ? (
      <FasesTareasProducto
        productId={(formulario as any).id}
        productName={(formulario as any)?.nombre}
        selectedEstadoId={(formulario as any)?.estadoId}
        readOnly={mode === 'ver'}
        onEstadoChange={(nuevoNombre: string, nuevoId?: string | number) => {
          actualizarCampoDelFormulario('_estadoNombre', nuevoNombre)
          if (nuevoId !== undefined && nuevoId !== null) {
            actualizarCampoDelFormulario('estadoId', nuevoId)
          }
        }}
      />
    ) : null

  // Manejo de selección de fichero (imagen) en input file
  const alSeleccionarArchivo = (archivo?: File) => {
    if (!archivo) return

    try {
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current)
        currentObjectUrlRef.current = null
      }
    } catch {
      // ignorar errores de revoke
    }

    const urlObjetoLocal = URL.createObjectURL(archivo)
    currentObjectUrlRef.current = urlObjetoLocal
    setLocalPreviewUrl(urlObjetoLocal)
    actualizarCampoDelFormulario('_imagenFile', archivo)
  }

  // Props agrupadas para la vista de imagen del producto
  const imagenProps = {
    mostrar: debeMostrarImagen,
    vistaPreviaLocal: vistaPreviaLocal,
    urlActual: urlVistaPrevia,
    subiendo: subiendoImagen,
    nombreArchivo: nombreArchivoSeleccionado,
    tieneId: tieneProductoId,
    fileInputRef,
    onSeleccionarArchivo: alSeleccionarArchivo,
    onSubirImagen: () => subirImagenDelProducto(),
    onEliminarImagen: limpiarSeleccionDeImagen,
    onImagenError: () => actualizarCampoDelFormulario('imagen', ''),
  }

  // Limpieza de objectURL al desmontar
  useEffect(() => {
    return () => {
      try {
        if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current)
      } catch {
        // ignore
      }
    }
  }, [])

  /* ======================================================================
   * Subida de imagen al backend (delegada a ProductosAPI)
   * ==================================================================== */

  const subirImagenDelProducto = async (
    archivoArg?: File,
    productoIdArg?: number | string
  ) => {
    const archivo: File | undefined = archivoArg || (formulario as any)?._imagenFile
    let productoId = productoIdArg || (formulario as any)?.id

    if (!archivo) {
      alert('Selecciona un archivo antes de subir')
      return
    }
    if (!productoId) {
      alert('Guarda el producto primero para subir la imagen')
      return
    }

    try {
      setSubiendoImagen(true)

      const nombreOriginal = archivo.name || 'img'
      const coincidenciaExtension = nombreOriginal.match(/(\.[0-9a-zA-Z]+)$/)
      const extension = coincidenciaExtension ? coincidenciaExtension[1] : '.jpg'
      const nombreDeArchivoDeseado = `${productoId}${extension}`

      let respuestaSubida = null

      try {
        if (
          productosAPI &&
          typeof (productosAPI as any).uploadProductoImagen === 'function'
        ) {
          respuestaSubida = await (productosAPI as any).uploadProductoImagen(
            productoId,
            archivo,
            nombreDeArchivoDeseado
          )
        } else {
          throw new Error(
            'Método uploadProductoImagen no disponible en ProductosAPI'
          )
        }
      } catch (errorSubida) {
        throw errorSubida
      }

      if (respuestaSubida && respuestaSubida.path) {
        // Guardamos ruta y, si viene, url con cache busting (_imagenUrl)
        actualizarCampoDelFormulario('imagen', respuestaSubida.path)

        if (respuestaSubida.url) {
          const urlCruda = String(respuestaSubida.url)
          const separador = urlCruda.includes('?') ? '&' : '?'
          const urlConCacheBusting = `${urlCruda}${separador}cb=${Date.now()}`
          actualizarCampoDelFormulario('_imagenUrl', urlConCacheBusting)
        }

        // Limpiamos el _imagenFile interno
        setFormulario((estadoActual: any) => {
          const copia = { ...estadoActual }
          delete copia._imagenFile
          return copia
        })

        // Limpiamos objectURL local
        try {
          if (currentObjectUrlRef.current) {
            URL.revokeObjectURL(currentObjectUrlRef.current)
          }
        } catch {
          // ignore
        }
        currentObjectUrlRef.current = null
        setLocalPreviewUrl(null)

        // Callback opcional tras subida correcta
        try {
          if (onUploadSuccess) {
            const idNum = Number(productoId)
            if (!Number.isNaN(idNum)) onUploadSuccess(idNum)
          }
        } catch {
          // ignore
        }
      } else {
        throw new Error('Respuesta del servidor sin path/url para la imagen')
      }
    } catch (error: any) {
      console.error('Error subiendo imagen de producto', error)
      alert('Error subiendo la imagen: ' + (error?.message || error))
    } finally {
      setSubiendoImagen(false)
    }
  }

  /* ======================================================================
   * Eliminación de imagen (con confirmación y llamada a la API)
   * ==================================================================== */

  const eliminarImagenDelProductoConConfirmacion = () => {
    if (confirmEliminarImagenRef.current) return
    confirmEliminarImagenRef.current = true

    confirmDialog({
      message:
        '¿Estás seguro de que quieres eliminar esta imagen? Esta acción no se puede deshacer.',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          if ((formulario as any)?.id && (formulario as any).imagen) {
            if (
              productosAPI &&
              typeof productosAPI.updateProductoById === 'function'
            ) {
              await productosAPI.updateProductoById((formulario as any).id, {
                imagen: null,
              })
            }
          }
          actualizarCampoDelFormulario('imagen', '')
          console.log('Imagen eliminada correctamente')
        } catch (error) {
          console.error('Error al eliminar la imagen:', error)
          alert('Error al eliminar la imagen. Inténtalo de nuevo.')
        } finally {
          confirmEliminarImagenRef.current = false
        }
      },
      reject: () => {
        confirmEliminarImagenRef.current = false
      },
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      rejectClassName: 'p-button-secondary',
    })
  }

  /* ======================================================================
   * Subida automática de imagen después de guardar el producto
   * ==================================================================== */

  const intentarSubirImagenDespuesDeGuardar = async (archivo?: File) => {
    const archivoPendiente: File | undefined =
      archivo || (formulario as any)?._imagenFile
    if (!archivoPendiente) return

    let productoId = (formulario as any)?.id
    const maxRetries = 10
    let intentoActual = 0

    // Esperamos a que el backend devuelva id (por si se guarda y se rellena después)
    while (
      (!productoId || Number.isNaN(Number(productoId))) &&
      intentoActual < maxRetries
    ) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 100))
      productoId = (formulario as any)?.id
      intentoActual += 1
    }

    if (!productoId) {
      alert(
        'Producto guardado pero no se ha podido subir la imagen automáticamente porque el registro no tiene id. Abre el registro y sube la imagen manualmente.'
      )
      return
    }

    try {
      await subirImagenDelProducto(archivoPendiente, productoId)
    } catch {
      // La función de subida ya muestra errores, no repetimos alerta
    }
  }

  /* ======================================================================
   * Guardado del producto con validaciones de negocio básicas
   * ==================================================================== */

  const guardarProductoConValidaciones = async () => {
    setErrores({})
    const nuevosErrores: Record<string, string> = {}

    const nombre = String((formulario as any).nombre || '').trim()
    if (!nombre) nuevosErrores.nombre = 'El nombre del producto es obligatorio'

    // Validación de año (campo anyo / año) si existe
    const valorAnyo = (formulario as any).anyo ?? (formulario as any)['año']
    const anyoStr =
      valorAnyo !== undefined && valorAnyo !== null
        ? String(valorAnyo).trim()
        : ''
    const currentYearLocal = new Date().getFullYear()

    if (!anyoStr) {
      nuevosErrores.anyo = 'El año es obligatorio'
    } else if (Number.isNaN(Number(anyoStr))) {
      nuevosErrores.anyo = 'El año debe ser un número'
    } else if (
      Number(anyoStr) < 1900 ||
      Number(anyoStr) > currentYearLocal
    ) {
      nuevosErrores.anyo = `El año debe estar entre 1900 y ${currentYearLocal}`
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    const archivoPendiente: File | undefined = (formulario as any)?._imagenFile

    // Clon del formulario para enviar al backend
    const payload: any = { ...(formulario as any) }
    delete payload._imagenFile
    delete payload._imagenPreview
    delete payload._imagenUrl
    if (payload._estadoNombre !== undefined) delete payload._estadoNombre
    if (payload._cb !== undefined) delete payload._cb

    const valorAnyoOriginal =
      (formulario as any).anyo ?? (formulario as any)['año']
    if (
      valorAnyoOriginal !== undefined &&
      valorAnyoOriginal !== null &&
      String(valorAnyoOriginal).trim() !== ''
    ) {
      const parsedYear = Number(String(valorAnyoOriginal).trim())
      if (!Number.isNaN(parsedYear)) payload.anyo = parsedYear
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'año')) {
      delete payload['año']
    }

    if (payload.nombre) payload.nombre = String(payload.nombre).trim()

    if (
      payload.estadoId !== undefined &&
      payload.estadoId !== null &&
      payload.estadoId !== ''
    ) {
      const parsedEstado = Number(payload.estadoId)
      if (!Number.isNaN(parsedEstado)) payload.estadoId = parsedEstado
    }

    // De momento solo manejamos guardado vía onSave (panel)
    let resultadoGuardado: any = null
    if (onSave) {
      resultadoGuardado = await onSave(payload as Producto)
    }

    // Subida de imagen tras guardado
    try {
      const idNuevo =
        (resultadoGuardado &&
          (resultadoGuardado.id || resultadoGuardado?.data?.id)) ||
        (formulario as any)?.id

      if (archivoPendiente && idNuevo) {
        await subirImagenDelProducto(archivoPendiente, idNuevo)
      } else {
        await intentarSubirImagenDespuesDeGuardar(archivoPendiente)
      }
    } catch {
      // silencioso, la subida de imagen ya notifica errores
    }
  }

  // Si estamos en modo panel y no hay registro, no renderizamos nada
  if (esPanel && !record) return null

  // Render de la vista pura, pasando todo el estado/controladores necesarios
  return (
    <>
      <EditarDatosProductos
        modo={mode}
        esPanel={esPanel}
        cargando={false}
        valorNombre={valorTitulo}
        errores={errores}
        puedeEditarNombre={mode === 'editar'}
        imagen={imagenProps}
        camposDinamicos={camposDinamicos}
        descripcionCampo={descripcionCampo || undefined}
        panelFases={panelFases || undefined}
        onNombreChange={(valor) =>
          actualizarCampoDelFormulario(claveTitulo || 'nombre', valor)
        }
        onGuardarClick={guardarProductoConValidaciones}
        onCerrarClick={onClose}
      />
    </>
  )
}
