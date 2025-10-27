import React, { useMemo, useState } from "react";
import "../styles/layout.scss";
import "../styles/_main.scss";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import Button from "../components/ui/Button";
import UsuariosPage from "./usuarios/page";
import RolesPage from "./roles/page";
import ProductosPage from "./productos/page"; // ← Ejemplo

export default function MainPage() {
  const { user, logout } = useAuth();
  const [selected, setSelected] = useState<string>("dashboard");

  const menuItems = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard" },
      { key: "usuarios", label: "Usuarios" },
      { key: "roles", label: "Roles" },
      { key: "productos", label: "Productos" },
      { key: "fases", label: "Fases" },
      { key: "permisos", label: "Permisos" },
      { key: "chat", label: "Chat" },
      { key: "notificaciones", label: "Notificaciones" },
    ],
    []
  );

  const componentes: Record<string, React.ReactNode> = {
    dashboard: (
      <section>
        <h2>Resumen</h2>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div
            style={{
              padding: 12,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              minWidth: 160,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700 }}>3</div>
            <div style={{ fontSize: 13 }}>Usuarios</div>
          </div>
          <div
            style={{
              padding: 12,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              minWidth: 160,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700 }}>0</div>
            <div style={{ fontSize: 13 }}>Notificaciones</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Button onClick={() => setSelected("usuarios")}>Ver usuarios</Button>
          </div>
        </div>
      </section>
    ),
    usuarios: <UsuariosPage />,
    roles: <RolesPage />,
    productos: <ProductosPage />,
    
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
      <Sidebar items={menuItems as any} selectedKey={selected} onSelect={setSelected} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header
          title="Portal Dynamizatic"
          userName={user?.email}
          notifications={0}
          onLogout={cerrarSesion}
        />
        <main style={{ padding: 16, overflow: "auto", overflowX: "auto", minWidth: 0 }}>{contenido}</main>
      </div>
    </div>
  );
}