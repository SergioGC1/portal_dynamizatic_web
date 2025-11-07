import React from 'react';

// Componente de burbuja para mensajes recibidos (interlocutor)
// Props usan nombres descriptivos en español

type PropiedadesMensajeEntrante = {
  texto: string;
  horaTexto?: string; // Formato HH:mm
  urlAvatar?: string | null;
};

export default function MensajeEntrante({ texto, horaTexto, urlAvatar }: PropiedadesMensajeEntrante) {
  return (
    <div style={{ display: 'flex', marginBottom: 8, alignItems: 'flex-end' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: '#eee', marginRight: 8 }}>
        {urlAvatar ? (
          <img src={urlAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
      </div>
      <div style={{ maxWidth: '70%', background: 'var(--incoming-bg, #f3f4f6)', color: 'var(--incoming-text, #111827)', padding: '8px 12px', borderRadius: 12, borderTopLeftRadius: 2 }}>
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{texto}</div>
        {horaTexto && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>{horaTexto}</div>}
      </div>
    </div>
  );
}
