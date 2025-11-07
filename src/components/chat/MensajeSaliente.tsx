import React from 'react';

// Componente de burbuja para mensajes enviados (usuario actual)
// Incluye un indicador simple del estado del envío

type PropiedadesMensajeSaliente = {
  texto: string;
  horaTexto?: string; // Formato HH:mm
  estado?: 'enviando' | 'enviado' | 'leido';
};

export default function MensajeSaliente({ texto, horaTexto, estado }: PropiedadesMensajeSaliente) {
  const iconoEstado = estado === 'leido' ? '✅' : estado === 'enviado' ? '✔️' : '…';
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
      <div style={{ maxWidth: '70%', background: 'var(--outgoing-bg, #2563eb)', color: '#fff', padding: '8px 12px', borderRadius: 12, borderTopRightRadius: 2 }}>
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{texto}</div>
        {(horaTexto || estado) && (
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4, textAlign: 'right' }}>
            {horaTexto} {estado ? iconoEstado : ''}
          </div>
        )}
      </div>
    </div>
  );
}
