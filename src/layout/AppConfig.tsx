import React from 'react';

export default function AppConfig({ minimal }: { minimal?: boolean }) {
  // Stub: muestra un elemento si no es minimal
  if (minimal) return null;
  return <div id="app-config">AppConfig (stub)</div>;
}
