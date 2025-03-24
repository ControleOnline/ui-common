export default class Queue {
  constructor(functionName, time = 1000) {
    this.queue = [];
    this.isProcessing = false;
    this.timeout = null;
    this.functionName = functionName;
    this.time = time;
  }

  processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const product = this.queue[0];

    this.functionName(product).then(() => {
      this.queue.shift();
      this.isProcessing = false;
      this.processQueue();
    });
  }

  debounced(toQueue) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.queue.push(toQueue);
      if (!this.isProcessing) {
        this.processQueue();
      }
    }, this.time);
  }

  cancel() {
    clearTimeout(this.timeout);
  }
}
