import React, {useEffect} from 'react';
import {CieloPrint} from '@controleonline/ui-orders/src/react/services/Cielo/Print';
import Sound from 'react-native-sound';
import {useStore} from '@store';

const PrintService = ({}) => {
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const printStore = useStore('print');
  const printGetters = printStore.getters;
  const printActions = printStore.actions;
  const deviceStore = useStore('device');
  const deviceGetters = deviceStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {reload, print, items: spool, message, messages} = printGetters;
  const {currentCompany} = peopleGetters;

  const playSound = file => {
    const sound = new Sound(
      file.toLowerCase() + '.mp3',
      Sound.MAIN_BUNDLE,
      error => {
        if (error) return;
        sound.play(() => sound.release());
      },
    );
  };

  useEffect(() => {
    printActions.setReload(true);
    if (message?.sound) playSound(message.sound);
  }, [message]);

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
          'device.device': storagedDevice.id,
          'status.realStatus': 'open',
        })
        .finally(() => {
          printActions.setReload(false);
        });
  }, [reload]);

  useEffect(() => {
    if (spool && spool.length > 0) goPrint(spool[0]);
  }, [spool]);

  const goPrint = async p => {
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
              printActions.setMessage(null);
            });
      });
    else {
      printActions.setItems(s.shift() || []);
      printActions.setMessage(null);
    }
  };

  useEffect(() => {
    if (
      messages &&
      messages.length > 0 &&
      (!message || Object.keys(message) == 0)
    ) {
      const m = [...messages];
      printActions.setMessage(m.pop());
      printActions.setMessages(m);
    }
  }, [messages, message]);

  const getData = async print => {
    if (print.printType == 'order') {
      await printOrder(print);
    }

    if (print.printType == 'cash-register') {
      await printCashRegister();
    }

    if (print.printType == 'purchasing-suggestion') {
      await printPurchasingSuggestion();
    }

    if (print.printType == 'inventory') {
      await printInventory();
    }
  };

  const printInventory = async () => {
    return await printActions.printInventory({
      device: storagedDevice.id,
      people: currentCompany.id,
    });
  };

  const printPurchasingSuggestion = async () => {
    return await printActions.printPurchasingSuggestion({
      device: storagedDevice.id,
      people: currentCompany.id,
    });
  };

  const printCashRegister = async () => {
    return await printActions.getCashRegisterPrint({
      device: storagedDevice.id,
      people: currentCompany.id,
    });
  };

  const printOrder = async order => {
    return await printActions.printOrder({
      id: order.id,
      device: storagedDevice.id,
    });
  };

  return null;
};

export default PrintService;
