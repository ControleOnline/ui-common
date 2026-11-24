// Which clients a user may pick when creating proposals/contracts.
// Mirrors the backend contract security filter (ContractService::securityFilter):
// owners/managers of the company see every client; a seller only sees the
// clients of his own portfolio (PeopleLink linkType "sellers-client", whose
// company is the seller). Offering other clients would create a document the
// seller cannot open afterwards.

const MANAGEMENT_PERMISSIONS = ['owner', 'manager'];

const normalizeEntityId = value => String(value ?? '').replace(/\D/g, '');

const normalizePermissions = permissions =>
  (Array.isArray(permissions) ? permissions : [permissions])
    .map(permission => String(permission || '').trim().toLowerCase())
    .filter(Boolean);

const resolveClientPortfolioParams = ({ currentCompanyId, permissions, sellerPeopleId } = {}) => {
  const companyId = normalizeEntityId(currentCompanyId);
  if (!companyId) {
    return null;
  }

  const normalized = normalizePermissions(permissions);
  const manages = normalized.some(permission => MANAGEMENT_PERMISSIONS.includes(permission));
  const sellerId = normalizeEntityId(sellerPeopleId);

  if (!manages && normalized.includes('salesman') && sellerId) {
    return {
      'link.company': `/people/${sellerId}`,
      'link.linkType': 'sellers-client',
    };
  }

  return {
    'link.company': `/people/${companyId}`,
    'link.linkType': 'client',
  };
};

module.exports = {
  resolveClientPortfolioParams,
};
