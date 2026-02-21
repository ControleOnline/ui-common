import SettingsPage from '@controleonline/ui-common/src/react/pages/SettingsPage';

const commonRoutes = [
  {
    name: 'SettingsPage',
    component: SettingsPage,
    options: {
      headerShown: true,
      showToolBar: true,
      title: 'Configurações',
      headerBackButtonMenuEnabled: true,
    },
    initialParams: {store: 'configs'},
  },
];

export default commonRoutes;