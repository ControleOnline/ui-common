import { api } from '@controleonline/ui-common/src/api';
import { parseIntegrationCollection } from './integrationsCatalog';

export async function fetchPeopleConfigs({ peopleIri, configKeys = [] }) {
  const collected = [];
  let page = 1;
  const itemsPerPage = 100;
  let totalItems = Number.POSITIVE_INFINITY;

  while (page <= 30 && collected.length < totalItems) {
    const params = {
      people: peopleIri,
      page,
      itemsPerPage,
    };
    if (configKeys.length) {
      params.configKey = configKeys;
    }

    const response = await api.fetch('/configs', { params });
    const items = parseIntegrationCollection(response);
    const reported = Number(response?.totalItems || response?.['hydra:totalItems'] || 0);
    if (reported > 0) {
      totalItems = reported;
    }
    collected.push(...items);

    if (!items.length || items.length < itemsPerPage) {
      break;
    }
    page += 1;
  }

  return collected;
}
