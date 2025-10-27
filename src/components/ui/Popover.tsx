import React, { useRef } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';

type Props = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  dismissable?: boolean;
};

export default function Popover({ trigger, children, dismissable = true }: Props) {
  // Referencia al OverlayPanel de PrimeReact
  const panelRef = useRef<OverlayPanel | null>(null);
  return (
    <div style={{ display: 'inline-block' }}>
      <div onClick={(e) => (panelRef.current as any).toggle(e)} style={{ display: 'inline-block', cursor: 'pointer' }}>{trigger}</div>
      <OverlayPanel ref={panelRef as any} dismissable={dismissable}>{children}</OverlayPanel>
    </div>
  );
}
