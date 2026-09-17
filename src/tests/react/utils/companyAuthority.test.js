import {describe, expect, it} from '@jest/globals';
import {
  canAdministerCompany,
  isSuperAdmin,
} from '../../../react/utils/companyAuthority';

describe('companyAuthority', () => {
  it.each(['owner', 'manager'])(
    'treats %s of the main company as superadmin',
    permission => {
      const mainCompany = {permissions: [permission]};

      expect(isSuperAdmin({mainCompany})).toBe(true);
      expect(
        canAdministerCompany({company: {permissions: []}, mainCompany}),
      ).toBe(true);
    },
  );

  it.each(['owner', 'manager'])(
    'treats %s of the current company as local admin',
    permission => {
      expect(
        canAdministerCompany({
          company: {permission: [permission]},
          mainCompany: {permissions: []},
        }),
      ).toBe(true);
    },
  );

  it.each(['director', 'employee'])(
    'does not treat %s as administrative authority',
    permission => {
      expect(
        canAdministerCompany({
          company: {permission: [permission]},
          mainCompany: {permissions: []},
        }),
      ).toBe(false);
    },
  );

  it('honors the global ROLE_SUPER resolved by the API', () => {
    expect(
      canAdministerCompany({
        company: {permissions: []},
        mainCompany: {permissions: []},
        user: {roles: ['ROLE_SUPER']},
      }),
    ).toBe(true);
  });
});
