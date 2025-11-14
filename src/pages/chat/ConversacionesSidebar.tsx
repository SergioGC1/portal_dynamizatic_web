import React, { useCallback } from 'react';
import { UsuarioChat } from '../../servicios/chat/ServicioChat';
import { Avatar } from 'primereact/avatar';

type Props = {
  usuarios: UsuarioChat[];
  interlocutores: string[];
  seleccionado: string | null;
  onSeleccionar: (id: string) => void;
};

export default function ConversacionesSidebar({ usuarios, interlocutores, seleccionado, onSeleccionar }: Props) {
  const apiBase = (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) || 'http://127.0.0.1:3000';
  const construirSrc = useCallback((p?: string | null) => {
    if (!p) return null;
    const s = String(p);
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    if (s.startsWith('/')) return `${apiBase}${s}`;
    return `${apiBase}/${s}`;
  }, [apiBase]);

  return (
    <div style={{ width: 260, borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: 8 }}>
      <h3 style={{ marginTop: 0 }}>Conversaciones</h3>
      {interlocutores.map(id => {
        const u = usuarios.find(x => String(x.id) === String(id));
        const avatarRaw = u?.imagen || (u as any)?.urlAvatar || undefined;
        const url = construirSrc(avatarRaw);
        const isActive = seleccionado === id;
        return (
          <div
            key={id}
            onClick={() => onSeleccionar(id)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 6, background: isActive ? 'var(--selected-bg, #2563eb)' : 'transparent', color: isActive ? '#fff' : 'inherit' }}
          >
            {url ? (
              <Avatar image={url as any} size="large" shape="circle" />
            ) : (
              <Avatar label={(u?.nombre || 'U').slice(0, 1).toUpperCase()} size="large" shape="circle" />
            )}
            <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{u?.nombre || id}</div>
          </div>
        );
      })}
    </div>
  );
}
