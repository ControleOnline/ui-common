const {jest} = require('@jest/globals');

jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

const {
  applyManagerOrderNotificationPreferences,
  buildManagerOrderNotificationContent,
  hasStoredManagerOrderNotificationPreferences,
  isManagerAppType,
  resolveManagerOrderNotificationPreferences,
} = require('../../../react/utils/managerOrderNotifications');

const {describe, expect, it} = global;

describe('managerOrderNotifications helpers', () => {
  it('defaults push to enabled and sound to disabled', () => {
    expect(resolveManagerOrderNotificationPreferences(null)).toEqual({
      pushEnabled: true,
      soundEnabled: false,
      soundUrl: '',
    });
    expect(hasStoredManagerOrderNotificationPreferences(null)).toBe(false);
  });

  it('stores preferences under localPreferences without losing existing fields', () => {
    const user = {
      id: 15,
      name: 'Gestor',
      localPreferences: {
        theme: 'light',
      },
    };

    expect(
      applyManagerOrderNotificationPreferences(user, {
        pushEnabled: false,
        soundEnabled: true,
        soundUrl: 'https://cdn.example.com/alerta.mp3',
      }),
    ).toMatchObject({
      id: 15,
      localPreferences: {
        theme: 'light',
        managerOrderNotifications: {
          pushEnabled: false,
          soundEnabled: true,
          soundUrl: 'https://cdn.example.com/alerta.mp3',
        },
      },
    });
  });

  it('builds a focused title for one order and a grouped summary for many', () => {
    expect(
      buildManagerOrderNotificationContent(
        [{order: '/orders/77'}],
        {alias: 'Loja Centro'},
      ),
    ).toEqual({
      title: 'Novo pedido #77',
      body: 'Loja Centro recebeu um novo pedido em preparo.',
      orderIds: ['77'],
    });

    expect(
      buildManagerOrderNotificationContent(
        [{order: 10}, {order: '/orders/12'}, {order: '12'}],
        {name: 'Operacao Norte'},
      ),
    ).toEqual({
      title: '2 novos pedidos',
      body: 'Operacao Norte recebeu 2 novos pedidos em preparo.',
      orderIds: ['10', '12'],
    });
  });

  it('recognizes the manager app type safely', () => {
    expect(isManagerAppType('MANAGER')).toBe(true);
    expect(isManagerAppType('manager')).toBe(true);
    expect(isManagerAppType('POS')).toBe(false);
  });
});
