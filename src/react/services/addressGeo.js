import {api} from '@controleonline/ui-common/src/api';

const onlyDigits = value => String(value || '').replace(/\D+/g, '');

export async function lookupPostalCode(cep) {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos');
  }
  return api.fetch(`postal-codes/${digits}`, {method: 'GET'});
}

export async function listCountries(q = '') {
  const params = q ? {q} : {};
  const data = await api.fetch('address-geo/countries', {method: 'GET', params});
  return Array.isArray(data?.member) ? data.member : [];
}

export async function listStates(country = 'BR') {
  const data = await api.fetch('address-geo/states', {
    method: 'GET',
    params: {country},
  });
  return Array.isArray(data?.member) ? data.member : [];
}

export function buildAddressSavePayload(form, peopleIri) {
  return {
    street: form.street || '',
    city: form.city || '',
    district: form.district || '',
    state: form.uf || form.state || '',
    country: form.countryCode || form.country || 'BR',
    people: peopleIri,
    number: form.number ?? '',
    complement: form.complement || '',
    nickname: form.nickname || '',
    cep: onlyDigits(form.cep),
    latitude: form.latitude ?? 0,
    longitude: form.longitude ?? 0,
  };
}
