import React, {useState, useEffect} from 'react';
//import {useNavigation} from '@react-navigation/native';

import {api} from '@controleonline/ui-common/src/api';
import CieloCheckout from '@controleonline/ui-orders/src/react/services/Cielo/Checkout';
import InfinitePay from '@controleonline/ui-orders/src/react/services/InfinitePay/Checkout';
import Formatter from '@controleonline/ui-common/src/utils/formatter';

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
  } catch (error) {
    return fallbackIri;
  }
};

const Checkout = () => {
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const categoriesStore = useStore('categories');
  const categoryActions = categoriesStore.actions;
  const {item: device} = deviceConfigGetters;
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const invoiceStore = useStore('invoice');
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const {item: order} = ordersGetters;
  const {messages, message} = invoiceGetters;
  //const navigation = useNavigation();
  const [paymentType, setPaymentType] = useState(null);
  const [paymentValue, setPaymentValue] = useState(null);

  useEffect(() => {
    if (message?.action == 'pay') {
      localStorage.setItem(
        'master-device',
        JSON.stringify({id: message['master-device']}),
      );
      ordersActions.get(message.order).then(() => {
        setPaymentType(message.wallet_payment_type);
        setPaymentValue(message.total);
      });
    }
  }, [message, ordersActions]);

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

  const cancelOperation = () => {
    clear();
  };
  const clear = () => {
    localStorage.removeItem('master-device');
    invoiceActions.setMessage(null);
    setPaymentType(null);
    setPaymentValue(0);
    categoryActions.setItems(null);
    ordersActions.setItem(null);
    invoiceActions.setItems([]);
    ordersActions.setPayable(0);
    //navigation.reset('HomePage');
  };
  const createInvoice = async (selectedPayment, total) => {
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
      order: order['@id'],
    };

    invoiceActions.save(payload).finally(data => {
      clear();
    });
  };

  return (
    device.configs &&
    paymentType &&
    paymentValue && (
      <>
        {device.configs['pos-gateway'] == 'cielo' && (
          <CieloCheckout
            cancelOperation={cancelOperation}
            createInvoice={createInvoice}
            remoteCheckoutMode={true}
            paymentType={paymentType}
            paymentValue={paymentValue}
          />
        )}
        {device.configs['pos-gateway'] == 'infinite-pay' && (
          <InfinitePay
            cancelOperation={cancelOperation}
            createInvoice={createInvoice}
            remoteCheckoutMode={true}
            paymentType={paymentType}
            paymentValue={paymentValue}
          />
        )}
      </>
    )
  );
};

export default Checkout;
