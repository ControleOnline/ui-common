import React from 'react';
import SettingsPage from '@controleonline/ui-common/src/react/pages/SettingsPage';
import DefaultLayout from '@controleonline/ui-layout/src/react/layouts/DefaultLayout';


const WrappedSettingsPage = ({navigation, route}) => (
  <DefaultLayout navigation={navigation} route={route}>
    <SettingsPage navigation={navigation} route={route} />
  </DefaultLayout>
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
