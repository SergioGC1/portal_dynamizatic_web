import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ColumnDef } from '../../components/data-table/DataTable'
import { Calendar } from 'primereact/calendar'
import { InputSwitch } from 'primereact/inputswitch'
import EditarDatosProductos from './EditarDatosProductos'
import ProductPhasesPanel from '../../components/product/ProductPhasesPanel'
import usePermisos from '../../hooks/usePermisos'
import { useAuth } from '../../contexts/AuthContext'
import productosAPI from '../../api-endpoints/productos/index'
import estadosAPI from '../../api-endpoints/estados/index'
import fasesAPI from '../../api-endpoints/fases'
import tareasFasesAPI from '../../api-endpoints/tareas-fases'
import productosFasesTareasAPI from '../../api-endpoints/productos-fases-tareas'
import RolesAPI from '../../api-endpoints/roles'
import '../../styles/pages/ProductosEditar.scss'
import { confirmDialog } from 'primereact/confirmdialog'

/* === Tipos === */
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
  mode: Modo
  record: Producto | null
  columns?: ColumnDef<any>[]
  onClose: () => void
  onSave?: (producto: Producto) => Promise<void>
  onUploadSuccess?: (idProducto: number) => void
  entityType?: string // opcional, compatibilidad
}

type PropsPagina = { productId?: string }

type Props = PropsPagina | PropiedadesPanelProducto

