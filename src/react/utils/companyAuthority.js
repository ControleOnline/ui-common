const normalizeRole = value => String(value || '').trim().toLowerCase();

const normalizeRoles = values =>
  (Array.isArray(values) ? values : []).map(normalizeRole);

const hasCompanyAdministrativeLink = company => {
  const userFlags = company?.user || {};
  const permissions = normalizeRoles(company?.permission || company?.permissions);

  return Boolean(
    userFlags.owner_enabled ||
      userFlags.manager_enabled ||
      company?.owner_enabled ||
      company?.manager_enabled ||
      permissions.includes('owner') ||
      permissions.includes('manager'),
  );
};

export const isSuperAdmin = ({mainCompany, user} = {}) => {
  const roles = normalizeRoles(user?.roles);
  const mainPermissions = normalizeRoles(
    mainCompany?.permission || mainCompany?.permissions,
  );

  return Boolean(
    roles.includes('role_super') ||
      roles.includes('super') ||
      mainPermissions.includes('super') ||
      hasCompanyAdministrativeLink(mainCompany),
  );
};

export const canAdministerCompany = ({company, mainCompany, user} = {}) =>
  isSuperAdmin({mainCompany, user}) || hasCompanyAdministrativeLink(company);

