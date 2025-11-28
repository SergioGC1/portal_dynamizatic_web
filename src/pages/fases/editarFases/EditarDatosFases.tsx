import React, { useCallback, useEffect, useRef, useState } from 'react'
import { confirmDialog } from 'primereact/confirmdialog'
import { Toast } from 'primereact/toast'
import EditarDatosFasesVista from './DatosFases'
import usePermisos from '../../../hooks/usePermisos'
import { useAuth } from '../../../contexts/AuthContext'
import RolesAPI from '../../../api-endpoints/roles/index'
import FasesAPI from '../../../api-endpoints/fases/index'
import TareasFasesAPI from '../../../api-endpoints/tareas-fases/index'

/**
 * Representa una fase (registro de la tabla Fases).
 */
interface Fase {
  id?: number
  nombre?: string
  codigo?: string
  descripcion?: string
  activo?: string
  activoSn?: string
  orden?: number
  [clave: string]: any
}

/**
 * Representa una tarea asociada a una fase.
 */
interface TareaFase {
  id?: number
  faseId: number
  nombre: string
}

/**
 * Props cuando este componente se usa como panel embebido
 * dentro de un DataTable (modo Drawer/Panel).
 */
interface PropiedadesPanelFase {
  mode?: 'ver' | 'editar'
  record?: Fase | null
  columns?: Array<{ key: string; title?: string; label?: string }>
  onClose?: () => void
  onSave?: (fase: Fase) => Promise<void>
}

/**
 * Props cuando se usa como página independiente (/fases/:id).
 */
type PropsPagina = { faseId?: string }

/**
 * Unión de ambas formas de uso: página o panel.
 */
type Props = PropsPagina | PropiedadesPanelFase

/**
 * Contenedor lógico para edición/visualización de una Fase.
 * - Gestiona la carga de la fase (por id o desde record).
 * - Gestiona las tareas asociadas a esa fase.
 * - Aplica control de permisos según el rol del usuario.
 */
