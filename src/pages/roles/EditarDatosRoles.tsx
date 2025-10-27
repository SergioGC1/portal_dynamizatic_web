import React, { useEffect, useState } from 'react';
import RolesAPI from '../../api-endpoints/roles/index';

type Props = { rolId?: string };

type Rol = {
  id?: string | number;
  nombre?: string;
  activoSN?: string;
};

export default function EditarDatosRoles({ rolId }: Props) {
  const [loading, setLoading] = useState(false);
  const [rol, setRol] = useState<Rol>({ nombre: '', activoSN: 'N' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rolId) return;
    let mounted = true;
    setLoading(true);
    RolesAPI.getRoleById(rolId)
      .then((data) => { if (mounted) setRol(data || {}); })
      .catch((e) => { console.error(e); if (mounted) setError(e.message || 'Error cargando rol'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [rolId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const payload = { nombre: rol.nombre, activoSN: rol.activoSN };
      if (rolId) {
        await RolesAPI.updateRoleById(rolId, payload);
      } else {
        await RolesAPI.createRole(payload);
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
          <input value={rol.nombre || ''} onChange={e => setRol(r => ({ ...r, nombre: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Activo (S/N)</label>
          <input value={rol.activoSN || 'N'} onChange={e => setRol(r => ({ ...r, activoSN: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading} style={{ padding: '8px 12px', borderRadius: 6 }}>{rolId ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </div>
  );
}
