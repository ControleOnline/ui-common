import {EventEmitter} from 'events';

let eventBusLocal = null;

const getEventBus = () => {
  if (!eventBusLocal) {
    eventBusLocal = new EventEmitter();
  }
  return eventBusLocal;
};

export default getEventBus();
