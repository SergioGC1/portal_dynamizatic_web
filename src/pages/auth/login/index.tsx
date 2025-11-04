import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useJwt from '../../../hooks/useJwt';

export default function LoginPage() {
  const { login } = useAuth();
  const { signIn } = useJwt();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e?.preventDefault();
    setServerError(null)
    setFieldErrors({})
    // Validación cliente rápida
    const errors: Record<string, string> = {}
    if (!email || !String(email).trim()) errors.email = 'El email es obligatorio'
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(String(email))) errors.email = 'Introduce un email válido'
    }
    if (!password) errors.password = 'La contraseña es obligatoria'
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }
    setLoading(true);
    try {
      console.log('DEBUG: handleSubmit called with', { email, password });
      const resp = await signIn({ email, password });
      
      // Verificar si el usuario está activo antes de permitir el login
      const usuario = resp?.user || resp;
      if (usuario && usuario.activoSn !== 'S') {
        setServerError('Tu cuenta no está activa.\nContacta al administrador para activarla.');
        setLoading(false);
        return;
      }
      
      login(resp);
      navigate('/');
    } catch (err: any) {
      console.error('Login error (detected)', err);
      setLoading(false);

      // Obtener body preferido del adaptador o el mensaje crudo
      const serverData = err?.body || err?.response?.data || err?.response || err?.message || '';
      const text = typeof serverData === 'string' ? serverData : JSON.stringify(serverData || '');
      const lower = text.toLowerCase();

      // Heurística simple y directa: si el backend indica "request body is invalid"
      // asumimos que la validación de contraseña falló (caso común) y mostramos error en el campo
      if (lower.includes('request body is invalid') || lower.includes('the request body is invalid') || lower.includes('see error object')) {
        setFieldErrors({ password: 'La contraseña debe tener al menos 8 caracteres' });
        //setServerError('Corrige los errores del formulario');
        return;
      }

      // Si hay un array de detalles, mapearlos (simplemente) a fieldErrors
      const details = serverData?.error?.details || serverData?.details || [];
      if (Array.isArray(details) && details.length) {
        const fErrors: Record<string, string> = {};
        for (const d of details) {
          const path = (d.path || d.context?.key || '').toString().replace(/^\//, '') || 'password';
          if (d.code === 'minLength' || (d.message && d.message.toLowerCase().includes('fewer than'))) {
            fErrors.password = 'La contraseña debe tener al menos 8 caracteres';
          } else if (d.message) {
            const key = (path === 'nombreUsuario' ? 'email' : path);
            fErrors[key] = d.message;
          }
        }
        setFieldErrors(fErrors);
        setServerError('Corrige los errores del formulario');
        return;
      }

      // Fallback corto y claro
      setServerError('Email o contraseña incorrectos');
    }
  };

  const handleForgot = () => {
    console.log('EN PROCESO');
  };

  const dark = false; // keep same fallback used in register

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1600 800"
        className="fixed left-0 top-0 min-h-screen min-w-screen"
        preserveAspectRatio="none"
      >
        <rect
          fill={dark ? "var(--primary-900)" : "var(--primary-500)"}
          width="1600"
          height="800"
        />
        <path
          fill={dark ? "var(--primary-800)" : "var(--primary-400)"}
          d="M478.4 581c3.2 0.8 6.4 1.7 9.5 2.5c196.2 52.5 388.7 133.5 593.5 176.6c174.2 36.6 349.5 29.2 518.6-10.2V0H0v574.9c52.3-17.6 106.5-27.7 161.1-30.9C268.4 537.4 375.7 554.2 478.4 581z"
        />
        <path
          fill={dark ? "var(--primary-700)" : "var(--primary-300)"}
          d="M181.8 259.4c98.2 6 191.9 35.2 281.3 72.1c2.8 1.1 5.5 2.3 8.3 3.4c171 71.6 342.7 158.5 531.3 207.7c198.8 51.8 403.4 40.8 597.3-14.8V0H0v283.2C59 263.6 120.6 255.7 181.8 259.4z"
        />
        <path
          fill={dark ? "var(--primary-600)" : "var(--primary-200)"}
          d="M454.9 86.3C600.7 177 751.6 269.3 924.1 325c208.6 67.4 431.3 60.8 637.9-5.3c12.8-4.1 25.4-8.4 38.1-12.9V0H288.1c56 21.3 108.7 50.6 159.7 82C450.2 83.4 452.5 84.9 454.9 86.3z"
        />
        <path
          fill={dark ? "var(--primary-500)" : "var(--primary-100)"}
          d="M1397.5 154.8c47.2-10.6 93.6-25.3 138.6-43.8c21.7-8.9 43-18.8 63.9-29.5V0H643.4c62.9 41.7 129.7 78.2 202.1 107.4C1020.4 178.1 1214.2 196.1 1397.5 154.8z"
        />
      </svg>
      <div className="px-5 min-h-screen flex justify-content-center align-items-center">
        <div className="border-1 surface-border surface-card border-round py-7 px-4 md:px-7 z-1">
          <div className="mb-4">
            <div className="text-900 text-xl font-bold mb-2">Iniciar sesión</div>
            <span className="text-600 font-medium">Introduce tus credenciales</span>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-column">
            <span className="p-input-icon-left w-full mb-4">
              <i className="pi pi-envelope"></i>
              <InputText id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full md:w-25rem" placeholder="Email" style={fieldErrors.email ? { border: '1px solid red' } : undefined} />
            </span>
            {fieldErrors.email && <div style={{ color: 'red', fontSize: 13, marginTop: -8, marginBottom: 8 }}>{fieldErrors.email}</div>}
            <span className="p-input-icon-left w-full mb-4">
              <i className="pi pi-lock z-2"></i>
              <Password id="password" value={password} onChange={(e: any) => setPassword(e.target.value)} feedback={false} className="w-full" inputClassName={fieldErrors.password ? 'w-full md:w-25rem p-password-error' : 'w-full md:w-25rem'} placeholder="Contraseña" toggleMask inputStyle={{ paddingLeft: '2.5rem', ...(fieldErrors.password ? { border: '1px solid red' } : {}) }} />
            </span>
            {fieldErrors.password && <div style={{ color: 'red', fontSize: 13, marginTop: -8, marginBottom: 8 }}>{fieldErrors.password}</div>}
            <div className="mb-4 flex align-items-center justify-content-between">
              <Button label={loading ? 'Ingresando...' : 'Ingresar'} type="submit" className="p-button-primary" disabled={loading} />
              <Button label="Olvidé mi contraseña" type="button" className="p-button-text" onClick={handleForgot} />
            </div>
            {serverError && <div style={{ color: 'red', marginBottom: 8, whiteSpace: 'pre-line' }}>{serverError}</div>}
            {/* Registro deshabilitado: la funcionalidad de self-register se ha eliminado según especificación */}
          </form>
        </div>
      </div>
    </>
  );
}