type CampoRenderizado = {
  key: string
  label: string
  contenido: React.ReactNode
}
// ========================================================================
// COMPONENTE CONTENEDOR/LÃ“GICO: Editar
// - Detecta si se usa como pÃ¡gina (productId) o como panel (props.mode)
// - Gestiona estado local del formulario, carga inicial y llamadas a la API
// - Emite callbacks (onSave/onUploadSuccess) cuando procede
// ========================================================================
export default function Editar(props: Props) {
  // --- DetecciÃ³n de contexto ---
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

  // Formulario local
  const [formulario, setFormulario] = useState<Producto | Record<string, any>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})

  // Imagen: estados y refs para objectURL
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const currentObjectUrlRef = useRef<string | null>(null)

  // Permisos
  const { hasPermission: tienePermiso } = usePermisos()
  const { user } = useAuth()
  const pantalla = 'Productos'
  const puedeEditarActivo = () => {
    if (!tienePermiso) return false
    return (
      tienePermiso(pantalla, 'ActivoSN') ||
      tienePermiso(pantalla, 'ActivoSn') ||
      tienePermiso(pantalla, 'Activo')
    )
  }

  useEffect(() => {
    let montado = true
    if (esPanel && record) {
      setFormulario((record as any) || {})
      return () => { montado = false }
    }

    if (!esPanel && productIdDesdePagina) {
      (async () => {
        try {
          const data = await productosAPI.getProductoById(productIdDesdePagina)
          if (!montado) return
          setFormulario((data as any) || {})
        } catch (e) {
          console.error('Error cargando producto por id', e)
        }
      })()
    }

    return () => { montado = false }
  }, [esPanel, record, productIdDesdePagina])

  // Helper para actualizar campo
  const actualizarCampoDelFormulario = (clave: string, valor: any) =>
    setFormulario((formularioActual: any) => ({ ...formularioActual, [clave]: valor }))

  // ConstrucciÃ³n de URL de imagen segÃºn API base
  const baseDeApi = (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) || 'http://127.0.0.1:3000'
  const construirUrlDeImagen = (rutaImagen?: string) => {
    if (!rutaImagen) return ''
    const ruta = String(rutaImagen)
    if (ruta.startsWith('http://') || ruta.startsWith('https://')) return ruta
    if (ruta.startsWith('/')) return `${baseDeApi}${ruta}`
    return `${baseDeApi}/${ruta}`
  }

  // Preview que mostramos (priorizar backend _imagenUrl)
  const urlVistaPrevia = (formulario as any)?._imagenUrl || ((formulario as any)?.imagen ? construirUrlDeImagen((formulario as any).imagen) : '')
  const vistaPreviaLocal = localPreviewUrl

  // Determinar tÃ­tulo clave y columnas de cuadrÃ­cula
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

  const columnasDeLaCuadricula = (columnsProp || []).filter((definicionColumna) => {
    const claveNormalizada = String(definicionColumna.key).toLowerCase()
    if (claveNormalizada.includes('accion') || claveNormalizada.includes('acciones')) return false
    if (String(definicionColumna.key).toLowerCase() === 'imagen') return false
    if (definicionColumna.key === claveTitulo) return false
    return true
  })

  // Cargar estados para mostrar nombre en vez de id
  const [estados, setEstados] = useState<any[]>([])
  const [fases, setFases] = useState<any[]>([])
  const confirmPendientePromiseRef = useRef<Promise<boolean> | null>(null)
  const confirmPendienteActiveRef = useRef(false)
  const confirmEliminarImagenRef = useRef(false)
  useEffect(() => {
    let montado = true
    const cargar = async () => {
      try {
        const lista = await estadosAPI.findEstados()
        if (montado) setEstados(Array.isArray(lista) ? lista : [])
      } catch (err) {
        console.warn('No se pudieron cargar estados en EditarDatosProductos', err)
      }
      try {
        const listaFases = typeof (fasesAPI as any).findFases === 'function' ? await (fasesAPI as any).findFases() : await (fasesAPI as any).find?.()
        if (montado) setFases(Array.isArray(listaFases) ? listaFases : [])
      } catch (errFases) {
        console.warn('No se pudieron cargar fases', errFases)
      }
    }
    cargar()
    return () => { montado = false }
  }, [])

  const estadosMap: Record<string, string> = {}
  for (const est of estados || []) {
    if (est && est.id !== undefined) estadosMap[String(est.id)] = String(est.nombre || est.name || est.title || '')
  }

  const valorTitulo = String((formulario as any)?.[claveTitulo] ?? '')
  const nombreArchivoSeleccionado: string | undefined = (formulario as any)?._imagenFile
    ? ((formulario as any)._imagenFile as File).name
    : undefined
  const tieneProductoId = Boolean((formulario as any)?.id)
  const debeMostrarImagen = Boolean(mode === 'editar' || (formulario as any)?.imagen)

  const limpiarSeleccionDeImagen = () => {
    if (localPreviewUrl) {
      try {
        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current)
        }
      } catch (err) {
        // ignore
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
    eliminarImagenDelProductoConConfirmacion()
  }

  const renderSoloLectura = (texto: string) => (
    <div className="record-panel__value record-panel__value--view">{texto}</div>
  )

  const renderError = (clave: string) =>
    errores[clave] ? <div className="record-panel__error">{errores[clave]}</div> : null

  const [esSupervisor, setEsSupervisor] = useState(false)
  useEffect(() => {
    let montado = true
    const resolver = async () => {
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
        if (!rolId) { if (montado) setEsSupervisor(false); return }
        const rol = await RolesAPI.getRoleById(rolId)
        const nombre = (rol?.nombre || rol?.name || '').toString().trim().toLowerCase()
        if (montado) setEsSupervisor(nombre === 'supervisor')
      } catch (err) {
        console.error('No se pudo resolver rol', err)
        if (montado) setEsSupervisor(false)
      }
    }
    resolver()
    return () => { montado = false }
  }, [user])

  const puedeEditarEstado = () => {
    if (mode !== 'editar') return false
    return esSupervisor
  }

  const mapEstadoAFase = (estado: any) => {
    if (!estado) return null
    const nombre = String(estado.nombre || estado.name || estado.title || '').toLowerCase()
    const codigo = String(estado.codigo || estado.codigoEstado || '').toLowerCase()
    const idStr = String(estado.id ?? '')
    const match = fases.find((f: any) => {
      const n = String(f.nombre || '').toLowerCase()
      const c = String(f.codigo || '').toLowerCase()
      return n === nombre || c === codigo || String(f.id) === idStr || n.includes(nombre) || c.includes(codigo)
    })
    return match || null
  }

  const contarPendientesFase = async (faseId: number) => {
    const paramsT = { filter: JSON.stringify({ where: { faseId: Number(faseId) } }) }
    const resultadoT = await (tareasFasesAPI as any).findTareasFases(paramsT)
    const tareas = Array.isArray(resultadoT) ? resultadoT : []
    if (!tareas.length) return 0
    const filtro = { filter: JSON.stringify({ where: { productoId: Number((formulario as any)?.id), faseId: Number(faseId) } }) }
    const resultadoRp = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
    const rp = Array.isArray(resultadoRp) ? resultadoRp : []
    const mapa: Record<number, any> = {}
    for (const r of rp) {
      const tareaId = Number(r.tareaFaseId)
      if (!Number.isNaN(tareaId)) mapa[tareaId] = r
    }
    let pendientes = 0
    for (const t of tareas) {
      const r = mapa[Number((t as any).id)]
      const keyComp = r ? Object.keys(r).find(k => /complet/i.test(k)) || 'completadaSn' : 'completadaSn'
      if (!r || String(r[keyComp] ?? '').toUpperCase() !== 'S') pendientes += 1
    }
    return pendientes
  }

  const resetearTareas = async () => {
    try {
      // Traer todas las fases y tareas, marcar en N completada/validada
      const fasesArr = Array.isArray(fases) ? fases : []
      for (const f of fasesArr) {
        const paramsT = { filter: JSON.stringify({ where: { faseId: Number((f as any).id) } }) }
        const tareas = await (tareasFasesAPI as any).findTareasFases(paramsT)
        const arrT = Array.isArray(tareas) ? tareas : []
        for (const t of arrT) {
          const filtro = { filter: JSON.stringify({ where: { productoId: Number((formulario as any)?.id), faseId: Number((f as any).id), tareaFaseId: Number((t as any).id) } }) }
          const existentes = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
          const arrEx = Array.isArray(existentes) ? existentes : []
          const keyComp = arrEx[0] ? Object.keys(arrEx[0]).find(k => /complet/i.test(k)) || 'completadaSn' : 'completadaSn'
          const keyVal = arrEx[0] ? Object.keys(arrEx[0]).find(k => /validada|supervisor/i.test(k)) || 'validadaSupervisrSN' : 'validadaSupervisrSN'
          if (arrEx.length) {
            for (const ex of arrEx) {
              await (productosFasesTareasAPI as any).updateProductosFasesTareasById(ex.id, { [keyComp]: 'N', [keyVal]: 'N' })
            }
          } else {
            const payload: any = { productoId: Number((formulario as any)?.id), faseId: Number((f as any).id), tareaFaseId: Number((t as any).id), [keyComp]: 'N', [keyVal]: 'N' }
            await (productosFasesTareasAPI as any).createProductosFasesTareas(payload)
          }
        }
      }
    } catch (err) {
      console.error('No se pudieron resetear tareas', err)
    }
  }

  const resetearValidacionesSupervisor = async () => {
    try {
      const filtro = { filter: JSON.stringify({ where: { productoId: Number((formulario as any)?.id) } }) }
      const existentes = await (productosFasesTareasAPI as any).findProductosFasesTareas(filtro)
      const arrEx = Array.isArray(existentes) ? existentes : []
      for (const ex of arrEx) {
        const keyVal = ex ? Object.keys(ex).find((k) => /validada|supervisor/i.test(k)) || 'validadaSupervisrSN' : 'validadaSupervisrSN'
        await (productosFasesTareasAPI as any).updateProductosFasesTareasById(ex.id, { [keyVal]: 'N' })
      }
    } catch (err) {
      console.error('No se pudieron resetear validaciones de supervisor', err)
    }
  }

  const fasesOrdenadas = useMemo(() => {
    return [...(Array.isArray(fases) ? fases : [])].sort((a, b) => Number(a.id) - Number(b.id))
  }, [fases])

  const confirmarAvanceConPendientes = async (pendientes: string[]) =>
    new Promise<boolean>((resolve) => {
      if (confirmPendienteActiveRef.current) return
      confirmPendienteActiveRef.current = true
      confirmDialog({
        message: `Te quedan ${pendientes.join(', ')}. ¿Seguro que quieres avanzar de estado?`,
        header: 'Confirmar avance',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, avanzar',
        rejectLabel: 'Cancelar',
        accept: () => { confirmPendienteActiveRef.current = false; resolve(true) },
        reject: () => { confirmPendienteActiveRef.current = false; resolve(false) },
        closeOnEscape: true,
      })
    })

  const generarContenidoParaCampo = (claveCampo: string): React.ReactNode => {
    const valor = (formulario as any)?.[claveCampo]
    const normalizado = String(claveCampo).toLowerCase()

    if (normalizado.includes('estado')) {
      const etiqueta =
        estadosMap[String(valor ?? '')] || (formulario as any)?._estadoNombre || String(valor ?? '')
      if (puedeEditarEstado()) {
        const options = (estados || []).map((e) => ({ label: String(e?.nombre || e?.name || e?.title || ''), value: String(e?.id) }))
        return (
          <>
            <select
              value={valor ?? ''}
              onChange={async (e) => {
                const nuevo = e.target.value
                const anterior = (formulario as any)?.estadoId
                try {
                  console.log('[Estado] cambio', { anterior, nuevo, esSupervisor })
                  if (nuevo && nuevo !== anterior) {
                    const targetId = Number(nuevo)
                    const prevId = Number(anterior)
                    if (!Number.isNaN(targetId) && !Number.isNaN(prevId) && targetId > prevId) {
                      const listaFases = fasesOrdenadas.length ? fasesOrdenadas : (estados || []).map((e: any) => ({ id: e.id, nombre: e.nombre || e.name || e.title }))
                      const incompletas: string[] = []
                      for (const f of listaFases) {
                        if (Number(f.id) >= targetId) continue
                        const pendientes = await contarPendientesFase(Number(f.id))
                        console.log('[Estado] pendientes fase', { faseId: f.id, pendientes })
                        if (pendientes > 0) incompletas.push(`${pendientes} pendientes en ${f.nombre || f.id}`)
                      }
                    if (incompletas.length) {
                      if (!confirmPendientePromiseRef.current) {
                        confirmPendientePromiseRef.current = confirmarAvanceConPendientes(incompletas)
                      }
                      const ok = await confirmPendientePromiseRef.current
                      confirmPendientePromiseRef.current = null
                      if (!ok) return
                    }
                  }
                  if (!Number.isNaN(targetId) && !Number.isNaN(prevId) && targetId <= prevId) {
                    await resetearValidacionesSupervisor()
                  }
                }
              } catch (errConf) {
                console.error('Error validando cambio de estado', errConf)
              }
                actualizarCampoDelFormulario('estadoId', nuevo)
              }}
              className={`record-panel__input ${errores[claveCampo] ? 'record-panel__input--error' : ''}`}
            >
              <option value="">Selecciona estado</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {renderError(claveCampo)}
          </>
        )
      }
      return (
        <>
          {renderSoloLectura(etiqueta)}
          {renderError(claveCampo)}
        </>
      )
    }

    const esCampoAnyo = normalizado.includes('anyo') || normalizado.includes('aÃ±o')
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
            onChange={(e: any) =>
              actualizarCampoDelFormulario(claveCampo, e.value ? (e.value as Date).getFullYear() : '')
            }
            view="year"
            dateFormat="yy"
            showIcon
            className={`record-panel__input ${errores[claveCampo] ? 'record-panel__input--error' : ''}`}
            maxDate={new Date(new Date().getFullYear(), 11, 31)}
            minDate={new Date(1900, 0, 1)}
            inputClassName="productos-editar-calendar"
          />
          {renderError(claveCampo)}
        </>
      )
    }

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
            {renderSoloLectura(String(valor ?? '').toUpperCase() === 'S' ? 'Sí' : 'No')}
            {renderError(claveCampo)}
          </>
        )
      }
      const val = String(valor ?? 'N')
      return (
        <>
          <select
            value={val}
            onChange={(e) => actualizarCampoDelFormulario(claveCampo, e.target.value as 'S' | 'N')}
            className={`record-panel__input ${errores[claveCampo] ? 'record-panel__input--error' : ''}`}
          >
            <option value="S">Sí</option>
            <option value="N">No</option>
          </select>
          {renderError(claveCampo)}
        </>
      )
    }

    if (normalizado.includes('activo')) {
      const estaActivo = String(valor ?? '').toUpperCase() === 'S'
      if (mode === 'ver') {
        return (
          <>
            <div className="productos-editar-switch-row">
              <InputSwitch checked={estaActivo} disabled />
              <span className="productos-editar-switch-text">{estaActivo ? 'Activo' : 'Inactivo'}</span>
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
              onChange={(e: any) => actualizarCampoDelFormulario(claveCampo, e.value ? 'S' : 'N')}
              disabled={!(puedeEditarActivo && puedeEditarActivo())}
            />
            <span className="productos-editar-switch-text">{estaActivo ? 'Activo' : 'Inactivo'}</span>
          </div>
          {renderError(claveCampo)}
        </>
      )
    }

    if (mode === 'ver') {
      return (
        <>
          {renderSoloLectura(String(valor ?? ''))}
          {renderError(claveCampo)}
        </>
      )
    }

    return (
      <>
        <input
          value={valor ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            actualizarCampoDelFormulario(claveCampo, e.target.value)
          }
          className={`record-panel__input ${errores[claveCampo] ? 'record-panel__input--error' : ''}`}
        />
        {renderError(claveCampo)}
      </>
    )
  }

  const camposDinamicos: CampoRenderizado[] = (columnasDeLaCuadricula || []).map((columna) => ({
    key: columna.key,
    label: (columna as any).title || (columna as any).label || columna.key,
    contenido: generarContenidoParaCampo(columna.key),
  }))

  const descripcionCampo =
    !(columnasDeLaCuadricula || []).some((col) => col.key === 'descripcion') ? (
      <div className="record-panel__field">
        <label className="record-panel__label">DescripciÃ³n</label>
        {mode === 'ver' ? (
          renderSoloLectura(String((formulario as any)?.descripcion ?? ''))
        ) : (
          <>
            <input
              value={(formulario as any)?.descripcion ?? ''}
              onChange={(e) => actualizarCampoDelFormulario('descripcion', e.target.value)}
              className="record-panel__input"
            />
            {renderError('descripcion')}
          </>
        )}
      </div>
    ) : null

  const panelFases =
    esRegistroDeProducto && (formulario as any)?.id ? (
      <ProductPhasesPanel
        productId={(formulario as any).id}
        productName={(formulario as any)?.nombre}
        selectedEstadoId={(formulario as any)?.estadoId}
        readOnly={mode === 'ver'}
        onEstadoChange={(nuevoNombre: string) => actualizarCampoDelFormulario('_estadoNombre', nuevoNombre)}
      />
    ) : null

  /* === Manejo de seleccion de fichero === */
  const alSeleccionarArchivo = (archivo?: File) => {
    if (!archivo) return
    try {
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current)
        currentObjectUrlRef.current = null
      }
    } catch (err) {
      // ignore
    }
    const urlObjetoLocal = URL.createObjectURL(archivo)
    currentObjectUrlRef.current = urlObjetoLocal
    setLocalPreviewUrl(urlObjetoLocal)
    actualizarCampoDelFormulario('_imagenFile', archivo)
  }

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



  useEffect(() => {
    return () => {
      try {
        if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current)
      } catch (e) {
        // ignore
      }
    }
  }, [])

  /* === Subida de imagen al backend (delegada a ProductosAPI) === */
  const subirImagenDelProducto = async (archivoArg?: File, productoIdArg?: number | string) => {
    const archivo: File | undefined = archivoArg || (formulario as any)?._imagenFile
    let productoId = productoIdArg || (formulario as any)?.id
    if (!archivo) return alert('Selecciona un archivo antes de subir')
    if (!productoId) return alert('Guarda el producto primero para subir la imagen')

    try {
      setSubiendoImagen(true)

      const nombreOriginal = archivo.name || 'img'
      const coincidenciaExtension = nombreOriginal.match(/(\.[0-9a-zA-Z]+)$/)
      const extension = coincidenciaExtension ? coincidenciaExtension[1] : '.jpg'
      const nombreDeArchivoDeseado = `${productoId}${extension}`

      let data = null
      try {
        if (productosAPI && typeof (productosAPI as any).uploadProductoImagen === 'function') {
          data = await (productosAPI as any).uploadProductoImagen(productoId, archivo, nombreDeArchivoDeseado)
        } else {
          throw new Error('MÃ©todo uploadProductoImagen no disponible en ProductosAPI')
        }
      } catch (errorSubida) {
        throw errorSubida
      }

      if (data && data.path) {
        actualizarCampoDelFormulario('imagen', data.path)
        if (data.url) {
          const safeUrl = String(data.url)
          const separator = safeUrl.includes('?') ? '&' : '?'
          const busted = `${safeUrl}${separator}cb=${Date.now()}`
          actualizarCampoDelFormulario('_imagenUrl', busted)
        }

        setFormulario((s: any) => {
          const copy = { ...s }
          delete copy._imagenFile
          return copy
        })

        try {
          if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current)
        } catch (e) {
          // ignore
        }
        currentObjectUrlRef.current = null
        setLocalPreviewUrl(null)

        try {
          if (onUploadSuccess) {
            const maybeId = Number(productoId)
            if (!Number.isNaN(maybeId)) onUploadSuccess(maybeId)
          }
        } catch (er) {
          // ignore
        }
      } else {
        throw new Error('Respuesta del servidor sin path/url')
      }
    } catch (error: any) {
      console.error('Error subiendo imagen de producto', error)
      alert('Error subiendo la imagen: ' + (error?.message || error))
    } finally {
      setSubiendoImagen(false)
    }
  }

  /* === Eliminacion de imagen (confirmacion y llamada API) === */
  const eliminarImagenDelProductoConConfirmacion = () => {
    if (confirmEliminarImagenRef.current) return;
    confirmEliminarImagenRef.current = true;
    confirmDialog({
      message: 'Estas seguro de que quieres eliminar esta imagen? Esta accion no se puede deshacer.',
      header: 'Confirmar eliminacion',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          if ((formulario as any)?.id && (formulario as any).imagen) {
            if (productosAPI && typeof productosAPI.updateProductoById === 'function') {
              await productosAPI.updateProductoById((formulario as any).id, { imagen: null });
            }
          }
          actualizarCampoDelFormulario('imagen', '');
          console.log('Imagen eliminada correctamente');
        } catch (error) {
          console.error('Error al eliminar la imagen:', error);
          alert('Error al eliminar la imagen. Intentalo de nuevo.');
        } finally {
          confirmEliminarImagenRef.current = false;
        }
      },
      reject: () => { confirmEliminarImagenRef.current = false; },
      acceptLabel: 'Si, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      rejectClassName: 'p-button-secondary',
    });
  };


  /* === Subida automÃ¡tica tras guardar === */
  const intentarSubirImagenDespuesDeGuardar = async (archivo?: File) => {
    const archivoPendiente: File | undefined = archivo || (formulario as any)?._imagenFile
    if (!archivoPendiente) return

    let productoId = (formulario as any)?.id
    const maxRetries = 10
    let intentoActual = 0
    while ((!productoId || Number.isNaN(Number(productoId))) && intentoActual < maxRetries) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 100))
      productoId = (formulario as any)?.id
      intentoActual += 1
    }

    if (!productoId) {
      alert('Producto guardado pero no se ha podido subir la imagen automÃ¡ticamente porque el registro no tiene id. Abre el registro y sube la imagen.')
      return
    }

    try {
      await subirImagenDelProducto(archivoPendiente, productoId)
    } catch (errorSubidaAutomatica) {
      // La funciÃ³n de subida ya muestra errores, no repetimos alerta
    }
  }

  /* === Guardar/validaciones === */
  const guardarProductoConValidaciones = async () => {
    setErrores({})
    const nuevosErrores: Record<string, string> = {}
    const nombre = String((formulario as any).nombre || '').trim()
    if (!nombre) nuevosErrores.nombre = 'El nombre del producto es obligatorio'

    const anyoValor = (formulario as any).anyo ?? (formulario as any)['aÃ±o']
    const anyoStr = anyoValor !== undefined && anyoValor !== null ? String(anyoValor).trim() : ''
    const currentYearLocal = new Date().getFullYear()
    if (!anyoStr) nuevosErrores.anyo = 'El aÃ±o es obligatorio'
    else if (Number.isNaN(Number(anyoStr))) nuevosErrores.anyo = 'El aÃ±o debe ser un nÃºmero'
    else if (Number(anyoStr) < 1900 || Number(anyoStr) > currentYearLocal) nuevosErrores.anyo = `El aÃ±o debe estar entre 1900 y ${currentYearLocal}`

    if (Object.keys(nuevosErrores).length > 0) { setErrores(nuevosErrores); return }

    const archivoPendiente: File | undefined = (formulario as any)?._imagenFile
    const payload: any = { ...(formulario as any) }
    delete payload._imagenFile
    delete payload._imagenPreview
    delete payload._imagenUrl
    if (payload._estadoNombre !== undefined) delete payload._estadoNombre
    if (payload._cb !== undefined) delete payload._cb

    const anyoValor2 = (formulario as any).anyo ?? (formulario as any)['aÃ±o']
    if (anyoValor2 !== undefined && anyoValor2 !== null && String(anyoValor2).trim() !== '') {
      const parsedYear = Number(String(anyoValor2).trim())
      if (!Number.isNaN(parsedYear)) payload.anyo = parsedYear
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'aÃ±o')) delete payload['aÃ±o']
    if (payload.nombre) payload.nombre = String(payload.nombre).trim()
    if (payload.estadoId !== undefined && payload.estadoId !== null && payload.estadoId !== '') {
      const parsedEstado = Number(payload.estadoId)
      if (!Number.isNaN(parsedEstado)) payload.estadoId = parsedEstado
    }


    let resultadoGuardado: any = null
    if (onSave) {
      try {
        resultadoGuardado = await onSave(payload as Producto)
      } catch (e) {
        throw e
      }
    }

    try {
      const idNuevo = (resultadoGuardado && (resultadoGuardado.id || resultadoGuardado?.data?.id)) || (formulario as any)?.id
      if (archivoPendiente && idNuevo) {
        await subirImagenDelProducto(archivoPendiente, idNuevo)
      } else {
        await intentarSubirImagenDespuesDeGuardar(archivoPendiente)
      }
    } catch (e) { }
  }

  // Si estamos en modo panel y no hay record, no renderizamos nada
  if (esPanel && !record) return null

  // Renderizamos la vista pura y le pasamos todo lo necesario
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
        onNombreChange={(valor) => actualizarCampoDelFormulario(claveTitulo || 'nombre', valor)}
        onGuardarClick={guardarProductoConValidaciones}
        onCerrarClick={onClose}
      />
    </>
  )
}





