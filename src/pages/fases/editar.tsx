import React from 'react'
import EditarDatosFases from './EditarDatosFases'

type Props = { faseId?: string }

export default function Editar({ faseId }: Props) {
    return (
        <div>
            <EditarDatosFases />
        </div>
    )
}