export default function Editar(props: Props) {
  // --------------------------------------------------
  // Detección de contexto: página vs panel
  // --------------------------------------------------
  const esPanel =
    'record' in props ||
    'mode' in props ||
    'onClose' in props ||
    'columns' in props

  const propsPanel = esPanel ? (props as PropiedadesPanelFase) : null
  const faseIdPagina = !esPanel ? (props as PropsPagina).faseId : undefined

  // Modo de funcionamiento (ver/editar) y callbacks del panel
  const mode = esPanel ? propsPanel?.mode ?? 'ver' : 'editar'
  const registroPanel = propsPanel?.record ?? null
  const onClose = propsPanel?.onClose
  const onSave = propsPanel?.onSave

  // --------------------------------------------------
  // Estado principal de la fase y tareas
  // --------------------------------------------------
  const [formulario, setFormulario] = useState<Fase | Record<string, any>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [tareas, setTareas] = useState<TareaFase[]>([])

  // Estado del diálogo de creación/edición de tareas
  const [dialogoVisible, setDialogoVisible] = useState(false)
  const [modoDialogo, setModoDialogo] = useState<'nuevo' | 'editar' | null>(null)
  const [tareaEnEdicion, setTareaEnEdicion] = useState<TareaFase | null>(null)
  const [nombreTarea, setNombreTarea] = useState('')
  const [guardandoTarea, setGuardandoTarea] = useState(false)

  // Toast para mensajes de permisos / errores leves
  const toastRef = useRef<Toast | null>(null)

  // Permisos y rol actual
  const { hasPermission } = usePermisos()
  const { user: authUser } = useAuth()
  const [rolActivo, setRolActivo] = useState<boolean | null>(null)

  // --------------------------------------------------
  // Carga de tareas asociadas a una fase concreta
  // --------------------------------------------------
  const cargarTareasAsociadasALaFase = useCallback(async (faseId: number) => {
    try {
      const params = {
        filter: JSON.stringify({ where: { faseId: Number(faseId) } })
      }
      const lista = await TareasFasesAPI.findTareasFases(params)
      setTareas(Array.isArray(lista) ? lista : [])
    } catch (error) {
      console.error('Error cargando tareas de la fase:', error)
      setTareas([])
    }
  }, [])

  // --------------------------------------------------
  // Inicialización del formulario (fase) según contexto
  // --------------------------------------------------
  useEffect(() => {
    let activo = true

    const inicializarFormulario = async () => {
      // 1) Uso como panel: el registro viene en props.record
      if (esPanel) {
        if (registroPanel) {
          setFormulario((registroPanel as any) || {})
          if ((registroPanel as any)?.id) {
            await cargarTareasAsociadasALaFase((registroPanel as any).id)
          } else {
            setTareas([])
          }
        } else {
          setFormulario({})
          setTareas([])
        }
        return
      }

      // 2) Uso como página: se carga por faseId
      if (faseIdPagina) {
        try {
          const data = await FasesAPI.getFaseById(faseIdPagina)
          if (!activo) return
          setFormulario((data as any) || {})
          if ((data as any)?.id) {
            await cargarTareasAsociadasALaFase((data as any).id)
          } else {
            setTareas([])
          }
        } catch (error) {
          console.error('Error cargando la fase por id:', error)
          if (activo) {
            setFormulario({})
            setTareas([])
          }
        }
      } else {
        // 3) Crear nueva fase
        setFormulario({})
        setTareas([])
      }
    }

    inicializarFormulario()

    return () => {
      activo = false
    }
  }, [esPanel, registroPanel, faseIdPagina, cargarTareasAsociadasALaFase])

  // --------------------------------------------------
  // Comprobación de si el rol actual está activo
  // --------------------------------------------------
  useEffect(() => {
    let montado = true

    const comprobarRolActivo = async () => {
      try {
        let rolId: any = undefined

        // 1) Intentar obtener rol desde el usuario autenticado (contexto)
        if (authUser && (authUser as any).rolId) {
          rolId = (authUser as any).rolId
        } else {
          // 2) Fallback: intentar leer del localStorage
          try {
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
              const parsed = JSON.parse(storedUser)
              rolId =
                parsed?.rolId ||
                parsed?.rol ||
                (Array.isArray(parsed?.roles) ? parsed.roles[0] : undefined)
            }
          } catch (error) {
            // ignore parse errors
          }
        }

        // Si no se puede determinar el rol, asumimos "activo" por no bloquear
        if (!rolId) {
          if (montado) setRolActivo(true)
          return
        }

        // Consultar el rol en backend
        const rol = await RolesAPI.getRoleById(rolId)
        const activo = rol?.activoSn ?? rol?.activoSN ?? rol?.activo ?? 'S'
        if (montado) setRolActivo(String(activo).toUpperCase() === 'S')
      } catch (error) {
        console.warn(
          'No se pudo comprobar el estado del rol, asumiendo activo',
          error
        )
        if (montado) setRolActivo(true)
      }
    }

    comprobarRolActivo()

    return () => {
      montado = false
    }
  }, [authUser])

  // --------------------------------------------------
  // Helpers de UI: avisos de permisos
  // --------------------------------------------------
  const mostrarAvisoDePermisos = (mensaje: string) => {
    if (toastRef.current) {
      toastRef.current.show({
        severity: 'warn',
        summary: 'Permisos',
        detail: mensaje,
        life: 3000
      })
    } else {
      // Fallback por si falla el Toast
      alert(mensaje)
    }
  }

  // --------------------------------------------------
  // Actualización de campos del formulario (fase)
  // --------------------------------------------------
  const actualizarCampoDelFormulario = (clave: string, valor: any) => {
    setFormulario((estadoActual: any) => ({
      ...estadoActual,
      [clave]: valor
    }))
  }

  // --------------------------------------------------
  // Guardado de fase con validaciones básicas
  // --------------------------------------------------
  const guardarFaseConValidaciones = async () => {
    setErrores({})

    // Validar nombre
    const nombre = String((formulario as any).nombre || '').trim()
    if (!nombre || nombre.length < 2) {
      setErrores({
        nombre: 'El nombre de la fase debe tener al menos 2 caracteres'
      })
      return
    }

    // Validar código
    const codigo = String((formulario as any).codigo || '').trim()
    if (!codigo) {
      setErrores({ codigo: 'El código es obligatorio' })
      return
    }
    if (codigo.length < 2) {
      setErrores({
        codigo: 'El código debe tener al menos 2 caracteres'
      })
      return
    }

    // Validar orden
    const orden = Number((formulario as any).orden || 0)
    if (orden < 0) {
      setErrores({ orden: 'El orden no puede ser negativo' })
      return
    }

    // Limpiar payload de campos internos
    const datosLimpios: any = { ...(formulario as any) }
    if (datosLimpios._cb !== undefined) delete datosLimpios._cb

    if (onSave) {
      try {
        await onSave(datosLimpios as Fase)
      } catch (err: any) {
        const msg = String(err?.message || '')
        const nuevos: Record<string, string> = {}
        if (msg === 'DUPLICADO_FASE') {
          // Permitimos que onSave lance un objeto con info de duplicados parcial
          const duplicados = (err as any)?.duplicates || {}
          if (duplicados.nombre) nuevos.nombre = 'Este nombre de fase ya está en uso'
          if (duplicados.codigo) nuevos.codigo = 'Este código de fase ya está en uso'
          // Si no viene detalle, marcamos ambos como precaución
          if (!duplicados.nombre && !duplicados.codigo) {
            nuevos.nombre = 'Este nombre de fase ya está en uso'
            nuevos.codigo = 'Este código de fase ya está en uso'
          }
          setErrores(nuevos)
          return
        }
        throw err
      }
    }
  }

  // --------------------------------------------------
  // Gestión del diálogo de tareas (nuevo / editar)
  // --------------------------------------------------
  const abrirDialogoParaNuevaTarea = () => {
    if (!hasPermission('TareasFase', 'Nuevo')) {
      mostrarAvisoDePermisos('No tienes permiso para crear tareas')
      return
    }

    setNombreTarea('')
    setTareaEnEdicion(null)
    setModoDialogo('nuevo')
    setDialogoVisible(true)
  }

  const abrirDialogoParaEditarTarea = (tarea: TareaFase) => {
    if (!hasPermission('TareasFase', 'Actualizar')) {
      mostrarAvisoDePermisos('No tienes permiso para editar tareas')
      return
    }

    setNombreTarea(tarea.nombre)
    setTareaEnEdicion(tarea)
    setModoDialogo('editar')
    setDialogoVisible(true)
  }

  const cerrarDialogoDeTarea = () => {
    setDialogoVisible(false)
    setModoDialogo(null)
    setTareaEnEdicion(null)
    setNombreTarea('')
  }

  // --------------------------------------------------
  // Guardar tarea (crear/actualizar) en backend
  // --------------------------------------------------
  const guardarTareaEnElServidor = async () => {
    if (!nombreTarea.trim() || !(formulario as any)?.id) return

    setGuardandoTarea(true)
    try {
      const payload = {
        faseId: Number((formulario as any).id),
        nombre: nombreTarea.trim()
      }

      if (modoDialogo === 'nuevo') {
        await TareasFasesAPI.createTareasFase(payload)
      } else if (modoDialogo === 'editar' && tareaEnEdicion?.id) {
        await TareasFasesAPI.updateTareasFaseById(tareaEnEdicion.id, payload)
      }

      if ((formulario as any)?.id) {
        await cargarTareasAsociadasALaFase(Number((formulario as any).id))
      }
      cerrarDialogoDeTarea()
    } catch (error) {
      console.error('Error guardando tarea:', error)
    } finally {
      setGuardandoTarea(false)
    }
  }

  // --------------------------------------------------
  // Eliminar tarea con confirmación de usuario
  // --------------------------------------------------
  const eliminarTareaConConfirmacion = (tarea: TareaFase) => {
    if (!hasPermission('TareasFase', 'Borrar')) {
      mostrarAvisoDePermisos('No tienes permiso para eliminar tareas')
      return
    }

    confirmDialog({
      message: `¿Estás seguro de que deseas eliminar la tarea "${tarea.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      rejectClassName: 'p-button-secondary',
      accept: async () => {
        try {
          if (tarea.id) {
            await TareasFasesAPI.deleteTareasFaseById(tarea.id)
            if ((formulario as any)?.id) {
              await cargarTareasAsociadasALaFase(Number((formulario as any).id))
            }
          }
        } catch (error) {
          console.error('Error eliminando tarea:', error)
        }
      }
    })
  }

  // --------------------------------------------------
  // Flags derivados para la vista (permisos y estado)
  // --------------------------------------------------
  const hayFaseSeleccionada = Boolean((formulario as any)?.id)
  const puedeVerTareas = hasPermission('TareasFase', 'Ver') && rolActivo !== false
  const puedeCrearTareas =
    mode === 'editar' && hasPermission('TareasFase', 'Nuevo')
  const puedeEditarTareas =
    mode === 'editar' && hasPermission('TareasFase', 'Actualizar')
  const puedeEliminarTareas =
    mode === 'editar' && hasPermission('TareasFase', 'Borrar')

  // Si es un panel pero no hay registro, no mostramos nada
  if (esPanel && !registroPanel) return null

  // --------------------------------------------------
  // Render: delegamos toda la parte visual a EditarDatosFasesVista
  // --------------------------------------------------
  return (
    <EditarDatosFasesVista
      modo={mode}
      formulario={formulario}
      errores={errores}
      onCampoChange={actualizarCampoDelFormulario}
      onGuardarClick={guardarFaseConValidaciones}
      onCerrarClick={onClose}
      puedeVerTareas={puedeVerTareas}
      puedeCrearTareas={puedeCrearTareas}
      puedeEditarTareas={puedeEditarTareas}
      puedeEliminarTareas={puedeEliminarTareas}
      hayFaseSeleccionada={hayFaseSeleccionada}
      tareas={tareas}
      onNuevaTareaClick={abrirDialogoParaNuevaTarea}
      onEditarTareaClick={abrirDialogoParaEditarTarea}
      onEliminarTareaClick={eliminarTareaConConfirmacion}
      dialogoVisible={dialogoVisible}
      modoDialogo={modoDialogo}
      nombreTarea={nombreTarea}
      onNombreTareaChange={setNombreTarea}
      onDialogoGuardar={guardarTareaEnElServidor}
      onDialogoCerrar={cerrarDialogoDeTarea}
      guardandoTarea={guardandoTarea}
      toastRef={toastRef}
    />
  )
}
