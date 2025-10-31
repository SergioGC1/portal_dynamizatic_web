import React, { useEffect, useState } from 'react'
import productosAPI from '../../api-endpoints/productos/index'
import ProductPhasesPanel from '../../components/product/ProductPhasesPanel'

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

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!producto.nombre || !producto.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    if (producto.anyo === '' || producto.anyo == null || Number.isNaN(Number(producto.anyo))) errs.anyo = 'Año inválido'
    else if (Number(producto.anyo) < 1900 || Number(producto.anyo) > 2100) errs.anyo = 'Año debe estar entre 1900 y 2100'
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
            <input value={producto.nombre} onChange={e => setProducto(p => ({ ...p, nombre: e.target.value }))} style={{ width: '100%', padding: 8 }} />
            {fieldErrors.nombre && <div style={{ color: 'red', marginTop: 6 }}>{fieldErrors.nombre}</div>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Año *</label>
            <input type="number" value={producto.anyo as any} onChange={e => setProducto(p => ({ ...p, anyo: e.target.value === '' ? '' : Number(e.target.value) }))} style={{ width: '100%', padding: 8 }} />
            {fieldErrors.anyo && <div style={{ color: 'red', marginTop: 6 }}>{fieldErrors.anyo}</div>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Estado (ID)</label>
            <input type="number" value={producto.estadoId} onChange={e => setProducto(p => ({ ...p, estadoId: Number(e.target.value) }))} style={{ width: '100%', padding: 8 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Color</label>
            <input value={producto.color} onChange={e => setProducto(p => ({ ...p, color: e.target.value }))} style={{ width: '100%', padding: 8 }} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Descripción</label>
            <textarea value={producto.descripcion} onChange={e => setProducto(p => ({ ...p, descripcion: e.target.value }))} style={{ width: '100%', padding: 8, minHeight: 90 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Tamaño</label>
            <input value={producto.tamano} onChange={e => setProducto(p => ({ ...p, tamano: e.target.value }))} style={{ width: '100%', padding: 8 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Dimensión</label>
            <input value={producto.dimension} onChange={e => setProducto(p => ({ ...p, dimension: e.target.value }))} style={{ width: '100%', padding: 8 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Material 1</label>
            <input value={producto.material1} onChange={e => setProducto(p => ({ ...p, material1: e.target.value }))} style={{ width: '100%', padding: 8 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Material 2</label>
            <input value={producto.material2} onChange={e => setProducto(p => ({ ...p, material2: e.target.value }))} style={{ width: '100%', padding: 8 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Material 3</label>
            <input value={producto.material3} onChange={e => setProducto(p => ({ ...p, material3: e.target.value }))} style={{ width: '100%', padding: 8 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>¿Eléctrico?</label>
            <select value={producto.esElectricoSn} onChange={e => setProducto(p => ({ ...p, esElectricoSn: (e.target.value as 'S' | 'N') }))} style={{ width: '100%', padding: 8 }}>
              <option value="S">Sí</option>
              <option value="N">No</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>¿Biodegradable?</label>
            <select value={producto.esBiodegradableSn} onChange={e => setProducto(p => ({ ...p, esBiodegradableSn: (e.target.value as 'S' | 'N') }))} style={{ width: '100%', padding: 8 }}>
              <option value="S">Sí</option>
              <option value="N">No</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 6 }}>URL imagen</label>
            <input value={producto.imagen} onChange={e => setProducto(p => ({ ...p, imagen: e.target.value }))} style={{ width: '100%', padding: 8 }} />
            {producto.imagen && (
              <div style={{ marginTop: 8 }}>
                <img src={producto.imagen} alt="preview" style={{ maxWidth: 240, maxHeight: 160, objectFit: 'contain', border: '1px solid #e5e7eb' }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading} style={{ padding: '8px 12px', borderRadius: 6 }}>{productId ? 'Guardar' : 'Crear'}</button>
          <button type="button" onClick={() => { /* reset si quieres */ }} style={{ padding: '8px 12px', borderRadius: 6 }}>Cancelar</button>
        </div>
      </form>

      {/* Panel de fases: sólo en edición (producto existente) */}
      {productId && (
        <ProductPhasesPanel productId={productId} />
      )}
    </div>
  )
}
