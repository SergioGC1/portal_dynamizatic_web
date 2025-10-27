import React from 'react';
import { ScrollPanel } from 'primereact/scrollpanel';

type Props = {
  children: React.ReactNode;
  height?: number | string;
};

// Contenedor con scroll personalizado (envoltorio de PrimeReact ScrollPanel)
export default function ScrollArea({ children, height = '100%' }: Props) {
  return (
    <ScrollPanel style={{ width: '100%', height }}>
      {children}
    </ScrollPanel>
  );
}
