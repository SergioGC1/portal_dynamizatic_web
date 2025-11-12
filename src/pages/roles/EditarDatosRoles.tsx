import React, { useEffect, useState } from 'react'
import { InputSwitch } from 'primereact/inputswitch'
import { Button } from 'primereact/button'
import RolesAPI from '../../api-endpoints/roles/index'
import '../../styles/paneles/PanelRol.scss'

// Componente único que sirve tanto como página de edición (recibe `rolId`)
// como panel reutilizable desde `GestorEditores` (recibe `mode`, `record`, `onSave`, `onClose`).
// Se decide en tiempo de ejecución por las props recibidas.

type PropsPagina = { rolId?: string }
type PropsPanel = {
  mode: 'ver' | 'editar'
  record?: any | null
  columns?: any[]
  onClose: () => void
  onSave?: (rolActualizado: any) => Promise<any>
}

export default function EditarDatosRoles(props: PropsPagina | PropsPanel) {
  // Normalizar props a tipos específicos para poder referenciarlas sin expresiones complejas
  const propsPanel = props as PropsPanel
  const propsPagina = props as PropsPagina
  // Detectar modo: si viene `mode` entendemos que somos el panel; si viene `rolId` somos la página
  const esPanel = propsPanel.mode !== undefined
  const rolIdDesdePagina = propsPagina.rolId
  const recordProp = propsPanel.record

  // Estado del formulario (nombre, activoSn, id, etc.)
  const [formulario, establecerFormulario] = useState<any>({ nombre: '', activoSn: '' })
  const [errores, establecerErrores] = useState<Record<string, string>>({})
  const [cargando, establecerCargando] = useState<boolean>(false)

  // Inicializar formulario: si venimos como panel usamos `record`, si somos página cargamos por id
  useEffect(() => {
    let montado = true

    const inicializarDesdeRecord = () => {
      const record = recordProp
      if (!record) return
      const nombre = record?.nombre ?? record?.name ?? ''
      const activo = record?.activoSn ?? record?.activoSN ?? record?.activo ?? ''
      if (montado) establecerFormulario({ ...record, nombre, activoSn: activo })
    }

    if (esPanel) {
      inicializarDesdeRecord()
    } else if (rolIdDesdePagina) {
      // Página: cargar rol desde API
      ;(async () => {
        try {
          establecerCargando(true)
          const data = await RolesAPI.getRoleById(rolIdDesdePagina)
          if (!montado) return
          const nombre = data?.nombre ?? data?.name ?? ''
          const activo = data?.activoSn ?? data?.activoSN ?? data?.activo ?? ''
          establecerFormulario({ ...data, nombre, activoSn: activo })
        } catch (e: any) {
          console.error('Error cargando rol:', e)
          if (montado) establecerErrores({ general: e?.message || 'Error cargando rol' })
        } finally {
          if (montado) establecerCargando(false)
        }
      })()
    }

    return () => { montado = false }
  }, [esPanel, rolIdDesdePagina, recordProp])

  // Actualizar campo del formulario
  const actualizarCampo = (clave: string, valor: any) => {
    establecerFormulario((prev: any) => ({ ...prev, [clave]: valor }))
    // borrar error de campo al modificarlo
    establecerErrores((prev) => {
      if (!prev || !prev[clave]) return prev
      const { [clave]: _omit, ...rest } = prev
      return rest
    })
  }

  // Validaciones y guardado (compatible con panel y página)
  const guardarFormulario = async () => {
    establecerErrores({})
    // Validación: nombre mínimo 3 caracteres
    const nombreLimpio = String(formulario.nombre || '').trim()
    if (!nombreLimpio || nombreLimpio.length < 3) {
      establecerErrores({ nombre: 'El nombre debe tener al menos 3 caracteres' })
      return
    }

    // Validación de unicidad (cliente) - trata de no depender exclusivamente del backend
    try {
      const lista = await RolesAPI.findRoles()
      const esNuevo = !formulario?.id
      const idActual = formulario?.id
      const nombreNormalizado = nombreLimpio.toLowerCase()
      const existeOtro = Array.isArray(lista) && lista.some((r: any) => {
        if (!r) return false
        const n = String(r.nombre || '').trim().toLowerCase()
        if (n !== nombreNormalizado) return false
        if (!esNuevo && Number(r.id) === Number(idActual)) return false
        return true
      })
      if (existeOtro) {
        establecerErrores({ nombre: 'Este nombre de rol ya está en uso' })
        return
      }
    } catch (err) {
      // Si la verificación falla, dejamos que el backend valide en última instancia
    }

    // Preparar payload limpio
    const payload: any = { ...formulario }
    if ('activo' in payload) delete payload.activo
    if (payload._cb !== undefined) delete payload._cb

    try {
      establecerCargando(true)
      if (esPanel) {
        // Si el padre nos pasó `onSave`, delegamos en él para mantener flujo de GestorEditores
        const callbackGuardar = (props as PropsPanel).onSave
        if (callbackGuardar) {
          await callbackGuardar(payload)
        } else {
          // fallback: usar API directamente
          if (payload.id) await RolesAPI.updateRoleById(payload.id, payload)
          else await RolesAPI.createRole(payload)
        }
        // cerrar panel si existe onClose
        if ((props as PropsPanel).onClose) (props as PropsPanel).onClose()
      } else {
        // Modo página: usamos directamente la API
        if (payload.id) await RolesAPI.updateRoleById(payload.id, payload)
        else await RolesAPI.createRole(payload)
        alert('Guardado correctamente')
      }
    } catch (e: any) {
      console.error('Error guardando rol:', e)
      // Intento de mapear errores de backend a campos
      const mensaje = String(e?.message || e?.data?.message || '')
      if (/unique|duplicad/i.test(mensaje) && /nombre/i.test(mensaje)) {
        establecerErrores({ nombre: 'Este nombre de rol ya está en uso' })
      } else {
        establecerErrores({ general: mensaje || 'Error guardando rol' })
        throw e
      }
    } finally {
      establecerCargando(false)
    }
  }

  return (
    <div className="record-panel" style={{ maxWidth: '100%', }}>
      <div className="record-panel__header">
        <strong className="record-panel__title">{(esPanel && (props as PropsPanel).mode === 'ver') ? 'Ver rol' : ((esPanel && (props as PropsPanel).mode === 'editar') ? 'Editar rol' : 'Editar rol')}</strong>
        <div className="record-panel__controls">
          {/* Botón Guardar: solo en modo edición */}
          {(!esPanel || (esPanel && (props as PropsPanel).mode === 'editar')) && (
            <Button label="Guardar" onClick={guardarFormulario} style={{ marginRight: 8 }} disabled={cargando} />
          )}
          {/* Botón Cerrar: si existiera onClose (panel) */}
          {esPanel && <Button label="Cerrar" onClick={() => (props as PropsPanel).onClose && (props as PropsPanel).onClose()} className="p-button-secondary" />}
        </div>
      </div>

      {cargando && <div style={{ padding: 8 }}>Cargando...</div>}
      {errores.general && <div style={{ color: 'red', padding: 8 }}>{errores.general}</div>}

      <div className="record-panel__top">
        <div className="record-panel__main-title record-panel__main-title--full">
          <label className="record-panel__label">Nombre del rol</label>
          <input
            value={formulario?.nombre ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => actualizarCampo('nombre', e.target.value)}
            className={`record-panel__input record-panel__product-name-input ${errores.nombre ? 'record-panel__input--error' : ''}`}
            disabled={esPanel && (props as PropsPanel).mode === 'ver'}
          />
          {errores.nombre && (<div style={{ color: 'red', marginTop: 6 }}>{errores.nombre}</div>)}
        </div>
      </div>

      <div className="record-panel__field">
        <label className="record-panel__label">Estado</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InputSwitch
            checked={String(formulario?.activoSn ?? '').toUpperCase() === 'S' || formulario?.activo === true}
            onChange={(e: any) => actualizarCampo('activoSn', e.value ? 'S' : 'N')}
            disabled={esPanel && (props as PropsPanel).mode === 'ver'}
          />
          <span style={{ fontSize: 14 }}>{String(formulario?.activoSn ?? '').toUpperCase() === 'S' || formulario?.activo === true ? 'Activo' : 'Inactivo'}</span>
        </div>
      </div>
    </div>
  )
}
