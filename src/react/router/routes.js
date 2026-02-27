import SettingsPage from '@controleonline/ui-common/src/react/pages/SettingsPage';

const commonRoutes = [
  {
    name: 'SettingsPage',
    component: SettingsPage,
    options: {
      headerShown: true,
      headerBackVisible: false,
      showBottomToolBar: true,
      title: 'Configurações',
    },
    initialParams: {store: 'configs'},
  },
];

export default commonRoutes;