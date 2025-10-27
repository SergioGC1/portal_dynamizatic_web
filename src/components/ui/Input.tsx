import React from 'react';
import { InputText } from 'primereact/inputtext';

type Props = React.ComponentProps<typeof InputText> & {
  label?: string;
};

export default function Input({ label, ...restProps }: Props) {
  // Campo de formulario simple con label opcional.
  return (
    <div className="p-field" style={{ marginBottom: 8 }}>
      {label && <label className="p-d-block" style={{ marginBottom: 4 }}>{label}</label>}
      <InputText {...(restProps as any)} style={{ width: '100%' }} />
    </div>
  );
}
