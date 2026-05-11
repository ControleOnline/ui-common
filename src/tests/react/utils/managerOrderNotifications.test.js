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
        [
          {
            order: '/orders/77',
            notificationHeader: 'Pedido #77',
            notificationSubheader: 'Ref. interna #77',
            notificationCustomerName: 'Maria Oliveira',
            notificationPriceLabel: 'R$ 42,90',
            notificationStatusLabel: 'Fila',
          },
        ],
        {alias: 'Loja Centro'},
      ),
    ).toEqual({
      title: 'Pedido #77',
      body:
        'Ref. interna #77 | Cliente: Maria Oliveira | Valor: R$ 42,90 | Loja Centro | Status: Fila',
      orderIds: ['77'],
      statusLabel: 'Fila',
    });

    expect(
      buildManagerOrderNotificationContent(
        [{order: 10}, {order: '/orders/12'}, {order: '12'}],
        {name: 'Operacao Norte'},
      ),
    ).toEqual({
      title: '2 novos pedidos',
      body: 'Operacao Norte recebeu 2 novos pedidos. Status: Fila.',
      orderIds: ['10', '12'],
      statusLabel: 'Fila',
    });
  });

  it('recognizes the manager app type safely', () => {
    expect(isManagerAppType('MANAGER')).toBe(true);
    expect(isManagerAppType('manager')).toBe(true);
    expect(isManagerAppType('POS')).toBe(false);
  });
});
