class Queue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.timeout = [];
    this.onFinish = null;
  }
  addToQueue(func) {
    this.queue.push(func);
  }

  execute(func, id, wait = 1000) {
    const debounced = function (...args) {
      clearTimeout(this.timeout[id]);
      this.timeout[id] = setTimeout(() => {
        this.addToQueue(() => func(...args));
      }, wait);
    };

    debounced.cancel = id => {
      clearTimeout(this.timeout[id]);
    };
    return debounced;
  }

  finalize = () => {
        this.isProcessing = false;
    console.log(this.onFinish);
    if (this.onFinish) this.onFinish();
  }

  processQueue() {
    if (this.queue.length === 0 && this.isProcessing === true)
      return this.finalize();

    const func = this.queue[0];

    return func()
      .then(() => {
        this.queue.shift();
        return this.processQueue();
      })
      .catch(error => {
        console.log(
          'Erro ao processar a fila. Nova tentativa em 1 segundo',
          error,
        );

        setTimeout(() => {
          return this.processQueue();
        }, 1000);
      });
  }
  initQueue(callback) {
    if (this.queue.length > 0 && this.isProcessing === false) {
      this.isProcessing = true;
      this.onFinish = callback;
      this.processQueue();
    }
  }
}
export const queue = new Queue();
