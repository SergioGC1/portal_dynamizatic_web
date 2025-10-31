import React, { useMemo, useState } from "react";
import "../styles/layout.scss";
import "../styles/_main.scss";
import { useAuth } from "../contexts/AuthContext";
import usePermisos from '../hooks/usePermisos';
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
// Button import removed (no longer used here)
import UsuariosPage from "./usuarios/page";
import RolesPage from "./roles/page";
import ProductosPage from "./productos/page";
import PermisosPage from "./permisos/page";

export default function MainPage() {
  const { user, logout } = useAuth();
  // Estado para controlar si el sidebar está colapsado (modo hamburguesa)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [selected, setSelected] = useState<string>("dashboard");

  // Obtener helper para comprobar permisos del rol actual
  const { hasPermission: tienePermiso } = usePermisos()

  const menuItems = useMemo(() => {
    const base = [
      { key: "dashboard", label: "Dashboard" },
      { key: "usuarios", label: "Usuarios" },
      { key: "roles", label: "Roles" },
      { key: "productos", label: "Productos" },
      { key: "fases", label: "Fases" },
    ] as Array<{ key: string; label: string }>

    // Mostrar opción "Permisos" solo si el usuario puede ver o actualizar permisos
    if (tienePermiso('Permisos', 'Ver') || tienePermiso('Permisos', 'Actualizar')) {
      base.push({ key: 'permisos', label: 'Permisos' })
    }

    base.push({ key: "chat", label: "Chat" })
    base.push({ key: "notificaciones", label: "Notificaciones" })
    return base
  }, [tienePermiso])

  const componentes: Record<string, React.ReactNode> = {
    dashboard: (
      <section>
        <h2>Resumen</h2>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          
        </div>
      </section>
    ),
    usuarios: <UsuariosPage />,
    roles: <RolesPage />,
    productos: <ProductosPage />,
    permisos: <PermisosPage />,
    
  };

  const contenido = componentes[selected] ?? (
    <section>
      <h2>{menuItems.find((m) => m.key === selected)?.label}</h2>
      <p>Sección en construcción. Selecciona otra opción desde la barra lateral.</p>
    </section>
  );

  function cerrarSesion() {
    logout();
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {!sidebarCollapsed && (
        <Sidebar items={menuItems as any} selectedKey={selected} onSelect={setSelected} />
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Header
          title="Portal Dynamizatic"
          userName={user?.email}
          notifications={0}
        onLogout={cerrarSesion}
        // Evitar usar abreviaturas en callbacks; usar nombre explícito
        onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main style={{ padding: 16, overflow: "auto", overflowX: "auto", minWidth: 0 }}>{contenido}</main>
      </div>
    </div>
  );
}