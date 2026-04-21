import React, {useEffect, useCallback, useRef} from 'react';

import {api} from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  createInvoiceForGatewayFreePayment,
  isGatewayFreePayment,
} from '@controleonline/ui-common/src/react/utils/cashPayment';
import {
  normalizeGatewayPaymentError,
  runConfiguredGatewayPayment,
} from '@controleonline/ui-common/src/react/utils/paymentGatewayExecution';
import {
  buildRemotePaymentResultMessage,
  isRemotePaymentRequestMessage,
  normalizeRemotePaymentRequestKey,
} from '@controleonline/ui-common/src/react/utils/remotePayment';

import {useStore} from '@store';

const normalizeStatusKey = value => String(value || '').trim().toLowerCase();

const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const buildStatusIriFromId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '');
  return normalizedId ? `/statuses/${normalizedId}` : null;
};

let posPaidInvoiceStatusIriCache = null;

const resolvePosPaidInvoiceStatusIri = async fallbackStatusId => {
  if (posPaidInvoiceStatusIriCache) return posPaidInvoiceStatusIriCache;

  const fallbackIri = buildStatusIriFromId(fallbackStatusId);

  try {
    const response = await api.fetch('statuses', {
      params: {
        context: 'invoice',
        realStatus: 'closed',
        status: 'paid',
        itemsPerPage: 10,
      },
    });
    const items = extractCollectionItems(response);
    const matchedStatus =
      items.find(
        item =>
          normalizeStatusKey(item?.realStatus) === 'closed' &&
          normalizeStatusKey(item?.status) === 'paid',
      ) || items[0];
    const resolvedIri =
      matchedStatus?.['@id'] || buildStatusIriFromId(matchedStatus?.id) || fallbackIri;

    if (resolvedIri) {
      posPaidInvoiceStatusIriCache = resolvedIri;
    }

    return resolvedIri;
  } catch {
    return fallbackIri;
  }
};

const buildOrderIri = value => {
  const normalizedId = String(value || '').replace(/\D/g, '');
  return normalizedId ? `/orders/${normalizedId}` : null;
};

