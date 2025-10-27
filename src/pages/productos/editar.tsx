import React from 'react'
import EditarDatosProductos from './EditarDatosProductos'

type Props = { productId?: string }

export default function Editar({ productId }: Props) {
  return (
    <div>
      <EditarDatosProductos productId={productId} />
    </div>
  )
}
