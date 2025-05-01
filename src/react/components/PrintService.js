import React, {useState, useEffect} from 'react';
import {CieloPrint} from '@controleonline/ui-orders/src/react/services/Cielo/Print';
import {getStore} from '@store';

const PrintService = ({}) => {
  const {getters: peopleGetters} = getStore('people');
  const {getters: printGetters, actions: printActions} = getStore('print');
  const {getters: deviceConfigGetters} = getStore('device_config');
  const storagedDevice = localStorage.getItem('device');
  const {reload, print, items: spool} = printGetters;
  const {currentCompany} = peopleGetters;
  const [localDevice] = useState(() => {
    return storagedDevice ? JSON.parse(storagedDevice) : {};
  });
  const {item: device_config} = deviceConfigGetters;
  const [printer, setPrinter] = useState(null);

  useEffect(() => {
    if (device_config && device_config.configs)
      setPrinter(device_config.configs.printer || localDevice.id);
  }, [device_config]);

  useEffect(() => {
    if (print && print.length > 0) {
      for (const p of print) printActions.addToQueue(() => getData(p));
      printActions.initQueue(() => {
        printActions.setPrint([]);
      });
    }
  }, [print]);

  useEffect(() => {
    if (reload)
      printActions
        .getItems({
          'device.device': localDevice.id,
          'status.realStatus': 'open',
        })
        .finally(() => {
          printActions.setReload(false);
        });
  }, [reload]);

  useEffect(() => {
    if (spool && spool.length > 0) goPrint(spool[0]);
  }, [spool]);

  goPrint = async p => {
    let s = [...spool];
    const cielo = new CieloPrint();

    if (p['@id'])
      printActions.get(p['@id'].replace(/\D/g, '')).then(data => {
        if (data?.file?.content)
          printActions
            .makePrintDone(data['@id'].replace(/\D/g, ''))
            .then(() => {
              cielo.print(data.file.content);
              s.shift();
              printActions.setItems(s);
            });
      });
    else {
      printActions.setItems(s.shift() || []);
    }
  };

  getData = async print => {
    let data = null;

    if (print.printType == 'order') data = await printOrder(print);
    if (print.printType == 'cash-register') data = await printCashRegister();
    if (print.printType == 'purchasing-suggestion')
      data = await printPurchasingSuggestion();
    if (print.printType == 'inventory') data = await printInventory();
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