const Checkout = () => {
  const deviceConfigStore = useStore('device_config');
  const deviceConfigGetters = deviceConfigStore.getters;
  const categoriesStore = useStore('categories');
  const categoryActions = categoriesStore.actions;
  const {item: device} = deviceConfigGetters;
  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;
  const orderProductsStore = useStore('order_products');
  const orderProductsActions = orderProductsStore.actions;
  const invoiceStore = useStore('invoice');
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const websocketStore = useStore('websocket');
  const websocketActions = websocketStore.actions;
  const {messages, message} = invoiceGetters;
  const processingMessageKeyRef = useRef('');

  const clear = useCallback(() => {
    localStorage.removeItem('master-device');
    invoiceActions.setMessage(null);
    categoryActions.setItems(null);
    ordersActions.setItem(null);
    orderProductsActions.setItems([]);
    invoiceActions.setItems([]);
    ordersActions.setPayable(0);
  }, [categoryActions, invoiceActions, orderProductsActions, ordersActions]);

  useEffect(() => {
    if (
      messages &&
      messages.length > 0 &&
      (!message || Object.keys(message).length === 0)
    ) {
      const m = [...messages];
      invoiceActions.setMessage(m.pop());
      invoiceActions.setMessages(m);
    }
  }, [messages, message]);

  const createInvoice = useCallback(async (selectedPayment, total, orderItem) => {
    const paidStatusIri = await resolvePosPaidInvoiceStatusIri(
      defaultCompany?.configs['pos-paid-status'],
    );

    if (!paidStatusIri) {
      invoiceActions.setError(
        'Nao foi possivel resolver o status pago da invoice do PDV.',
      );
      return;
    }

    const payload = {
      dueDate: Formatter.getCurrentDate(),
      status: paidStatusIri,
      destinationWallet: selectedPayment.wallet['@id'],
      paymentType: selectedPayment.paymentType['@id'],
      price: total,
      receiver: '/people/' + currentCompany.id,
      order: orderItem?.['@id'],
    };

    return await invoiceActions.save(payload);
  }, [
    currentCompany?.id,
    defaultCompany?.configs,
    invoiceActions,
  ]);

  useEffect(() => {
    if (!isRemotePaymentRequestMessage(message)) {
      return;
    }

    const messageKey = JSON.stringify({
      action: message?.action,
      masterDevice: message?.['master-device'],
      order: message?.order,
      payment: message?.wallet_payment_type?.paymentType?.['@id'],
      requestKey: normalizeRemotePaymentRequestKey(message?.requestKey),
      total: message?.total,
    });

    if (processingMessageKeyRef.current === messageKey) {
      return;
    }

    processingMessageKeyRef.current = messageKey;

    const processMessage = async () => {
      const payment = message.wallet_payment_type;
      const total = Number(message.total || 0);
      const requestKey = normalizeRemotePaymentRequestKey(message?.requestKey);
      const masterDeviceId = String(message?.['master-device'] || '').trim();

      const sendRemoteResult = async result => {
        if (!masterDeviceId) {
          return;
        }

        try {
          await websocketActions.send(
            buildRemotePaymentResultMessage({
              destinationDeviceId: masterDeviceId,
              orderId: message?.order,
              payment,
              requestKey,
              targetDeviceId: device?.id || device?.device?.device || '',
              targetDeviceLabel:
                device?.device?.alias ||
                device?.device?.name ||
                device?.device?.device ||
                '',
              targetGateway: device?.configs?.['pos-gateway'] || '',
              total,
              ...result,
            }),
          );
        } catch {
          // silencioso: o pagamento ja foi executado neste device
        }
      };

      try {
        localStorage.setItem(
          'master-device',
          JSON.stringify({id: message['master-device']}),
        );

        const loadedOrder = await ordersActions.get(message.order);
        const orderIri = loadedOrder?.['@id'] || buildOrderIri(message.order);
        const loadedOrderProducts = orderIri
          ? await orderProductsActions
              .getItems({
                order: orderIri,
                itemsPerPage: 500,
              })
              .catch(() => [])
          : [];
        let createdInvoice = null;
        let paidAmount = total;

        if (isGatewayFreePayment(payment)) {
          await createInvoiceForGatewayFreePayment({
            payment,
            total,
            createInvoice: async (selectedPayment, paidTotal) => {
              createdInvoice = await createInvoice(
                selectedPayment,
                paidTotal,
                loadedOrder,
              );
              return createdInvoice;
            },
          });
          await sendRemoteResult({
            invoice: createdInvoice,
            paidAmount,
            status: 'success',
          });
          return;
        }

        const gatewayResult = await runConfiguredGatewayPayment({
          gateway: device?.configs?.['pos-gateway'],
          installments: payment?.installments,
          order: loadedOrder,
          orderProducts: loadedOrderProducts,
          payment,
          total,
        });
        paidAmount = gatewayResult?.paidAmount || total;

        createdInvoice = await createInvoice(payment, paidAmount, loadedOrder);
        await sendRemoteResult({
          invoice: createdInvoice,
          paidAmount,
          status: 'success',
        });
      } catch (error) {
        const errorMessage = normalizeGatewayPaymentError(
          error,
          'Nao foi possivel concluir o pagamento remoto.',
        );
        invoiceActions.setError(errorMessage);
        await sendRemoteResult({
          error: errorMessage,
          status: 'error',
        });
      } finally {
        clear();
        processingMessageKeyRef.current = '';
      }
    };

    processMessage();
  }, [
    clear,
    createInvoice,
    device?.configs,
    device?.device,
    device?.id,
    invoiceActions,
    message,
    orderProductsActions,
    ordersActions,
    websocketActions,
  ]);

  return null;
};

export default Checkout;
