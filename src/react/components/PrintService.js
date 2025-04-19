import React, {useState, useEffect} from 'react';
import {CieloPrint} from '@controleonline/ui-orders/src/react/services/Cielo/Print';
import {getStore} from '@store';

const PrintService = ({}) => {
  const {getters: deviceConfigGetters} = getStore('device_config');
  const {getters: peopleGetters} = getStore('people');
  const {getters: printGetters, actions: printActions} = getStore('print');
  const {currentCompany} = peopleGetters;
  const {item: device} = deviceConfigGetters;
  const {items: spool} = printGetters;

  useEffect(() => {
    if (spool && spool.length > 0) {
      console.log(spool);
      for (const print of spool) printActions.addToQueue(() => goPrint(print));
      printActions.initQueue(() => {
        console.log('ee');
        //printActions.getItems();
      });
    }
  }, [spool]);

  goPrint = async print => {
    const data = await getData(print);
    const cielo = new CieloPrint();
    cielo.print(data);
  };

  getData = async print => {
    if (print.printType == 'order') return await printOrder(print);
    if (print.printType == 'cash-register')
      return await printCashRegister(print);
    if (print.printType == 'purchasing-suggestion')
      return await printPurchasingSuggestion(print);
    if (print.printType == 'inventory') return await printInventory(print);
  };

  printInventory = async print => {
    return await printActions.printInventory({
      people: currentCompany.id,
      'print-type': 'pos',
      'device-type': 'cielo',
    });
  };

  printPurchasingSuggestion = async print => {
    return await printActions.printPurchasingSuggestion({
      people: currentCompany.id,
      'print-type': 'pos',
      'device-type': 'cielo',
    });
  };

  printCashRegister = async print => {
    return await printActions.getCashRegisterPrint({
      device: device,
      people: currentCompany.id,
      'print-type': 'pos',
      'device-type': 'cielo',
    });
  };

  printOrder = async print => {
    return await printActions.printOrder({
      id: print.id,
      'print-type': 'pos',
      'device-type': 'cielo',
    });
  };

  return null;
};

export default PrintService;
