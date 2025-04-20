import React, {useState, useEffect} from 'react';
import {CieloPrint} from '@controleonline/ui-orders/src/react/services/Cielo/Print';
import {getStore} from '@store';

const PrintService = ({}) => {
  const {getters: peopleGetters} = getStore('people');
  const {getters: printGetters, actions: printActions} = getStore('print');
  const {currentCompany} = peopleGetters;
  const {reload, print, items: spool} = printGetters;
  const storagedDevice = localStorage.getItem('device');
  const [localDevice] = useState(() => {
    return storagedDevice ? JSON.parse(storagedDevice) : {};
  });
  useEffect(() => {
    if (print && print.length > 0) {
      for (const p of print) printActions.addToQueue(() => getData(p));
      printActions.initQueue(() => {
        printActions.setPrint([]);
      });
    }
  }, [print]);

  useEffect(() => {
    if (reload) printActions.getItems({device: localDevice.id});
  }, [reload]);

  useEffect(() => {
    if (spool && spool.length > 0) goPrint(spool[0]);
  }, [spool]);

  goPrint = async data => {
  
    let s = [...print];
    if (data?.file?.content) {
      const cielo = new CieloPrint();
      cielo.print(data.file.content).then(() => {
        printActions.setItems(s.shift());
      });
    } else {
      printActions.setItems(s.shift());
    }
  };

  getData = async print => {
    let data = null;
    let s = [...spool || []];

    if (print.printType == 'order') data = await printOrder(print);
    if (print.printType == 'cash-register') data = await printCashRegister();
    if (print.printType == 'purchasing-suggestion')
      data = await printPurchasingSuggestion();
    if (print.printType == 'inventory') data = await printInventory();
    s.push(data);
    
    printActions.setItems(s);
  };

  printInventory = async () => {
    return await printActions.printInventory({
      device: localDevice.id,
      people: currentCompany.id,
    });
  };

  printPurchasingSuggestion = async () => {
    return await printActions.printPurchasingSuggestion({
      device: localDevice.id,
      people: currentCompany.id,
    });
  };

  printCashRegister = async () => {
    return await printActions.getCashRegisterPrint({
      device: localDevice.id,
      people: currentCompany.id,
    });
  };

  printOrder = async order => {
    return await printActions.printOrder({
      id: order.id,
      device: localDevice.id,
    });
  };

  return null;
};

export default PrintService;
