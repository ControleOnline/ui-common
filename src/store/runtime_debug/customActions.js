import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

const normalizeText = value => String(value || '').trim();

const normalizeEntry = entry => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const key = normalizeText(entry.key);
  if (!key) {
    return null;
  }

  const normalizedLines = Array.isArray(entry.lines)
    ? entry.lines.map(line => normalizeText(line)).filter(Boolean)
    : [];
  const fallbackText = normalizeText(entry.text);
  const lines = normalizedLines.length > 0
    ? normalizedLines
    : (fallbackText ? [fallbackText] : []);

  return {
    ...entry,
    key,
    lines,
    order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : 100,
    updatedAt: normalizeText(entry.updatedAt) || new Date().toISOString(),
  };
};

export const setFooterEntry = ({commit, getters}, entry) => {
  const normalizedEntry = normalizeEntry(entry);
  if (!normalizedEntry) {
    return null;
  }

  const currentSummary =
    getters.summary && typeof getters.summary === 'object' ? getters.summary : {};
  const nextEntries = {
    ...(currentSummary.entries || {}),
    [normalizedEntry.key]: normalizedEntry,
  };

  commit(types.SET_SUMMARY, {
    ...currentSummary,
    entries: nextEntries,
  });

  return normalizedEntry;
};

export const clearFooterEntry = ({commit, getters}, key) => {
  const normalizedKey = normalizeText(key);
  const currentSummary =
    getters.summary && typeof getters.summary === 'object' ? getters.summary : {};

  if (!normalizedKey || !currentSummary.entries?.[normalizedKey]) {
    return null;
  }

  const nextEntries = {...currentSummary.entries};
  delete nextEntries[normalizedKey];

  commit(types.SET_SUMMARY, {
    ...currentSummary,
    entries: nextEntries,
  });

  return null;
};
