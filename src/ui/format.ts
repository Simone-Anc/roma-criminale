/** Valori monetari interni in migliaia di euro. */
export function money(k: number): string {
  const sign = k < 0 ? '−' : '';
  const abs = Math.abs(k);
  if (abs >= 1000) return `${sign}€ ${(abs / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} mln`;
  return `${sign}€ ${Math.round(abs)}k`;
}

export function signedMoney(k: number): string {
  return (k >= 0 ? '+' : '') + money(k);
}

export function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r).toLocaleString('it-IT');
}

/** Stima qualitativa del denaro di un rivale. */
export function wealthLabel(k: number): string {
  if (k < 100) return 'Basso';
  if (k < 250) return 'Medio';
  if (k < 500) return 'Alto';
  return 'Molto alto';
}
