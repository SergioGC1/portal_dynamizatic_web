import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// ProtectedRoute: componente envoltorio que protege rutas que requieren
// autenticación. Si no hay usuario autenticado (según `useAuth()`),
// redirige al login. Si existe usuario, renderiza los children.
//
// Nota: usamos `useAuth()` para leer el estado de sesión. Para redirigir
// de vuelta a la ruta original después del login, se podría pasar
// `state={{ from: location }}` al `<Navigate />` y usar `location.state.from`
// en la página de login.

type Props = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
