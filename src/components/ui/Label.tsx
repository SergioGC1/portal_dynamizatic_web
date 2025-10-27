import React from 'react';

type Props = {
  children: React.ReactNode;
  htmlFor?: string;
};

// Componente Label: etiqueta estilizada para formularios
export default function Label({ children, htmlFor }: Props) {
  return (
    <label htmlFor={htmlFor} className="p-d-block" style={{ fontSize: 13, marginBottom: 6 }}>{children}</label>
  );
}
