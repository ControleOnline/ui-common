class Queue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.timeout = [];
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

  processQueue() {
    if (this.queue.length === 0 && this.isProcessing === true) {
      this.isProcessing = false;
      return;
    }
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
  initQueue() {
    if (this.queue.length > 0 && this.isProcessing === false) {
      this.isProcessing = true;
      this.processQueue();
    }
  }
}
export const queue = new Queue();
