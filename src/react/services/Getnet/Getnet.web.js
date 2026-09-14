/**
 * Web stub for Getnet POS. The native module
 * `@controleonline/react-native-getnet-payment` is not part of the Expo web
 * bundle (browser smokes / admin / manager / delivery). Native Android keeps
 * using Getnet.js.
 */
class GetnetService {
  async payment() {
    throw new Error('Getnet POS is available only on the native POS app.');
  }

  async refund() {
    throw new Error('Getnet POS is available only on the native POS app.');
  }

  async reprint() {
    throw new Error('Getnet POS is available only on the native POS app.');
  }

  async checkStatus() {
    throw new Error('Getnet POS is available only on the native POS app.');
  }
}

export default GetnetService;
