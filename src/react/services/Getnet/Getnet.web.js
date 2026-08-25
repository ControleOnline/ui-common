class GetnetService {
  unavailable() {
    throw new Error('Getnet POS payments are available only on native Android.');
  }

  async payment() {
    this.unavailable();
  }

  async refund() {
    this.unavailable();
  }

  async reprint() {
    this.unavailable();
  }

  async checkStatus() {
    this.unavailable();
  }
}

export default GetnetService;
