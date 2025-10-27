import React from 'react';
import { Button as PrimeButton } from 'primereact/button';

type Props = React.ComponentProps<typeof PrimeButton> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

// Botón envoltorio que mapea un "variant" simple a la prop 'severity' de PrimeReact.
// Mantener el nombre de la prop 'variant' para no romper la API pública.
export default function Button(props: Props) {
  // Mapear nuestro 'variant' a la severidad de PrimeReact
  const { variant = 'primary', className, ...rest } = props;
  const severidad = variant === 'primary' ? 'primary' : variant === 'secondary' ? 'secondary' : undefined;
  return <PrimeButton severity={severidad as any} className={className} {...rest} />;
}
