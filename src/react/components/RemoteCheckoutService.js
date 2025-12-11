import React, {useState, useCallback, useEffect} from 'react';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

import CieloCheckout from '@controleonline/ui-orders/src/react/services/Cielo/Checkout';
import InfinitePay from '@controleonline/ui-orders/src/react/services/InfinitePay/Checkout';
import Formatter from '@controleonline/ui-common/src/utils/formatter';

import {useStores} from '@store';

const Checkout = () => {
  const device_configStore = useStores(state => state.device_config);
  const deviceConfigGetters = device_configStore.getters;
  const categoriesStore = useStores(state => state.categories);
  const categoryActions = categoriesStore.actions;
  const {item: device} = deviceConfigGetters;
  const ordersStore = useStores(state => state.orders);
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const invoiceStore = useStores(state => state.invoice);
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const peopleStore = useStores(state => state.people);
  const peopleGetters = peopleStore.getters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const {item: order} = ordersGetters;
  const {messages, message} = invoiceGetters;
  const navigation = useNavigation();
  const [paymentType, setPaymentType] = useState(null);
  const [paymentValue, setPaymentValue] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (message?.action == 'pay') {
        localStorage.setItem(
          'master-device',
          JSON.stringify({id: message['master-device']}),
        );
        ordersActions.get(message.order).then(data => {
          setPaymentType(message.wallet_payment_type);
          setPaymentValue(message.total);
        });
      }
    }, [message]),
  );

  useEffect(() => {
    if (
      messages &&
      messages.length > 0 &&
      (!message || Object.keys(message) == 0)
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
    navigation.reset('HomePage');
  };
  const createInvoice = (selectedPayment, total) => {
    const payload = {
      dueDate: Formatter.getCurrentDate(),
      status: '/statuses/' + defaultCompany?.configs['pos-paid-status'],
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
