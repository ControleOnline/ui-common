import ImportsPage from '@controleonline/ui-common/src/react/pages/Imports';
import EntityLogPage from '@controleonline/ui-common/src/react/pages/EntityLogPage';
import GenericLogPage from '@controleonline/ui-common/src/react/pages/GenericLogPage';
import CashRegisterSummary from '@controleonline/ui-common/src/react/pages/CashRegisterSummary';

const commonRoutes = [
  {
    name: 'EntityLogPage',
    component: EntityLogPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
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
      title: 'Logs',
    },
  },
  {
    name: 'CashRegisterSummary',
    component: CashRegisterSummary,
    options: {
      showCompanyFilter: true,
      companyFilterMode: 'icon',
      headerShown: true,
      headerBackVisible: true,
      showBottomToolBar: true,
      title: 'Caixa',
    },
  },
  {
    name: 'ImportsPage',
    component: ImportsPage,
    options: {
      showCompanyFilter: true,
      headerShown: true,
      showBottomToolBar: true,
      title: 'Importações',
    },

  },


];

export default commonRoutes;
