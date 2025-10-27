import React from 'react';
import { Badge as PrimeBadge } from 'primereact/badge';

type Props = React.ComponentProps<typeof PrimeBadge> & {
  children?: React.ReactNode;
};

// Componente Badge: wrapper mínimo sobre PrimeBadge.
export default function Badge(props: Props) {
  const { value, severity, style, children, ...rest } = props as any;
  // Si no se proporciona 'value', intentar usar 'children' como contenido textual
  const valor = value ?? (typeof children === 'string' ? children : undefined);
  return <PrimeBadge value={valor} severity={severity} style={style} {...rest} />;
}
