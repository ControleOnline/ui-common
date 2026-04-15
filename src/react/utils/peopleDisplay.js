const normalizeText = value => String(value || '').trim();

const normalizeEntityId = value => String(value || '').replace(/\D/g, '');

export const getPeopleDisplayName = person => {
  if (!person || typeof person !== 'object') {
    return '';
  }

  const companyLabel = normalizeText(
    person?.alias ||
      person?.fantasy_name ||
      person?.nickname,
  );
  const responsibleLabel = normalizeText(
    person?.name ||
      person?.realname,
  );

  if (companyLabel && responsibleLabel && companyLabel !== responsibleLabel) {
    return `${companyLabel} - ${responsibleLabel}`;
  }

  return responsibleLabel || companyLabel;
};

export const buildOwnedClientsParams = ({
  currentCompanyId,
  itemsPerPage = 100,
}) => {
  const ownerId = normalizeEntityId(currentCompanyId);
  if (!ownerId) {
    return null;
  }

  return {
    'link.company': `/people/${ownerId}`,
    'link.linkType': 'client',
    itemsPerPage,
  };
};
