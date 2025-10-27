import React, { useEffect, useState } from 'react';
import UsuariosAPI from '../../api-endpoints/usuarios/index';

type Props = { userId?: string };

type User = {
  id?: string | number;
  nombre?: string;
  email?: string;
  rol?: string;
};

export default function EditarDatosUsuarios({ userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User>({ nombre: '', email: '', rol: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let componenteMontado = true; // componenteMontado indica si el componente sigue montado.
    // Se usa para evitar actualizar el estado (setState) después de que el componente se haya desmontado.
    setLoading(true);
    UsuariosAPI.getUsuarioById(userId)
      .then((data) => { if (componenteMontado) setUser(data || {}); })
      .catch((e) => { console.error(e); if (componenteMontado) setError(e.message || 'Error cargando usuario'); })
      .finally(() => { if (componenteMontado) setLoading(false); });
    return () => { componenteMontado = false; };
  }, [userId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
      try {
      setLoading(true);
      const payload = { nombre: user.nombre, email: user.email, rol: user.rol };
      if (userId) {
        await UsuariosAPI.updateUsuarioById(userId, payload);
      } else {
        await UsuariosAPI.createUsuario(payload);
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
      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Nombre</label>
          <input value={user.nombre || ''} onChange={e => setUser(u => ({ ...u, nombre: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Email</label>
          <input value={user.email || ''} onChange={e => setUser(u => ({ ...u, email: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Rol</label>
          <input value={user.rol || ''} onChange={e => setUser(u => ({ ...u, rol: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading} style={{ padding: '8px 12px', borderRadius: 6 }}>{userId ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </div>
  );
}
