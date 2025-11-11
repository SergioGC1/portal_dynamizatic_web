import React, { useEffect, useState } from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import UsuariosAPI from '../../api-endpoints/usuarios/index';

type Props = { userId?: string };

type User = {
  id?: string | number;
  nombreUsuario?: string;
  email?: string;
  rolId?: string;
  activoSn?: string;
};

export default function EditarDatosUsuarios({ userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User>({ nombreUsuario: '', email: '', rolId: '', activoSn: '' });
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});

  useEffect(() => {
    if (!userId) return;
    let componenteMontado = true; // componenteMontado indica si el componente sigue montado.
    // Se usa para evitar actualizar el estado (setState) después de que el componente se haya desmontado.
    setLoading(true);
    UsuariosAPI.getUsuarioById(userId)
      .then((data) => {
        if (!componenteMontado) return;
        // Normalizar propiedades que el backend pueda devolver con distintas keys
        const nombreUsuario = data?.nombreUsuario ?? data?.nombre ?? data?.username ?? '';
        const email = data?.email ?? '';
        const rolId = data?.rolId ?? data?.rol ?? '';
        const activo = data?.activoSn ?? data?.activoSN ?? data?.activo ?? '';
        setUser({ ...data, nombreUsuario, email, rolId, activoSn: activo });
      })
      .catch((e) => { console.error(e); if (componenteMontado) setError(e.message || 'Error cargando usuario'); })
      .finally(() => { if (componenteMontado) setLoading(false); });
    return () => { componenteMontado = false; };
  }, [userId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validaciones en cliente
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(String(user.email || ''))) {
      setFieldErrors({ ...fieldErrors, email: 'Email inválido' })
      return
    }

    const creating = !userId
    if (creating) {
      if (!password || password.length < 8) {
        setFieldErrors({ ...fieldErrors, password: 'La contraseña debe tener al menos 8 caracteres' })
        return
      }
    }
      try {
      setLoading(true);
      // Construir payload según modo:
      // - En creación usamos el endpoint de registro que acepta contraseña y el campo `nombreUsuario`.
      if (creating) {
        const payload = { nombreUsuario: user.nombreUsuario, email: user.email, password }
        // `register` mapea a POST /usuarios/register en el adaptador
        await UsuariosAPI.register(payload);
      } else {
        // En edición llamamos al endpoint de update: enviar las propiedades que acepta el backend
        // Evitamos enviar claves no permitidas ('nombre' o 'rol') que producen VALIDATION_FAILED (additionalProperties)
        const payload: any = {
          nombreUsuario: user.nombreUsuario,
          email: user.email,
        };
        if (user.rolId) payload.rolId = user.rolId;
        if (user.activoSn) payload.activoSn = user.activoSn;
        await UsuariosAPI.updateUsuarioById(userId!, payload);
      }
      alert('Guardado correctamente');
    } catch (err: any) {
      console.error(err);
      setError(err?.data?.message || err?.message || 'Error guardando');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-container" style={{ maxWidth: 720 }}>
      <h3>{userId ? `Editar usuario ${user?.nombreUsuario || ''}` : 'Creando usuario'}</h3>
      {loading && <div>Cargando...</div>}
      {error && <div className="texto-error">{error}</div>}
      <form onSubmit={handleSave}>
        <div className="form-row">
          <label style={{ fontWeight: 'normal' }}>Nombre</label>
          <InputText value={user.nombreUsuario || ''} onChange={(e) => setUser(u => ({ ...u, nombreUsuario: e.target.value }))} className={`w-full ${fieldErrors.nombreUsuario ? 'p-invalid' : ''}`} />
        </div>
        <div className="form-row">
          <label style={{ fontWeight: 'normal' }}>Email</label>
          <InputText value={user.email || ''} onChange={(e) => setUser(u => ({ ...u, email: e.target.value }))} className={`w-full ${fieldErrors.email ? 'p-invalid' : ''}`} />
          {fieldErrors.email && <div className="texto-error" style={{ marginTop: 6 }}>{fieldErrors.email}</div>}
        </div>
        <div className="form-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ minWidth: 80 }}>Activo</label>
          <InputSwitch
            checked={String(user.activoSn || '').toUpperCase() === 'S'}
            onChange={(e: any) => setUser(u => ({ ...u, activoSn: e.value ? 'S' : 'N' }))}
          />
        </div>
        {(!userId) && (
          <div className="form-row">
            <label style={{ fontWeight: 'normal' }}>Contraseña (mínimo 8 caracteres)</label>
            <Password value={password} onChange={(e) => setPassword(e.target.value)} feedback={false} toggleMask className={`w-full ${fieldErrors.password ? 'p-invalid' : ''}`} />
            {fieldErrors.password && <div className="texto-error" style={{ marginTop: 6 }}>{fieldErrors.password}</div>}
          </div>
        )}
        <div className="form-row">
          <label style={{ fontWeight: 'normal' }}>Rol</label>
          <InputText value={user.rolId || ''} onChange={(e) => setUser(u => ({ ...u, rolId: e.target.value }))} className={`w-full ${fieldErrors.rolId ? 'p-invalid' : ''}`} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="submit" label={userId ? 'Guardar' : 'Crear'} disabled={loading} />
        </div>
      </form>
    </div>
  );
}
