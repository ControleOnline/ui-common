import {app_type} from '@appType';

export const PUBLIC_ROUTES = new Set([
  'SignInPage',
  'CreateAccount',
  'ConfirmAccountPage',
  'ResetPasswordPage',
  'ShopIndex',
  'ShopFranchiseLocatorPage',
  'ShopSearchPage',
  'ShopCategoryPage',
  'ShopProductPage',
  'ShopCartPage',
  'ShopCheckoutPage',
  'ShopOrdersPage',
  'ShopOrderDetailsPage',
  'ShopProfilePage',
  'ShopCardsPage',
  'ShopLoyaltyPage',
  'ShopDownloadPage',
]);

export const isPublicRoute = routeName =>
  PUBLIC_ROUTES.has(routeName) ||
  (routeName === 'HomePage' && String(app_type || '').toUpperCase() === 'SHOP');
