import React from 'react';
import EditarPermisos from './EditarPermisos';

type Props = { rolId?: string };

/**
 * Wrapper sencillo para la página de edición de permisos.
 * Mantiene la misma convención que otras páginas (ej: usuarios/editar.tsx)
 */
export default function Editar({ rolId }: Props) {
  return (
    <div>
      {/* Renderiza el componente principal que gestiona la edición de permisos */}
      <EditarPermisos rolId={rolId} />
    </div>
  );
}
