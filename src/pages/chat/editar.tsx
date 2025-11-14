import React, { useCallback } from 'react';
import { UsuarioChat } from '../../servicios/chat/ServicioChat';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';

type Props = {
  usuarios: UsuarioChat[];
  idUsuarioActual?: string;
  interlocutoresConConversacion: string[];
  onSeleccionar: (usuarioId: string) => void;
  onCerrar: () => void;
};

// Selector de usuarios para iniciar una nueva conversación
export default function Editar({ usuarios, idUsuarioActual, interlocutoresConConversacion, onSeleccionar, onCerrar }: Props) {
  const apiBase = (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) || 'http://127.0.0.1:3000';
  const construirSrc = useCallback((p?: string | null) => {
    if (!p) return null;
    const s = String(p);
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    if (s.startsWith('/')) return `${apiBase}${s}`;
    return `${apiBase}/${s}`;
  }, [apiBase]);

  const disponibles = usuarios
    .filter(u => String(u.id) !== String(idUsuarioActual))
    .filter(u => !interlocutoresConConversacion.includes(String(u.id)));

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Selecciona un usuario</h3>
      {disponibles.map(u => {
        const src = construirSrc((u.imagen || (u as any).urlAvatar) as any) || undefined;
        return (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {src ? (
                <Avatar image={src as any} size="large" shape="circle" />
              ) : (
                <Avatar label={(u.nombre || 'U').slice(0, 1).toUpperCase()} size="large" shape="circle" />
              )}
              <span>{u.nombre || u.id}</span>
            </div>
            <Button label="Chatear" icon="pi pi-comments" onClick={() => onSeleccionar(u.id)} />
          </div>
        );
      })}
      <div style={{ textAlign: 'right', marginTop: 12 }}>
        <Button label="Cerrar" severity="secondary" onClick={onCerrar} outlined />
      </div>
    </div>
  );
}
