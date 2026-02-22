import SettingsPage from '@controleonline/ui-common/src/react/pages/SettingsPage';

const commonRoutes = [
  {
    name: 'SettingsPage',
    component: SettingsPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      showToolBar: true,
      title: 'Configurações',
    },
    initialParams: {store: 'configs'},
  },
];

export default commonRoutes;