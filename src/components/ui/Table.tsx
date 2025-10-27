import React from 'react';
import { DataTable } from 'primereact/datatable';

type Props = React.ComponentProps<typeof DataTable> & {
  children?: React.ReactNode;
};

// Wrapper mínimo para DataTable de PrimeReact
export default function Table(propiedades: Props) {
  return <DataTable {...(propiedades as any)} />;
}
