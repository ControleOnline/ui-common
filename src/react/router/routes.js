import ImportsPage from '@controleonline/ui-common/src/react/pages/Imports';
import EntityLogPage from '@controleonline/ui-common/src/react/pages/EntityLogPage';

const commonRoutes = [
  {
    name: 'EntityLogPage',
    component: EntityLogPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      showBottomToolBar: false,
      title: 'Historico',
    },
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
