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
  executeQueue(func, callback) {
    this.addToQueue(func);
    this.initQueue(callback);
  }

  execute(func, id, wait = 10) {
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
    if (this.onFinish && typeof this.onFinish == 'function') this.onFinish();
    this.isProcessing = false;
    this.onFinish = null;
  };

  processQueue() {
    if (this.queue.length === 0) return this.finalize();
    else this.isProcessing = true;

    if (this.isProcessing === false) return;

    const func = this.queue[0];

    return func()
      .then(() => {
        this.queue.shift();
        return this.processQueue();
      })
      .catch(error => {
        console.log(
          'Erro ao processar a fila. Nova tentativa em 5 segundos',
          error,
        );

        setTimeout(() => {
          return this.processQueue();
        }, 10);
      });
  }
  initQueue(callback) {
    if (typeof callback == 'function') this.onFinish = callback;
    if (this.isProcessing === true) return;
    this.processQueue();
  }
}
export const queue = new Queue();
