import {
  PRINT_JOB_TYPE_CASH_REGISTER,
  PRINT_JOB_TYPE_INVENTORY,
  PRINT_JOB_TYPE_ORDER,
  PRINT_JOB_TYPE_ORDER_PRODUCT,
  PRINT_JOB_TYPE_ORDER_PRODUCT_QUEUE,
  PRINT_JOB_TYPE_PURCHASING_SUGGESTION,
} from '@controleonline/ui-common/src/react/print/jobs';

export const executeRemotePrintRequest = async ({
  printActions,
  printJob,
  targetDeviceId,
  targetDeviceType = '',
  currentCompanyId = null,
}) => {
  const commonParams = {
    device: targetDeviceId,
    ...(targetDeviceType ? {type: targetDeviceType} : {}),
    ...(currentCompanyId ? {people: currentCompanyId} : {}),
  };

  if (printJob.type === PRINT_JOB_TYPE_ORDER) {
    return await printActions.printOrder({
      id: printJob.orderId,
      ...commonParams,
      ...(Array.isArray(printJob.queueIds) && printJob.queueIds.length > 0
        ? {queueIds: printJob.queueIds}
        : {}),
      ...(Array.isArray(printJob.orderProductQueueIds) &&
      printJob.orderProductQueueIds.length > 0
        ? {orderProductQueueIds: printJob.orderProductQueueIds}
        : {}),
    });
  }

  if (printJob.type === PRINT_JOB_TYPE_ORDER_PRODUCT) {
    return await printActions.printOrderProduct({
      id: printJob.orderProductId,
      ...commonParams,
      ...(Array.isArray(printJob.orderProductQueueIds) &&
      printJob.orderProductQueueIds.length > 0
        ? {orderProductQueueIds: printJob.orderProductQueueIds}
        : {}),
    });
  }

  if (printJob.type === PRINT_JOB_TYPE_ORDER_PRODUCT_QUEUE) {
    return await printActions.printOrderProductQueue({
      id: printJob.orderProductQueueId,
      ...commonParams,
    });
  }

  if (printJob.type === PRINT_JOB_TYPE_CASH_REGISTER) {
    return await printActions.getCashRegisterPrint(commonParams);
  }

  if (printJob.type === PRINT_JOB_TYPE_PURCHASING_SUGGESTION) {
    return await printActions.printPurchasingSuggestion(commonParams);
  }

  if (printJob.type === PRINT_JOB_TYPE_INVENTORY) {
    return await printActions.printInventory(commonParams);
  }

  return null;
};
