import React from 'react';
import { Dropdown } from 'primereact/dropdown';

type Opcion = { value: string | number; label: string };

type Props = React.ComponentProps<typeof Dropdown> & {
  options: Opcion[];
  label?: string;
};

// Select: envoltorio para Dropdown con label opcional
export default function Select({ options, label, ...restProps }: Props) {
  return (
    <div className="p-field" style={{ marginBottom: 8 }}>
      {label && <label className="p-d-block" style={{ marginBottom: 4 }}>{label}</label>}
      <Dropdown options={options} optionLabel="label" optionValue="value" {...(restProps as any)} style={{ width: '100%' }} />
    </div>
  );
}
