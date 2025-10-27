import React from 'react';
import EditarDatosRoles from './EditarDatosRoles';

type Props = { rolId?: string };

export default function Editar({ rolId }: Props) {
  return (
    <div>
      <h2>Editar rol</h2>
      <EditarDatosRoles rolId={rolId} />
    </div>
  );
}
