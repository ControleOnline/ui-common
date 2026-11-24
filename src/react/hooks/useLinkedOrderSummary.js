import { useCallback, useEffect, useState } from 'react';
import {
  fetchLinkedOrder,
  fetchOrderProducts,
} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders';
import { formatBRL, summarizeOrderProducts } from '@controleonline/ui-common/src/react/utils/orderProductsSummary';

/**
 * Product count and total of the order linked to a proposal/contract, for the
 * fixed document header. Call `reload` after products change.
 */
const useLinkedOrderSummary = contractRef => {
  const [summary, setSummary] = useState({ count: 0, total: 0, loaded: false });

  const reload = useCallback(async () => {
    if (!contractRef) {
      setSummary({ count: 0, total: 0, loaded: true });
      return;
    }

    try {
      const order = await fetchLinkedOrder(contractRef);
      const items = order ? await fetchOrderProducts(order['@id'] || order.id) : [];
      setSummary({ ...summarizeOrderProducts(items), loaded: true });
    } catch {
      setSummary(current => ({ ...current, loaded: true }));
    }
  }, [contractRef]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    ...summary,
    totalLabel: summary.loaded && summary.count > 0 ? formatBRL(summary.total) : null,
    reload,
  };
};

export default useLinkedOrderSummary;
