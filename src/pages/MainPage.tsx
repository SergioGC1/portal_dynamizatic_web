import React, { useEffect, useMemo, useState } from "react";
import "../styles/layout.scss";
import "../styles/_main.scss";
import { useAuth } from "../contexts/AuthContext";
import usePermisos from '../hooks/usePermisos';
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import UsuariosPage from "./usuarios/page";
import RolesPage from "./roles/page";
import ProductosPage from "./productos/page";
import FasesPage from "./fases/page";
import PermisosPage from "./permisos/page";
import ChatPage from "./chat/page";

export default function MainPage() {
  // Usuario actual y logout
  const { user, logout } = useAuth();

  // Estado sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Permisos del rol
  const { hasPermission: tienePermiso } = usePermisos();

  // Página seleccionada
  const [selected, setSelected] = useState<string>("");
  // Forzar remount de Usuarios al abrir perfil
  const [usuariosKey, setUsuariosKey] = useState<number>(0);

  // Items del menú según permisos
  const menuItems = useMemo(() => {
    const paginasConPermisos = [] as Array<{ key: string; label: string }>;
    if (tienePermiso('Usuarios', 'Ver')) paginasConPermisos.push({ key: "usuarios", label: "Usuarios" });
    if (tienePermiso('Roles', 'Ver')) paginasConPermisos.push({ key: "roles", label: "Roles" });
    if (tienePermiso('Productos', 'Ver')) paginasConPermisos.push({ key: "productos", label: "Productos" });
    if (tienePermiso('Fases', 'Ver')) paginasConPermisos.push({ key: "fases", label: "Fases" });
    if (tienePermiso('Permisos', 'Ver') || tienePermiso('Permisos', 'Actualizar')) paginasConPermisos.push({ key: 'permisos', label: 'Permisos' });
    if (tienePermiso('MensajesChat', 'Ver')) paginasConPermisos.push({ key: "chat", label: "Chat" });
    return paginasConPermisos;
  }, [tienePermiso]);

  // Selección inicial según prioridad
  useEffect(() => {
    if (menuItems.length > 0) {
      if (!selected || !menuItems.some(item => item.key === selected)) {
        const prioridadPaginas = ['usuarios', 'roles', 'productos', 'fases', 'permisos'];
        let paginaSeleccionada = '';
        for (const pagina of prioridadPaginas) {
          if (menuItems.some(item => item.key === pagina)) {
            paginaSeleccionada = pagina;
            break;
          }
        }
        setSelected(paginaSeleccionada);
      }
    }
  }, [menuItems, selected]);

  // Contenido según selección
  const componentes: Record<string, React.ReactNode> = {
    usuarios: tienePermiso('Usuarios', 'Ver') ? <UsuariosPage key={`usuarios-${usuariosKey}`} /> : null,
    roles: tienePermiso('Roles', 'Ver') ? <RolesPage /> : null,
    productos: tienePermiso('Productos', 'Ver') ? <ProductosPage /> : null,
    fases: tienePermiso('Fases', 'Ver') ? <FasesPage /> : null,
    permisos: (tienePermiso('Permisos', 'Ver') || tienePermiso('Permisos', 'Actualizar')) ? <PermisosPage /> : null,
    chat: tienePermiso('MensajesChat', 'Ver') ? <ChatPage /> : null,
  };

  const getContenido = () => {
    if (menuItems.length === 0) {
      return (
        <section style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Sin acceso</h2>
          <p>No tienes permisos para acceder a ninguna sección del portal.</p>
          <p>Contacta al administrador para solicitar los permisos necesarios.</p>
        </section>
      );
    }

    if (!selected) {
      return (
        <section style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Selecciona una opción</h2>
          <p>Elige una sección desde la barra lateral para comenzar.</p>
        </section>
      );
    }

    const componente = componentes[selected];
    if (componente === null) {
      return (
        <section style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Acceso denegado</h2>
          <p>No tienes permisos para acceder a esta sección.</p>
        </section>
      );
    }

    if (componente) return componente;

    return (
      <section>
        <h2>{menuItems.find((m) => m.key === selected)?.label}</h2>
        <p>Sección en construcción. Selecciona otra opción desde la barra lateral.</p>
      </section>
    );
  };

  const contenido = getContenido();

  const cerrarSesion = () => logout();

  // Permisos de usuario
  const puedeVerUsuarios = tienePermiso('Usuarios', 'Ver');
  const puedeEditarPerfil = tienePermiso('Usuarios', 'Actualizar') && puedeVerUsuarios;

  // Ir a perfil: redirige a Usuarios y guarda email para que no se pierda referencia
  const irAPerfil = () => {
    if (!puedeEditarPerfil) return;
    if (user?.email) {
      sessionStorage.setItem('perfilEmailActivo', user.email);
    }
    setSelected('usuarios');
    setUsuariosKey((k) => k + 1); // remount para disparar carga y panel
  };

  // Datos básicos para avatar/iniciales
  const nombreMostrado = (user as any)?.nombreUsuario || (user as any)?.name || user?.email;
  const avatarUrl = (user as any)?.imagen || (user as any)?.avatar;
  const apellidos = (user as any)?.apellidos || (user as any)?.lastName || '';

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {!sidebarCollapsed && (
        <Sidebar items={menuItems as any} selectedKey={selected} onSelect={setSelected} />
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header
          title="Portal Dynamizatic"
          userName={nombreMostrado}
          userLastName={apellidos}
          userEmail={user?.email}
          userAvatar={avatarUrl}
          allowProfile={puedeEditarPerfil}
          onProfile={irAPerfil}
          onLogout={cerrarSesion}
          onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main style={{ padding: 16, overflow: "auto", overflowX: "auto", minWidth: 0 }}>{contenido}</main>
      </div>
    </div>
  );
}
