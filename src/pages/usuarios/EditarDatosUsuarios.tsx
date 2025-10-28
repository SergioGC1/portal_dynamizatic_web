import React, { useEffect, useState } from 'react';
import { InputSwitch } from 'primereact/inputswitch';
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
    <div style={{ maxWidth: 720 }}>
      <h3>{userId ? `Editar usuario ${user?.nombreUsuario || ''}` : 'Creando usuario'}</h3>
      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Nombre</label>
          <input value={user.nombreUsuario || ''} onChange={e => setUser(u => ({ ...u, nombreUsuario: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Email</label>
          <input value={user.email || ''} onChange={e => setUser(u => ({ ...u, email: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
          {fieldErrors.email && <div style={{ color: 'red', marginTop: 6 }}>{fieldErrors.email}</div>}
        </div>
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, minWidth: 80 }}>Activo</label>
          <InputSwitch
            checked={String(user.activoSn || '').toUpperCase() === 'S'}
            onChange={(e: any) => setUser(u => ({ ...u, activoSn: e.value ? 'S' : 'N' }))}
          />
        </div>
        {(!userId) && (
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Contraseña (mínimo 8 caracteres)</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
            {fieldErrors.password && <div style={{ color: 'red', marginTop: 6 }}>{fieldErrors.password}</div>}
          </div>
        )}
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Rol</label>
          <input value={user.rolId || ''} onChange={e => setUser(u => ({ ...u, rolId: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading} style={{ padding: '8px 12px', borderRadius: 6 }}>{userId ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </div>
  );
}
