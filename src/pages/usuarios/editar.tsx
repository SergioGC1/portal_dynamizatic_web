import React from 'react';
import EditarDatosUsuarios from './EditarDatosUsuarios';

type Props = { userId?: string };

export default function Editar({ userId }: Props) {
  return (
    <div>
      <EditarDatosUsuarios userId={userId} />
    </div>
  );
}
