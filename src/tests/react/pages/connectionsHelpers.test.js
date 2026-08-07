/* global describe, expect, it */

describe('connections phone/status helpers (migration #288)', () => {
  const formatPhoneLabel = phone => {
    if (!phone) return 'Nao informado';
    if (typeof phone === 'string') return phone;
    const ddd = String(phone?.ddd || '').trim();
    const digits = String(phone?.phone || '').replace(/\D/g, '');
    if (!ddd && !digits) return 'Nao informado';
    if (!digits) return `(${ddd})`;
    const lastFour = digits.slice(-4);
    const firstPart = digits.slice(0, -4);
    if (!firstPart) return ddd ? `(${ddd}) ${lastFour}` : lastFour;
    return ddd ? `(${ddd}) ${firstPart}-${lastFour}` : `${firstPart}-${lastFour}`;
  };

  const formatStatusLabel = status => {
    if (!status) return '—';
    if (typeof status === 'string') return status;
    return status?.status || status?.name || '—';
  };

  it('formats phone objects', () => {
    expect(formatPhoneLabel({ddd: '11', phone: '988887777'})).toBe('(11) 98888-7777');
  });

  it('handles missing phone', () => {
    expect(formatPhoneLabel(null)).toBe('Nao informado');
  });

  it('formats status objects', () => {
    expect(formatStatusLabel({status: 'connected'})).toBe('connected');
  });
});
