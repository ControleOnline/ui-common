import { api } from '@controleonline/ui-common/src/api';
import { parseIntegrationCollection } from './integrationsCatalog';

export async function fetchPeopleConfigs({ peopleIri, configKeys = [] }) {
  const keys = [...new Set(configKeys.map(key => String(key || '').trim()).filter(Boolean))];
  if (!peopleIri || !keys.length) {
    return [];
  }

  const response = await api.fetch('/configs', {
    params: {
      people: peopleIri,
      configKey: keys,
      itemsPerPage: keys.length,
    },
  });

  return parseIntegrationCollection(response).filter(item =>
    keys.includes(String(item?.configKey || '').trim()),
  );
}
