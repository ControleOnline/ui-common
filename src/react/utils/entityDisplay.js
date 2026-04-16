const pickFirstText = (...values) => {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) {
      return normalized;
    }
  }

  return '';
};

export const normalizeText = value => {
  if (value === null || value === undefined) return '';

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  ) {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeText(item);
      if (normalized) return normalized;
    }
    return '';
  }

  if (typeof value === 'object') {
    const street = String(
      value?.street_name ||
      value?.streetName ||
      value?.street ||
      value?.logradouro ||
      '',
    ).trim();
    const number = String(
      value?.street_number ||
      value?.streetNumber ||
      value?.number ||
      value?.house_number ||
      '',
    ).trim();
    const streetLine = [street, number].filter(Boolean).join(', ');

    const candidates = [
      value?.display,
      value?.formattedAddress,
      value?.formatted_address,
      value?.formatted,
      value?.address,
      value?.poi_address,
      value?.value,
      value?.description,
      streetLine,
      value?.district,
      value?.city,
      value?.name,
      value?.reference,
      value?.complement,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeText(candidate);
      if (normalized) return normalized;
    }
  }

  return '';
};

export const formatHumanLabel = value => {
  const normalized = normalizeText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return '';
  }

  return normalized.replace(/\b\w/g, char => char.toUpperCase());
};

export const formatPhoneDisplay = phoneEntry => {
  if (!phoneEntry) return '';

  if (typeof phoneEntry === 'string' || typeof phoneEntry === 'number') {
    return normalizeText(phoneEntry);
  }

  const ddi = normalizeText(phoneEntry?.ddi);
  const ddd = normalizeText(phoneEntry?.ddd);
  const phone = normalizeText(phoneEntry?.phone);

  if (!phone) return '';

  return [ddi ? `+${ddi}` : '', ddd ? `(${ddd})` : '', phone]
    .filter(Boolean)
    .join(' ')
    .trim();
};

export const resolveAddressDisplayParts = address => {
  const streetName = normalizeText(address?.street?.street);
  const streetNumber = normalizeText(address?.number);
  const nickname = normalizeText(address?.nickname);
  const complement = normalizeText(address?.complement);
  const district = normalizeText(address?.street?.district?.district);
  const city = normalizeText(address?.street?.district?.city?.city);
  const state = normalizeText(
    address?.street?.district?.city?.state?.uf ||
    address?.street?.district?.city?.state?.state,
  );
  const postalCode = normalizeText(address?.street?.cep?.cep);

  return {
    primary: pickFirstText(
      [streetName, streetNumber].filter(Boolean).join(', '),
      streetName,
      nickname,
    ),
    secondary: [district, [city, state].filter(Boolean).join(' / ')].filter(Boolean).join(' • '),
    streetLine: [streetName, streetNumber].filter(Boolean).join(', '),
    district,
    cityStateLine: [city, state].filter(Boolean).join(' / '),
    postalCode,
    complement,
    nickname,
  };
};

export const buildAddressOptionSummary = address => {
  const addressParts = resolveAddressDisplayParts(address);

  return {
    primary: pickFirstText(
      addressParts.primary,
      addressParts.streetLine,
      addressParts.nickname,
    ),
    secondary: pickFirstText(
      addressParts.secondary,
      addressParts.postalCode,
      addressParts.complement,
    ),
  };
};

export const buildCustomerSearchMeta = customer => {
  const phone = pickFirstText(
    Array.isArray(customer?.phone)
      ? customer.phone.map(formatPhoneDisplay).find(Boolean)
      : formatPhoneDisplay(customer?.phone),
  );
  const email = pickFirstText(
    Array.isArray(customer?.email)
      ? customer.email.map(item => normalizeText(item?.email)).find(Boolean)
      : normalizeText(customer?.email?.email || customer?.email),
  );
  const document = pickFirstText(
    Array.isArray(customer?.document)
      ? customer.document.map(item => normalizeText(item?.document)).find(Boolean)
      : normalizeText(customer?.document?.document || customer?.document),
  );
  const address = pickFirstText(
    Array.isArray(customer?.address)
      ? customer.address
        .map(item => {
          const summary = buildAddressOptionSummary(item);

          return pickFirstText(
            item?.search_for,
            summary.primary,
            summary.secondary,
          );
        })
        .find(Boolean)
      : '',
  );

  return [phone, email, document, address].filter(Boolean).join(' • ');
};

export const normalizePostalCodeInput = value =>
  String(value ?? '')
    .replace(/\D+/g, '')
    .slice(0, 8);

export const createEmptyAddressForm = (overrides = {}) => ({
  nickname: '',
  cep: '',
  street: '',
  number: '',
  district: '',
  city: '',
  state: '',
  country: 'Brasil',
  complement: '',
  ...overrides,
});
