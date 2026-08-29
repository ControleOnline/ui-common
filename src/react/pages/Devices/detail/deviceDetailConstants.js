export const hex = {
  success: '#10b981',
  danger: '#c10015',
  warning: '#e67e22',
  info: '#0EA5E9',
  purple: '#8B5CF6',
};

export const PAYMENT_ICONS = {
  dinheiro: 'dollar-sign',
  pix: 'zap',
  debito: 'credit-card',
  credito: 'credit-card',
  default: 'hash',
};

export const DISPLAY_DEVICE_TYPE = 'DISPLAY';
export const PDV_DEVICE_TYPE = 'PDV';
export const DISPLAY_DEVICE_LINK_CONFIG_KEY = 'display-id';
export const DISPLAY_DEVICE_PRINTER_CONFIG_KEY = 'printer';

export const PDV_TAB_OPERATION = 'operation';
export const PDV_TAB_ORDERS = 'orders';
export const PDV_TAB_DEVICE = 'device';
export const PDV_TAB_PAYMENT_TYPES = 'payment-types';
export const PDV_TAB_MOVEMENT = 'movement';

export const PDV_DETAIL_TABS = [
  {key: PDV_TAB_OPERATION, icon: 'sliders', labelKey: 'pdvOperation'},
  {key: PDV_TAB_ORDERS, icon: 'list', labelKey: 'pdvOrders'},
  {key: PDV_TAB_DEVICE, icon: 'cpu', labelKey: 'pdvDevice'},
  {key: PDV_TAB_PAYMENT_TYPES, icon: 'credit-card', labelKey: 'pdvPayments'},
  {key: PDV_TAB_MOVEMENT, icon: 'bar-chart-2', labelKey: 'pdvMovement'},
];

export const tt = (type, key) => global.t?.t('configs', type, key);
