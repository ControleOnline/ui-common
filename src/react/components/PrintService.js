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

    console.log('SPOOL:', spool);


    const processPrints = async () => {

      if (spool && spool.length > 0) {
        for (const print of spool) {
          try {
            const data = await getData(print);
            const cielo = new CieloPrint();
            cielo.print(data).then(() => {
              console.log('r');

              const newSpool = spool.filter(
                item => item.printId !== print.printId,
              );
              console.log('r');
              //printActions.setItems(newSpool);
            });
          } catch (err) {
            console.error('Erro no processamento do print:', err);
          }
        }
      }
    };

    processPrints();
  }, [spool]);

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
