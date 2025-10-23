import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useJwt from '../hooks/useJwt';

export default function MainPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { getUsuarioById, getUsuarios, getProductoById } = useJwt(); //testeo

  React.useEffect(() => {
    console.debug('MainPage mounted', { user });
  }, [user]);

  const handleTestGetUsuarios = async () => {
    try {
      console.log('MainPage getUsuarios invoked');
      const data = await getUsuarioById('2'); //testeo
      console.log('MainPage getUsuarios result:', data);
    } catch (err) {
      console.error('MainPage getUsuarios error (capturado):', err);
      return err;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="p-4">
      <div className="p-d-flex p-jc-between p-ai-center">
        <div>
          <h1>Dashboard Dynamizatic</h1>
        </div>
        <div>
          {user && (
            <button type="button" className="p-button p-button-danger" onClick={handleLogout}>
              Cerrar sesión
            </button>
          )}
          <button type="button" className="p-button p-button-secondary ml-2" onClick={handleTestGetUsuarios}>
            Probar getUsuarios
          </button>
        </div>
      </div>
    </div>
  );
}
