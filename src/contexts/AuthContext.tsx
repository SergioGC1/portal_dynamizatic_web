import React, { createContext, useState, useContext, useEffect } from 'react';

// Tipo básico del usuario; puedes ampliarlo con id, roles, expiresAt, etc.
type User = {
  email?: string;
  token?: string;
};

type AuthContextType = {
  user: User | null;
  login: (data: any) => void;
  logout: () => void;
  register: (data: any) => void;
};

//Esto es evitar tener que definir funciones opcionales en el contexto
// Esto evita que TypeScript se queje de que las funciones
// podrían ser undefined al usarlas en otros componentes.
const sinOperacion = (d?: any) => {};
export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: sinOperacion,
  register: sinOperacion,
  logout: sinOperacion
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Intentamos restaurar la sesión desde localStorage al montar el provider
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('accessToken');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else if (accessToken) {
        setUser({ token: accessToken });
      }
    } catch (e) {
      console.error('Error restaurando sesión desde localStorage', e);
    }
  }, []);

  console.log('AuthProvider inicializado (AuthContext)');

  // Guarda tokens y, si viene, la información de usuario en localStorage
  const persistirTokensDesdeData = (data: any) => {
    try {
      if (!data) return;
      const access = data.accessToken || data.token || data.access_token;
      const refresh = data.refreshToken || data.refresh_token;
      if (access) localStorage.setItem('accessToken', access);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      // Si el objeto data contiene información de usuario, la guardamos
      try {
        localStorage.setItem('user', JSON.stringify(data));
      } catch (_) {
        // ignoramos errores al serializar
      }
    } catch (e) {
      console.error('Error guardando tokens en localStorage', e);
    }
  };

  const login = (data: any) => {
    setUser(data);
    persistirTokensDesdeData(data);
  };

  const register = (data: any) => {
    setUser(data);
    persistirTokensDesdeData(data);
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch (e) {
      console.error('Error borrando tokens al cerrar sesión', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

export const useAuth = () => useContext(AuthContext);
