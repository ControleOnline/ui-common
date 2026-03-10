import SettingsPage from '@controleonline/ui-common/src/react/pages/SettingsPage';
import ImportsPage from '@controleonline/ui-common/src/react/pages/Imports';

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
    initialParams: { store: 'configs' },
  },
  {
    name: 'ImportsPage',
    component: ImportsPage,
    options: {
      showCompanyFilter: true,
      headerShown: true,
      headerBackVisible: false,
      showBottomToolBar: true,
      title: 'Importações',
    },

  },


];

export default commonRoutes;