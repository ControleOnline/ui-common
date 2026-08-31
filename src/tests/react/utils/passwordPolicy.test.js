import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MSG_COMPROMISED,
  PASSWORD_MSG_MIN_LENGTH,
  mapPasswordErrorMessage,
  validatePasswordClient,
} from '../../../react/utils/passwordPolicy';

describe('passwordPolicy', () => {
  it('rejects short password with explicit min length', () => {
    expect(validatePasswordClient('123')).toBe(PASSWORD_MSG_MIN_LENGTH);
  });

  it('accepts password meeting min length', () => {
    expect(validatePasswordClient('abcdef')).toBeNull();
  });

  it('maps english breach message to portuguese', () => {
    const raw =
      'This password has been leaked in a data breach, it must not be used. Please use another password.';
    expect(mapPasswordErrorMessage(raw)).toBe(PASSWORD_MSG_COMPROMISED);
  });

  it('exposes policy min length constant', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(6);
  });
});
