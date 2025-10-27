import React from 'react';
import { Dialog as PrimeDialog } from 'primereact/dialog';

type Props = React.ComponentProps<typeof PrimeDialog> & {
  title?: string;
};

// Diálogo sencillo que pasa props a PrimeDialog.
// No se cambian nombres de props para mantener compatibilidad.
export default function Dialog(props: Props) {
  const { visible, onHide, header, children, ...rest } = props as any;
  return (
    <PrimeDialog visible={visible} onHide={onHide} header={header} {...rest}>
      {children}
    </PrimeDialog>
  );
}
