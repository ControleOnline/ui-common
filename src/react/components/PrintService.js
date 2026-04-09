import React, {useEffect} from 'react'
import {CieloPrint} from '@controleonline/ui-orders/src/react/services/Cielo/Print'
import {useStore} from '@store'

const PrintService = () => {
  const peopleStore = useStore('people')
  const peopleGetters = peopleStore.getters
  const printStore = useStore('print')
  const printGetters = printStore.getters
  const printActions = printStore.actions
  const deviceStore = useStore('device')
  const deviceGetters = deviceStore.getters

  const {item: storagedDevice} = deviceGetters
  const {reload, print, items: spool, message, messages} = printGetters
  const {currentCompany} = peopleGetters

  useEffect(() => {
    printActions.setReload(true)
  }, [message])

  useEffect(() => {
    if (print && print.length > 0) {
      for (const p of print) printActions.addToQueue(() => getData(p))
      printActions.initQueue(() => {
        printActions.setPrint([])
      })
    }
  }, [print])

  useEffect(() => {
    if (reload)
      printActions
        .getItems({
          'device.device': storagedDevice.id,
          'status.realStatus': 'open',
        })
        .finally(() => printActions.setReload(false))
  }, [reload])

  useEffect(() => {
    if (spool && spool.length > 0) goPrint(spool[0])
  }, [spool])

  const getPrintPayload = content => {
    if (content === null || content === undefined) {
      return ''
    }

    if (typeof content !== 'string') {
      return JSON.stringify(content)
    }

    if (typeof atob === 'function') {
      try {
        return atob(content)
      } catch (e) {
        return content
      }
    }

    return content
  }

  const goPrint = async p => {
    let s = [...spool]
    const cielo = new CieloPrint()

    if (p['@id']) {
      printActions.get(p['@id'].replace(/\D/g, '')).then(async data => {
        if (data?.file?.content) {
          try {
            const payload = getPrintPayload(data.file.content)
            const response = await cielo.print(payload)

            if (!response?.success) {
              throw new Error(
                response?.result ||
                  global.t?.t('orders', 'message', 'printProcessingError'),
              )
            }

            await printActions.makePrintDone(data['@id'].replace(/\D/g, ''))
          } catch (e) {
            printActions.setError(
              e?.message || global.t?.t('orders', 'message', 'printProcessingError'),
            )
          } finally {
            s.shift()
            printActions.setItems(s)
            printActions.setMessage(null)
          }
        } else {
          s.shift()
          printActions.setItems(s)
          printActions.setMessage(null)
        }
      })
    } else {
      printActions.setItems(s.shift() || [])
      printActions.setMessage(null)
    }
  }

  useEffect(() => {
    if (
      messages &&
      messages.length > 0 &&
      (!message || Object.keys(message).length === 0)
    ) {
      const m = [...messages]
      printActions.setMessage(m.pop())
      printActions.setMessages(m)
    }
  }, [messages, message])

  const resolveTargetDevice = printJob => printJob?.device || storagedDevice.id

  const getData = async print => {
    if (print.printType == 'order') await printOrder(print)
    if (print.printType == 'cash-register') await printCashRegister(print)
    if (print.printType == 'purchasing-suggestion')
      await printPurchasingSuggestion(print)
    if (print.printType == 'inventory') await printInventory(print)
  }

  const printInventory = async printJob => {
    return await printActions.printInventory({
      device: resolveTargetDevice(printJob),
      people: currentCompany.id,
    })
  }

  const printPurchasingSuggestion = async printJob => {
    return await printActions.printPurchasingSuggestion({
      device: resolveTargetDevice(printJob),
      people: currentCompany.id,
    })
  }

  const printCashRegister = async printJob => {
    return await printActions.getCashRegisterPrint({
      device: resolveTargetDevice(printJob),
      people: currentCompany.id,
    })
  }

  const printOrder = async order => {
    return await printActions.printOrder({
      id: order.id,
      device: resolveTargetDevice(order),
    })
  }

  return null
}

export default PrintService
