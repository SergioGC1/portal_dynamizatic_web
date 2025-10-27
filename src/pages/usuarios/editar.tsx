import React from 'react';
import EditarDatosUsuarios from './EditarDatosUsuarios';

type Props = { userId?: string };

export default function Editar({ userId }: Props) {
  return (
    <div>
      <h2>Editar usuario</h2>
      <EditarDatosUsuarios userId={userId} />
    </div>
  );
}
