import React, {useState, useCallback, useEffect} from 'react';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

import CieloCheckout from '@controleonline/ui-orders/src/react/services/Cielo/Checkout';
import InfinitePay from '@controleonline/ui-orders/src/react/services/InfinitePay/Checkout';
import Formatter from '@controleonline/ui-common/src/utils/formatter';

import {useGetStore} from '@store';

export default Checkout = ({route}) => {
  const {getters: deviceConfigGetters} = useGetStore('device_config');
  const {actions: categoryActions} = useGetStore('categories');
  const {actions: cartActions} = useGetStore('cart');
  const {item: device} = deviceConfigGetters;
  const {getters: ordersGetters, actions: ordersActions} = useGetStore('orders');
  const {actions: orderProductsActions} = useGetStore('order_products');
  const {getters: invoiceGetters, actions: invoiceActions} =
    useGetStore('invoice');
  const {getters: peopleGetters} = useGetStore('people');
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
          orderProductsActions.setItems(data.orderProducts);
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
    orderProductsActions.setItems([]);
    setPaymentType(null);
    setPaymentValue(0);
    categoryActions.setItems(null);
    ordersActions.setItem(null);
    orderProductsActions.setItems([]);
    cartActions.setItem(null);
    invoiceActions.setItems([]);
    cartActions.setPayable(0);
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
