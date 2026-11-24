import { resolveClientPortfolioParams } from '@controleonline/ui-common/src/react/utils/clientPortfolioParams';

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

// Sellers only get their own portfolio; see clientPortfolioParams.js.
export const buildOwnedClientsParams = ({
  currentCompanyId,
  permissions,
  sellerPeopleId,
}) => resolveClientPortfolioParams({ currentCompanyId, permissions, sellerPeopleId });
