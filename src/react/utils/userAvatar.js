import md5 from 'md5';

const normalizeText = value => String(value || '').replace(/\s+/g, ' ').trim();

const extractNumericId = value => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '';
  }

  if (/^\d+$/.test(normalized)) {
    return normalized;
  }

  const match = normalized.match(/\/(\d+)(?:\/)?$/);
  return match ? match[1] : '';
};

export const getAvatarDisplayName = user =>
  normalizeText(
    user?.name ||
      user?.people?.name ||
      user?.person?.name ||
      user?.realname ||
      user?.username,
  );

export const resolveUserAvatarUrl = (user, resolvePersistedAvatar) => {
  return (
    typeof resolvePersistedAvatar === 'function'
      ? normalizeText(resolvePersistedAvatar(user?.avatar))
      : ''
  );
};

export const resolveUserPeopleIri = (user, session = {}) => {
  const candidates = [
    session?.people,
    session?.person,
    session?.peopleId,
    session?.people_id,
    user?.people?.['@id'],
    user?.people?.id,
    user?.people,
    user?.person?.['@id'],
    user?.person?.id,
    user?.person,
    user?.peopleId,
    user?.people_id,
    user?.person_id,
    user?.['@id'],
    user?.id,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (!normalized) {
      continue;
    }

    if (normalized.includes('/people/')) {
      return normalized;
    }

    const id = extractNumericId(normalized);
    if (id) {
      return `/people/${id}`;
    }
  }

  return '';
};

export const getUserInitials = ({name, email} = {}) => {
  const words = normalizeText(name).split(' ').filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }

  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }

  const normalizedEmail = normalizeText(email);
  return normalizedEmail ? normalizedEmail[0].toUpperCase() : '?';
};

export const getGravatarUrl = (email, size = 200) => {
  const normalizedEmail = normalizeText(email).toLowerCase();
  if (!normalizedEmail) {
    return '';
  }

  return `https://www.gravatar.com/avatar/${md5(normalizedEmail)}?s=${size}&d=404`;
};

export default {
  getAvatarDisplayName,
  getGravatarUrl,
  getUserInitials,
  resolveUserAvatarUrl,
  resolveUserPeopleIri,
};
