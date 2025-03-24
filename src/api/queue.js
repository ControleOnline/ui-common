let queue = null;
timeout = [];

export function execute(func, id, wait = 1000) {
  const debounced = function (...args) {
    clearTimeout(timeout[id]);
    timeout[id] = setTimeout(() => {
      if (queue == null) queue = new Queue();
      queue.addtoQueue(() => func(...args));
      return queue.processQueue();
    }, wait);
  };

  debounced.cancel = (id) => {
    clearTimeout(timeout[id]);
  };
  return debounced;
}

export default class Queue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }
  addtoQueue(func) {
    this.queue.push(func);
  }
  processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const func = this.queue[0];

    return func()
      .then(() => {
        this.queue.shift();
        return this.processQueue();
      })
      .catch(error => {
        console.error(
          'Erro ao processar a fila. Nova tentativa em 1 segundo',
          error,
        );
        setTimeout(() => {
          return this.processQueue();
        }, 1000);
      })
      .finally(() => {
        this.isProcessing = false;
      });
  }
}
