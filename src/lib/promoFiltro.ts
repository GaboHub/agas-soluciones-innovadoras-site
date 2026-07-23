export function filtrarPromosVencidas(root: ParentNode): void {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());

  root.querySelectorAll<HTMLElement>('[data-promo]').forEach((tarjeta) => {
    const desde = tarjeta.dataset.promoDesde ?? '';
    const hasta = tarjeta.dataset.promoHasta ?? '';
    if (hoy > hasta) {
      tarjeta.remove();
      return;
    }
    const badge = tarjeta.querySelector<HTMLElement>('[data-promo-badge]');
    if (badge) badge.textContent = hoy < desde ? 'Próximamente' : 'Vigente';
  });
}
