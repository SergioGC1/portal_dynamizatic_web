import React, { useEffect, useState } from 'react'
import { ColumnDef } from '../../../components/data-table/DataTable'
import { confirmDialog } from 'primereact/confirmdialog'
import EditarDatosRolesVista from './DatosRoles'
import UsuariosAPI from '../../../api-endpoints/usuarios/index'
import RolesAPI from '../../../api-endpoints/roles/index'

// Modelo básico de rol usado en el formulario
interface Rol {
  id?: number | string
  nombre?: string
  activoSn?: string        // 'S' / 'N' (estado clásico en BD)
  activo?: string          // posible variante del backend
  [clave: string]: any
}

// Props cuando se usa como panel lateral embebido en una tabla
interface PropiedadesPanelRol {
  mode?: 'ver' | 'editar'
  record?: Rol | null
  columns?: ColumnDef<any>[] // se pasa desde la tabla, pero aquí no se usa
  onClose?: () => void
  onSave?: (rolActualizado: Rol) => Promise<any>
}

// Props cuando se usa como página (ej: /roles/:id)
type PropsPagina = { rolId?: string }

// Unión de ambas formas de uso: como página o como panel
type Props = PropsPagina | PropiedadesPanelRol

export default function Editar (props: Props) {
  // Detectamos si se está usando como panel (embebido) o como página completa
  const esPanel =
    'mode' in props ||
    'record' in props ||
    'onClose' in props ||
    'columns' in props

  const propsPanel = esPanel ? (props as PropiedadesPanelRol) : null
  const rolIdPagina = !esPanel ? (props as PropsPagina).rolId : undefined

  // Modo de funcionamiento: ver / editar
  const modo = esPanel ? propsPanel?.mode ?? 'ver' : 'editar'
  const registroPanel = propsPanel?.record ?? null
  const onClose = propsPanel?.onClose
  const onSave = propsPanel?.onSave

  // Estado del formulario de rol
  const [formulario, setFormulario] = useState<Rol>({
    nombre: '',
    activoSn: 'N'
  })

  // Errores de validación o backend
  const [errores, setErrores] = useState<Record<string, string>>({})

  // Flag de carga (carga inicial / guardado)
  const [cargando, setCargando] = useState(false)

  // Normaliza la forma en que llega el rol desde distintas APIs
  const normalizarRegistro = (data: any): Rol => {
    const nombre = data?.nombre ?? data?.name ?? ''
    const activo = data?.activoSn ?? data?.activoSN ?? data?.activo ?? 'N'

    return {
      ...(data || {}),
      nombre,
      // Aseguramos activoSn limpio: solo 'S' o 'N'
      activoSn: String(activo || 'N').toUpperCase() === 'S' ? 'S' : 'N'
    }
  }

  // Carga inicial del rol:
  // - Si viene como panel, usa el record recibido
  // - Si es página, hace GET por id
  useEffect(() => {
    let componenteActivo = true

    const cargarDatos = async () => {
      // Caso panel: usamos el registro que viene desde la tabla
      if (esPanel) {
        if (registroPanel) {
          setFormulario(normalizarRegistro(registroPanel))
        } else {
          setFormulario({ nombre: '', activoSn: 'N' })
        }
        return
      }

      // Caso página nueva sin id => formulario vacío
      if (!rolIdPagina) {
        setFormulario({ nombre: '', activoSn: 'N' })
        return
      }

      // Caso página con id => cargar desde backend
      try {
        setCargando(true)
        const datos = await RolesAPI.getRoleById(rolIdPagina)
        if (componenteActivo) {
          setFormulario(normalizarRegistro(datos))
        }
      } catch (error) {
        console.error('Error cargando el rol:', error)
        if (componenteActivo) {
          setErrores({
            general: 'Error al cargar los datos del rol.'
          })
        }
      } finally {
        if (componenteActivo) setCargando(false)
      }
    }

    cargarDatos()

    return () => {
      componenteActivo = false
    }
  }, [esPanel, registroPanel, rolIdPagina])

  // Actualiza un campo del formulario y limpia el error de ese campo
  const actualizarCampoDelFormulario = (clave: string, valor: any) => {
    setFormulario((estadoActual) => ({ ...estadoActual, [clave]: valor }))
    if (errores[clave]) {
      setErrores((estadoAnterior) => {
        const copia = { ...estadoAnterior }
        delete copia[clave]
        return copia
      })
    }
  }

  // Maneja el cambio del switch de activo/inactivo
  const manejarCambioDeEstado = async (evento: any) => {
    const nuevoValor = evento.value ? 'S' : 'N'
    const esDesactivacion = nuevoValor === 'N' && formulario?.id

    // Si se intenta desactivar un rol ya creado, comprobamos
    // si hay usuarios que lo usan para avisar con un confirmDialog
    if (esDesactivacion) {
      try {
        const respuesta = await UsuariosAPI.findUsuarios()

        const listaUsuarios = Array.isArray(respuesta?.data)
          ? respuesta.data
          : Array.isArray(respuesta)
            ? respuesta
            : []

        const usuariosConRol = listaUsuarios.filter(
          (usuario: any) => Number(usuario?.rolId) === Number(formulario.id)
        )

        const cantidadUsuariosConEsteRol = usuariosConRol.length

        if (cantidadUsuariosConEsteRol > 0) {
          confirmDialog({
            message: `Hay ${cantidadUsuariosConEsteRol} usuario(s) con este rol. Si lo desactivas, perderán permisos. ¿Seguro?`,
            header: 'Confirmar desactivación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Desactivar',
            rejectLabel: 'Cancelar',
            acceptClassName: 'p-button-danger',
            accept: () => actualizarCampoDelFormulario('activoSn', 'N')
          })
          return
        }
      } catch (error) {
        console.error('Error al verificar usuarios del rol:', error)
      }
    }

    // Caso normal: se actualiza directamente el activoSn
    actualizarCampoDelFormulario('activoSn', nuevoValor)
  }

  // Valida y guarda el rol (crear o actualizar)
  const guardarRol = async () => {
    setErrores({})

    // Validación sencilla del nombre
    const nombreLimpio = String(formulario?.nombre || '').trim()
    if (nombreLimpio.length < 3) {
      setErrores({
        nombre: 'El nombre debe tener al menos 3 caracteres.'
      })
      return
    }

    const payload: Rol = { ...formulario, nombre: nombreLimpio }

    try {
      setCargando(true)

      // Caso panel: delegamos el guardado al callback onSave del padre
      if (esPanel && onSave) {
        await onSave(payload)
      } else if (payload.id) {
        // Edición en página
        await RolesAPI.updateRoleById(payload.id, payload)
        alert('Rol actualizado correctamente.')
      } else {
        // Creación en página
        await RolesAPI.createRole(payload)
        alert('Rol creado correctamente.')
      }
    } catch (error: any) {
      console.error('Error al guardar el rol:', error)
      setErrores({
        general: error?.message || 'Ocurrió un error al guardar.'
      })
    } finally {
      setCargando(false)
    }
  }

  // En modo panel, si no hay registro, no mostramos nada
  if (esPanel && !registroPanel) return null

  return (
    <div>
      {/* Título solo cuando se usa como página completa */}
      {!esPanel && <h2>Editar rol</h2>}

      <EditarDatosRolesVista
        formulario={formulario}
        errores={errores}
        cargando={cargando}
        modo={modo}
        esPanel={esPanel}
        onCampoChange={actualizarCampoDelFormulario}
        onEstadoChange={manejarCambioDeEstado}
        onGuardarClick={guardarRol}
        onCerrarClick={onClose}
      />
    </div>
  )
}
