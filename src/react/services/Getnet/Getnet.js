import Getnet from '@controleonline/react-native-getnet-payment';

/**
 * Thin adapter over the native Getnet POS deeplink module.
 * paymentType: credit | debit | voucher | pix
 */
class GetnetService {
  async payment({
    amount,
    paymentType = 'credit',
    callerId,
    installments = 1,
    creditType,
    allowPrintCurrentTransaction = true,
    orderId,
  }) {
    if (!callerId) {
      throw new Error('callerId is required for Getnet payment.');
    }

    const resolvedAmount = Number(amount || 0);
    if (resolvedAmount <= 0) {
      throw new Error('Informe um valor de pagamento valido.');
    }

    const params = {
      amount: resolvedAmount,
      paymentType: String(paymentType || 'credit').toLowerCase(),
      callerId: String(callerId),
      installments: Number(installments) > 0 ? Number(installments) : 1,
      allowPrintCurrentTransaction: Boolean(allowPrintCurrentTransaction),
    };

    if (params.installments > 1 && creditType) {
      params.creditType = creditType;
    }

    if (orderId) {
      params.orderId = String(orderId);
    }

    const response = await Getnet.payment(params);

    return {
      success: Boolean(response?.success),
      code: response?.result ?? response?.code ?? '',
      result: response,
      authorizationCode: response?.authorizationCode,
      nsu: response?.nsu,
      cvNumber: response?.cvNumber,
    };
  }

  async refund({amount, cvNumber, transactionDate, originTerminal}) {
    const response = await Getnet.refund({
      amount: Number(amount || 0),
      cvNumber,
      transactionDate,
      originTerminal,
    });

    return {
      success: Boolean(response?.success),
      result: response,
    };
  }

  async reprint() {
    return Getnet.reprint();
  }

  async checkStatus(callerId) {
    return Getnet.checkStatus(callerId);
  }
}

export default GetnetService;
