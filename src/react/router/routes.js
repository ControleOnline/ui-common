import React from 'react';
import SettingsPage from '@controleonline/ui-common/src/react/pages/SettingsPage';
import ShopLayout from '@controleonline/ui-layout/src/react/layouts/ShopLayout';


const WrappedSettingsPage = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <SettingsPage navigation={navigation} route={route} />
  </ShopLayout>
);

const commonRoutes = [
  {
    name: 'SettingsPage',
    component: WrappedSettingsPage,
    options: {
      headerShown: true,
      title: 'Configurações',
      headerBackButtonMenuEnabled: true,
    },
    initialParams: {store: 'configs'},
  },
];

export default commonRoutes;
