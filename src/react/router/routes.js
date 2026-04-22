import ImportsPage from '@controleonline/ui-common/src/react/pages/Imports';
import EntityLogPage from '@controleonline/ui-common/src/react/pages/EntityLogPage';
import GenericLogPage from '@controleonline/ui-common/src/react/pages/GenericLogPage';

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
    name: 'GenericLogPage',
    component: GenericLogPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      showBottomToolBar: true,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
      title: 'Logs gerais',
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
