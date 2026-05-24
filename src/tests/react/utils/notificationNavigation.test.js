const {jest} = require('@jest/globals');

const {describe, expect, it, beforeEach} = global;

const {
  clearNotificationNavigationQueue,
  flushNotificationNavigationQueue,
  queueNotificationNavigation,
  setNotificationNavigationHandler,
} = require('../../../react/utils/notificationNavigation');

describe('notificationNavigation helpers', () => {
  beforeEach(() => {
    clearNotificationNavigationQueue();
    setNotificationNavigationHandler(null);
  });

  it('queues notification navigation until the handler is ready', () => {
    const handler = jest.fn(() => true);

    expect(queueNotificationNavigation('OrderDetails', {id: '71137'})).toBe(true);
    expect(handler).not.toHaveBeenCalled();

    setNotificationNavigationHandler(handler);
    expect(flushNotificationNavigationQueue()).toBe(true);
    expect(handler).toHaveBeenCalledWith('OrderDetails', {id: '71137'});
  });

  it('deduplicates the same cold-start notification request', () => {
    const handler = jest.fn(() => true);

    expect(queueNotificationNavigation('OrderDetails', {id: '71137'})).toBe(true);
    expect(queueNotificationNavigation('OrderDetails', {id: '71137'})).toBe(false);

    setNotificationNavigationHandler(handler);
    flushNotificationNavigationQueue();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
