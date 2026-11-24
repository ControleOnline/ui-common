// Orders linked to proposals/contracts are commercial drafts: the backend only
// accepts add/remove of products while the order is a `cart`
// (api-platform-orders OrderProductServiceHelpers::isMutableCartOrder) and never
// lets a `sale` go back to `cart`. They must start as `cart` and be promoted to
// `sale` (PUT /orders/{id} with orderType=sale) only when the deal is confirmed.
const LINKED_ORDER_TYPE = 'cart';

const buildLinkedOrderPayload = ({
  app = 'CRM',
  orderType = LINKED_ORDER_TYPE,
  contractIri = null,
  providerIri = null,
  statusIri = null,
  clientIri = null,
  payerIri = null,
} = {}) => {
  const payload = {
    app,
    orderType: orderType || LINKED_ORDER_TYPE,
    contract: contractIri,
    provider: providerIri,
  };

  if (statusIri) {
    payload.status = statusIri;
  }

  if (clientIri) {
    payload.client = clientIri;
  }

  const resolvedPayerIri = payerIri || clientIri;
  if (resolvedPayerIri) {
    payload.payer = resolvedPayerIri;
  }

  return payload;
};

module.exports = {
  LINKED_ORDER_TYPE,
  buildLinkedOrderPayload,
};
