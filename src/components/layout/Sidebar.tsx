import React from 'react';
// Importamos estilos globales del proyecto para mantener coherencia visual
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import { Button } from 'primereact/button';

type NavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
};

type Props = {
  items: NavItem[];
  selectedKey?: string;
  onSelect?: (key: string) => void;
};

export default function Sidebar({ items, selectedKey, onSelect }: Props) {
  // - elementos: lista de elementos del menú
  // - claveSeleccionada: clave de elemento actualmente activa
  // - onSeleccionar: función callback para seleccionar un item (usa el prop onSelect)
  const elementos = items;
  const claveSeleccionada = selectedKey;
  const onSeleccionar = onSelect;

  // Renderizamos el sidebar como columna estática; los botones usan estilos de PrimeReact.
  return (
    <div style={{ width: 220, borderRight: '1px solid #e5e7eb', padding: 12, height: '100vh', boxSizing: 'border-box', background: '#ffffff' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <strong>Portal</strong>
        </div>
      </div>
      <nav>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {elementos.map(item => (
            <Button
              key={item.key}
              onClick={() => onSeleccionar && onSeleccionar(item.key)}
              className={item.key === claveSeleccionada ? 'p-button-secondary' : 'p-button-text'}
              style={{ justifyContent: 'flex-start' }}
              iconPos="left"
              label={item.label}
              icon={item.icon as any}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
