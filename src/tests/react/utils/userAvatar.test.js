import {
  getAvatarDisplayName,
  getGravatarUrl,
  getUserInitials,
  resolveUserAvatarUrl,
  resolveUserPeopleIri,
} from '../../../react/utils/userAvatar';

describe('userAvatar', () => {
  it('uses the first and last names for two initials', () => {
    expect(getUserInitials({name: 'Alexandre AleMac Cunha'})).toBe('AC');
  });

  it('uses one initial for a single name', () => {
    expect(getUserInitials({name: 'Alexandre'})).toBe('A');
  });

  it('falls back to the email initial when the name is unavailable', () => {
    expect(getUserInitials({email: 'claudio@example.com'})).toBe('C');
  });

  it('asks Gravatar for a real image without an identicon fallback', () => {
    expect(getGravatarUrl(' MyEmailAddress@example.com ', 120)).toBe(
      'https://www.gravatar.com/avatar/0bc83cb571cd1c50ba6f3e8a78ef1346?s=120&d=404',
    );
  });

  it('does not call Gravatar without an email', () => {
    expect(getGravatarUrl('')).toBe('');
  });

  it('uses the complete person name and never the functional alias', () => {
    const user = {name: 'Claudio Medeiros', realname: 'Claudio Owner', alias: 'owner'};

    expect(getAvatarDisplayName(user)).toBe('Claudio Medeiros');
    expect(getUserInitials({name: getAvatarDisplayName(user)})).toBe('CM');
  });

  it('resolves the person from the same stored session shape used by Profile', () => {
    expect(
      resolveUserPeopleIri({id: 131}, {people: '/people/14'}),
    ).toBe('/people/14');
  });

  it('resolves only the canonical persisted avatar', () => {
    const user = {avatar: {id: 42}};

    expect(
      resolveUserAvatarUrl(user, avatar =>
        avatar?.id ? `https://api.example/files/${avatar.id}/download` : '',
      ),
    ).toBe('https://api.example/files/42/download');
  });

  it('does not treat avatarUrl as an avatar source', () => {
    expect(
      resolveUserAvatarUrl(
        {avatarUrl: 'https://legacy.example/avatar.png'},
        () => '',
      ),
    ).toBe('');
  });
});
