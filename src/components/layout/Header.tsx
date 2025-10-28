import React from 'react';
// Estilos globales para header/topbar
import '../../styles/layout.scss';
import '../../styles/_main.scss';
import { Toolbar } from 'primereact/toolbar';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';

type Props = {
  title?: string;
  onToggleSidebar?: () => void;
  // Indica si el sidebar está colapsado/oculto (true) o visible (false)
  sidebarCollapsed?: boolean;
  notifications?: number;
  userName?: string;
  onLogout?: () => void;
};

export default function Header({ title, onToggleSidebar, sidebarCollapsed = false, notifications = 0, userName, onLogout }: Props) {
  // - alternarBarraLateral: función para abrir/cerrar sidebar
  // - notificaciones: número de notificaciones (se muestra un badge si > 0)
  // - nombreUsuario: email o nombre mostrado en el header
  // - cerrarSesion: callback para cerrar sesión
  const alternarBarraLateral = onToggleSidebar;
  const notificaciones = notifications;
  const nombreUsuario = userName;
  const cerrarSesion = onLogout;

  // Icono dinámico: si el sidebar está colapsado mostramos hamburguesa, si está visible mostramos un icono para cerrarlo
  const toggleIcon = sidebarCollapsed ? 'pi pi-bars' : 'pi pi-chevron-left'
  const toggleTooltip = sidebarCollapsed ? 'Abrir menú' : 'Ocultar menú'

  const left = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {alternarBarraLateral && (
        <Button icon={toggleIcon} onClick={alternarBarraLateral} className="p-button-text" aria-label={toggleTooltip} />
      )}
      <h1 style={{ margin: 0, fontSize: 16 }}>{title || 'Dashboard'}</h1>
    </div>
  );

  const right = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <Button icon="pi pi-bell" className="p-button-text" />
        {notificaciones > 0 && <Badge value={String(notificaciones)} severity="danger" style={{ position: 'absolute', top: -10, right: -10 }} />}
      </div>
      {nombreUsuario && <div style={{ fontSize: 14 }}>{nombreUsuario}</div>}
      {cerrarSesion && <Button label="Cerrar sesión" icon="pi pi-sign-out" onClick={cerrarSesion} />}
    </div>
  );

  return <Toolbar left={left} right={right} style={{ borderBottom: '1px solid #e5e7eb' }} />;
}
