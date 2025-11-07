import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Tipo del contexto de notificaciones con nombres claros
export type TipoContextoNotificaciones = {
  cantidadNoLeidas: number;
  establecerCantidadNoLeidas: (nuevaCantidad: number) => void;
  refrescarCantidadNoLeidas: () => Promise<void>;
  noLeidosPorInterlocutor: Record<string, number>;
  refrescarNoLeidosChat: () => Promise<void>;
};

const Contexto = createContext<TipoContextoNotificaciones | undefined>(undefined);

// Custom hook para acceder al contexto (debe empezar por "use" para las reglas de hooks)
export function useNotificaciones() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('usarNotificaciones debe usarse dentro de ProveedorNotificaciones');
  return ctx;
}

export function ProveedorNotificaciones({ children }: { children: React.ReactNode }) {
  const [cantidadNoLeidas, establecerCantidadNoLeidas] = useState(0);
  const [noLeidosPorInterlocutor, setNoLeidosPorInterlocutor] = useState<Record<string, number>>({});

  const refrescarCantidadNoLeidas = async () => {
    // Desactivado temporalmente: dejar en 0 sin realizar peticiones
    establecerCantidadNoLeidas(0);
  };

  const refrescarNoLeidosChat = async () => {
    // Desactivado temporalmente: mapa vacío
    setNoLeidosPorInterlocutor({});
  };

  useEffect(() => {
    // Inicialización mínima: fijar 0 y sin intervalos para evitar parpadeos y peticiones
    establecerCantidadNoLeidas(0);
    setNoLeidosPorInterlocutor({});
  }, []);

  const valor = useMemo(() => ({ cantidadNoLeidas, establecerCantidadNoLeidas, refrescarCantidadNoLeidas, noLeidosPorInterlocutor, refrescarNoLeidosChat }), [cantidadNoLeidas, noLeidosPorInterlocutor]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
