import React, { useEffect, useState } from 'react'
import { Calendar } from 'primereact/calendar'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { Dropdown } from 'primereact/dropdown'
import { Button } from 'primereact/button'
import productosAPI from '../../api-endpoints/productos/index'
import ProductPhasesPanel from '../../components/product/ProductPhasesPanel'
import estadosAPI from '../../api-endpoints/estados/index'

type Props = { productId?: string }

type ProductoForm = {
  nombre: string
  estadoId: number
  anyo: number | ''
  descripcion?: string
  color?: string
  tamano?: string
  dimension?: string
  material1?: string
  material2?: string
  material3?: string
  esElectricoSn?: 'S' | 'N'
  esBiodegradableSn?: 'S' | 'N'
  imagen?: string
}

export default function EditarDatosProductos({ productId }: Props) {
  const [loading, setLoading] = useState(false)
  const [estados, setEstados] = useState<any[]>([])
  const [producto, setProducto] = useState<ProductoForm>({
    nombre: '',
    estadoId: 1,
    anyo: new Date().getFullYear(),
    descripcion: '',
    color: '',
    tamano: '',
    dimension: '',
    material1: '',
    material2: '',
    material3: '',
    esElectricoSn: 'S',
    esBiodegradableSn: 'N',
    imagen: '',
  })

  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!productId) return
    let mounted = true
    setLoading(true)
    productosAPI.getProductoById(productId)
      .then((data: any) => {
        if (!mounted) return
        const mapped: ProductoForm = {
          nombre: data.nombre || '',
          estadoId: data.estadoId ?? data.estado ?? 1,
          anyo: data.anyo ?? '',
          descripcion: data.descripcion || '',
          color: data.color || '',
          // Mantenemos estado interno como `tamaO`
          tamano: data.tamano ?? data['tamaO'] ?? '',
          dimension: data.dimension || '',
          material1: data.material1 || '',
          material2: data.material2 || '',
          material3: data.material3 || '',
          // Aceptamos varias formas que el backend pueda devolver (esElectricoSn / esElectricoSN)
          esElectricoSn: (data.esElectricoSn ?? data.esElectricoSN) === 'N' ? 'N' : 'S',
          esBiodegradableSn: (data.esBiodegradableSn ?? data.esBiodegradableSN) === 'S' ? 'S' : 'N',
          imagen: data.imagen || data.imagenes || '',
        }
        setProducto(mapped)
      })
      .catch((e: any) => { console.error(e); setError(e?.message || 'Error cargando producto') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [productId])

  // Cargar lista de estados para mostrar nombres en el select
  useEffect(() => {
    let montado = true
    const cargarEstados = async () => {
      try {
        const lista = await estadosAPI.findEstados()
        if (montado) setEstados(Array.isArray(lista) ? lista : [])
      } catch (err) {
        console.warn('No se pudieron cargar estados', err)
      }
    }
    cargarEstados()
    return () => { montado = false }
  }, [])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!producto.nombre || !producto.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
  const currentYear = new Date().getFullYear()
  if (producto.anyo === '' || producto.anyo == null || Number.isNaN(Number(producto.anyo))) errs.anyo = 'Año inválido'
  else if (Number(producto.anyo) < 1900 || Number(producto.anyo) > currentYear) errs.anyo = `Año debe estar entre 1900 y ${currentYear}`
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError(null)
    if (!validate()) return
    try {
      setLoading(true)
      const payload: any = {
        nombre: producto.nombre,
        estadoId: producto.estadoId ?? 1,
        anyo: Number(producto.anyo) || new Date().getFullYear(),
        descripcion: producto.descripcion,
        color: producto.color,
        // Enviamos la propiedad con la llave `tamaO` para ajustarnos al esquema SQL
        tamaO: producto.tamano,
        dimension: producto.dimension,
        material1: producto.material1,
        material2: producto.material2,
        material3: producto.material3,
        esElectricoSn: producto.esElectricoSn || 'S',
        esBiodegradableSn: producto.esBiodegradableSn || 'N',
        imagen: producto.imagen,
      }

      if (!productId) {
        await productosAPI.createProducto(payload)
        alert('Producto creado correctamente')
      } else {
        await productosAPI.updateProductoById(productId, payload)
        alert('Producto actualizado correctamente')
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Error guardando producto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h3 style={{ marginBottom: 12 }}>{productId ? 'Editar producto' : 'Nuevo producto'}</h3>

      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Nombre *</label>
            <InputText value={producto.nombre} onChange={e => setProducto(p => ({ ...p, nombre: e.target.value }))} className="w-full" />
            {fieldErrors.nombre && <div style={{ color: 'red', marginTop: 6 }}>{fieldErrors.nombre}</div>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Año *</label>
            <Calendar
              value={producto.anyo ? new Date(Number(producto.anyo), 0, 1) : null}
              onChange={(e: any) => setProducto(p => ({ ...p, anyo: e.value ? (e.value as Date).getFullYear() : '' }))}
              view="year"
              dateFormat="yy"
              showIcon
              placeholder="Selecciona año"
              maxDate={new Date(new Date().getFullYear(), 11, 31)}
              minDate={new Date(1900, 0, 1)}
              style={{ width: '100%' }}
            />
            {fieldErrors.anyo && <div style={{ color: 'red', marginTop: 6 }}>{fieldErrors.anyo}</div>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Estado</label>
            <Dropdown
              value={producto.estadoId}
              options={(estados || []).map((e: any) => ({ label: String(e?.nombre || e?.name || e?.title || `Estado ${e?.id}`), value: Number(e?.id) }))}
              onChange={(e) => setProducto(p => ({ ...p, estadoId: e.value }))}
              placeholder="Selecciona estado"
              className="w-full"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Color</label>
            <InputText value={producto.color} onChange={e => setProducto(p => ({ ...p, color: e.target.value }))} className="w-full" />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Descripción</label>
            <InputTextarea value={producto.descripcion} onChange={e => setProducto(p => ({ ...p, descripcion: e.target.value }))} className="w-full" rows={6} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Tamaño</label>
            <InputText value={producto.tamano} onChange={e => setProducto(p => ({ ...p, tamano: e.target.value }))} className="w-full" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Dimensión</label>
            <InputText value={producto.dimension} onChange={e => setProducto(p => ({ ...p, dimension: e.target.value }))} className="w-full" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Material 1</label>
            <InputText value={producto.material1} onChange={e => setProducto(p => ({ ...p, material1: e.target.value }))} className="w-full" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Material 2</label>
            <InputText value={producto.material2} onChange={e => setProducto(p => ({ ...p, material2: e.target.value }))} className="w-full" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Material 3</label>
            <InputText value={producto.material3} onChange={e => setProducto(p => ({ ...p, material3: e.target.value }))} className="w-full" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>¿Eléctrico?</label>
            <Dropdown value={producto.esElectricoSn} options={[{ label: 'Sí', value: 'S' }, { label: 'No', value: 'N' }]} onChange={(e) => setProducto(p => ({ ...p, esElectricoSn: e.value }))} className="w-full" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>¿Biodegradable?</label>
            <Dropdown value={producto.esBiodegradableSn} options={[{ label: 'Sí', value: 'S' }, { label: 'No', value: 'N' }]} onChange={(e) => setProducto(p => ({ ...p, esBiodegradableSn: e.value }))} className="w-full" />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 6 }}>URL imagen</label>
            <InputText value={producto.imagen} onChange={e => setProducto(p => ({ ...p, imagen: e.target.value }))} className="w-full" />
            {producto.imagen && (
              <div style={{ marginTop: 8 }}>
                <img src={producto.imagen} alt="preview" style={{ maxWidth: 240, maxHeight: 160, objectFit: 'contain', border: '1px solid #e5e7eb' }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <Button type="submit" label={productId ? 'Guardar' : 'Crear'} disabled={loading} />
          <Button type="button" label="Cancelar" onClick={() => { /* reset si quieres */ }} className="p-button-secondary" />
        </div>
      </form>

      {/* Panel de fases: sólo en edición (producto existente) */}
      {productId && (
        <ProductPhasesPanel productId={productId} selectedEstadoId={producto.estadoId} />
      )}
    </div>
  )
}
