import React, { useMemo, useState, useEffect } from "react";
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

  // Obtener helper para comprobar permisos del rol actual
  const { hasPermission: tienePermiso } = usePermisos()

  const [selected, setSelected] = useState<string>(""); // Sin selección inicial

  const menuItems = useMemo(() => {
    const paginasConPermisos = [] as Array<{ key: string; label: string }>;

    // Solo mostrar páginas si el usuario tiene el permiso "Ver" correspondiente
    if (tienePermiso('Usuarios', 'Ver')) {
      paginasConPermisos.push({ key: "usuarios", label: "Usuarios" })
    }

    if (tienePermiso('Roles', 'Ver')) {
      paginasConPermisos.push({ key: "roles", label: "Roles" })
    }

    if (tienePermiso('Productos', 'Ver')) {
      paginasConPermisos.push({ key: "productos", label: "Productos" })
    }

    if (tienePermiso('Fases', 'Ver')) {
      paginasConPermisos.push({ key: "fases", label: "Fases" })
    }

    // Mostrar opción "Permisos" solo si el usuario puede ver o actualizar permisos
    if (tienePermiso('Permisos', 'Ver') || tienePermiso('Permisos', 'Actualizar')) {
      paginasConPermisos.push({ key: 'permisos', label: 'Permisos' })
    }

    // Añadir Chat al final
    paginasConPermisos.push({ key: "chat", label: "Chat" })

    return paginasConPermisos;
  }, [tienePermiso])

  // Establecer automáticamente la primera página disponible cuando se cargan los permisos
  useEffect(() => {
    if (menuItems.length > 0) {
      // Si no hay selección o la selección actual no está disponible
      if (!selected || !menuItems.some(item => item.key === selected)) {
        // Buscar páginas en orden de prioridad, excluyendo Chat
        const prioridadPaginas = ['usuarios', 'roles', 'productos', 'fases', 'permisos'];
        
        // Encontrar la primera página disponible según prioridad
        let paginaSeleccionada = ''; // fallback
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
  const componentes: Record<string, React.ReactNode> = {
    usuarios: tienePermiso('Usuarios', 'Ver') ? <UsuariosPage /> : null,
    roles: tienePermiso('Roles', 'Ver') ? <RolesPage /> : null,
    productos: tienePermiso('Productos', 'Ver') ? <ProductosPage /> : null,
    permisos: (tienePermiso('Permisos', 'Ver') || tienePermiso('Permisos', 'Actualizar')) ? <PermisosPage /> : null,
    chat: (
      <section>
        <h2>Chat</h2>
        <p>Funcionalidad de chat en construcción.</p>
      </section>
    ),
  };

  const getContenido = () => {
    // Si no hay páginas disponibles, mostrar mensaje de sin permisos
    if (menuItems.length === 0) {
      return (
        <section style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Sin acceso</h2>
          <p>No tienes permisos para acceder a ninguna sección del portal.</p>
          <p>Contacta al administrador para solicitar los permisos necesarios.</p>
        </section>
      );
    }

    // Si no hay selección, mostrar mensaje de seleccionar
    if (!selected) {
      return (
        <section style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Selecciona una opción</h2>
          <p>Elige una sección desde la barra lateral para comenzar.</p>
        </section>
      );
    }

    // Verificar si el usuario tiene permisos para la página seleccionada
    const componente = componentes[selected];
    if (componente === null) {
      return (
        <section style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Acceso denegado</h2>
          <p>No tienes permisos para acceder a esta sección.</p>
        </section>
      );
    }

    // Si el componente existe, mostrarlo
    if (componente) {
      return componente;
    }

    // Fallback para secciones en construcción
    return (
      <section>
        <h2>{menuItems.find((m) => m.key === selected)?.label}</h2>
        <p>Sección en construcción. Selecciona otra opción desde la barra lateral.</p>
      </section>
    );
  };

  const contenido = getContenido();

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