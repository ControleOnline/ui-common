import {
  IP_CAMERA_DEVICE_TYPE,
  PRINT_DEVICE_TYPE,
  PRINTER_DEVICE_TYPE,
  normalizeDeviceType,
} from '@controleonline/ui-common/src/react/utils/printerDevices';

const printerProfile = {
  filterKey: 'PRINTERS',
  filterLabel: 'Impressoras',
  itemLabel: 'Impressora',
  icon: 'printer',
  formRouteName: 'PrinterDeviceForm',
  detailRouteName: 'PrinterDeviceDetail',
  formHeaderTitle: 'Nova Impressora de Rede',
  detailHeaderTitle: 'Impressora de Rede',
  createActionLabel: 'Nova impressora de rede',
  createHelperText:
    'Cadastre impressoras por IP/hostname e vincule o device local que vai gerenciar a impressao na rede.',
  emptyTitle: 'Nenhuma impressora encontrada',
  emptyDescription:
    'Cadastre uma impressora de rede para visualizar devices deste tipo.',
  heroTitle: 'Nova impressora de rede',
  heroText:
    'Cadastre a impressora pelo IP/hostname e vincule qual device local vai executar a impressao na rede.',
  aliasPlaceholder: 'Ex.: Impressora Caixa 1',
  detailHeroFallback: 'Impressora de rede',
  detailLoadingText: 'Atualizando dados da impressora...',
  companyMissingMessage:
    'Selecione uma empresa antes de cadastrar a impressora.',
  hostAlertTitle: 'IP da impressora',
  hostMissingMessage: 'Informe o IP ou hostname da impressora.',
  managerMissingMessage:
    'Selecione o PDV ou DISPLAY responsavel por receber e encaminhar as impressoes.',
  registerErrorMessage: 'Nao foi possivel cadastrar a impressora.',
  registerErrorTitle: 'Erro ao cadastrar impressora',
  managerSectionDescription:
    'Este PDV ou DISPLAY sera o gateway local que acompanha as impressoes desta impressora de rede.',
  createButtonLabel: 'Cadastrar impressora',
  statusSectionDescription:
    'O app tenta abrir uma conexao TCP direta com a impressora IP para indicar se ela esta acessivel na rede deste device.',
  registrationSectionTitle: 'Cadastro da impressora',
  detailAliasPlaceholder: 'Nome da impressora',
  registrationAlertTitle: 'Cadastro da impressora',
  routingSectionTitle: 'Roteamento de impressao',
  routingSectionDescription:
    'O backend continua gerando a impressao para o device da impressora. Aqui voce define qual PDV ou DISPLAY local fica responsavel por consumir essa fila e falar com a impressora na rede.',
  routingAlertTitle: 'Configuracao da impressora',
  hostMissingBeforeSaveMessage:
    'Informe o IP ou hostname da impressora antes de salvar.',
  managerRoutingMessage:
    'Selecione qual PDV ou DISPLAY executa a impressao desta impressora.',
  saveBeforeRoutingMessage:
    'Salve primeiro o cadastro da impressora para aplicar o novo IP antes do roteamento.',
  footerDebugDescription:
    'Controla se esta impressora mostra apenas a bolinha discreta do socket no rodape global ou se abre as linhas detalhadas de debug.',
  removeSectionTitle: 'Remover cadastro de rede',
  removeSectionDescription:
    'Use esta acao para excluir apenas o cadastro desta impressora na rede. O equipamento responsavel pela comunicacao continua salvo no sistema.',
  removeButtonLabel: 'Remover cadastro de rede',
  removeConfirmTitle: 'Remover impressora da rede',
  removeConfirmMessage:
    'Deseja remover o cadastro desta impressora na rede? O equipamento responsavel continuara salvo no sistema.',
  removeSuccessMessage: 'Cadastro da impressora na rede removido com sucesso.',
  removeErrorMessage: 'Nao foi possivel remover o cadastro da impressora na rede.',
};

const ipCameraProfile = {
  filterKey: IP_CAMERA_DEVICE_TYPE,
  filterLabel: 'Cameras IP',
  itemLabel: 'Camera IP',
  icon: 'camera',
  formRouteName: 'IpCameraForm',
  detailRouteName: 'IpCameraDetail',
  formHeaderTitle: 'Nova Camera IP',
  detailHeaderTitle: 'Camera IP',
  createActionLabel: 'Nova camera IP',
  createHelperText:
    'Cadastre cameras IP por IP/hostname e vincule o device local que vai acompanhar a comunicacao na rede.',
  emptyTitle: 'Nenhuma camera IP encontrada',
  emptyDescription:
    'Cadastre uma camera IP para visualizar devices deste tipo.',
  heroTitle: 'Nova camera IP',
  heroText:
    'Cadastre a camera pelo IP/hostname e vincule qual device local vai acompanhar a comunicacao na rede.',
  aliasPlaceholder: 'Ex.: Camera Corredor 1',
  detailHeroFallback: 'Camera IP',
  detailLoadingText: 'Atualizando dados da camera IP...',
  companyMissingMessage:
    'Selecione uma empresa antes de cadastrar a camera IP.',
  hostAlertTitle: 'IP da camera',
  hostMissingMessage: 'Informe o IP ou hostname da camera IP.',
  managerMissingMessage:
    'Selecione o PDV ou DISPLAY responsavel por acompanhar esta camera IP.',
  registerErrorMessage: 'Nao foi possivel cadastrar a camera IP.',
  registerErrorTitle: 'Erro ao cadastrar camera IP',
  managerSectionDescription:
    'Este PDV ou DISPLAY sera o gateway local que acompanha esta camera IP na rede.',
  createButtonLabel: 'Cadastrar camera IP',
  statusSectionDescription:
    'O app tenta abrir uma conexao TCP direta com a camera IP para indicar se ela esta acessivel na rede deste device.',
  registrationSectionTitle: 'Cadastro da camera IP',
  detailAliasPlaceholder: 'Nome da camera IP',
  registrationAlertTitle: 'Cadastro da camera IP',
  routingSectionTitle: 'Acesso da camera',
  routingSectionDescription:
    'Informe como acessar o stream da camera e qual PDV ou DISPLAY local fica responsavel por acompanhar essa conexao.',
  routingAlertTitle: 'Acesso da camera IP',
  hostMissingBeforeSaveMessage:
    'Informe o IP ou hostname da camera IP antes de salvar.',
  managerRoutingMessage:
    'Selecione qual PDV ou DISPLAY acompanha esta camera IP.',
  saveBeforeRoutingMessage:
    'Salve primeiro o cadastro da camera IP antes de configurar o acesso.',
  footerDebugDescription:
    'Controla se esta camera IP mostra apenas a bolinha discreta do socket no rodape global ou se abre as linhas detalhadas de debug.',
  removeSectionTitle: 'Remover cadastro de rede',
  removeSectionDescription:
    'Use esta acao para excluir apenas o cadastro desta camera na rede. O equipamento responsavel pela comunicacao continua salvo no sistema.',
  removeButtonLabel: 'Remover cadastro de rede',
  removeConfirmTitle: 'Remover camera da rede',
  removeConfirmMessage:
    'Deseja remover o cadastro desta camera na rede? O equipamento responsavel continuara salvo no sistema.',
  removeSuccessMessage: 'Cadastro da camera na rede removido com sucesso.',
  removeErrorMessage: 'Nao foi possivel remover o cadastro da camera na rede.',
};

const profileByType = {
  [PRINT_DEVICE_TYPE]: printerProfile,
  [PRINTER_DEVICE_TYPE]: printerProfile,
  [IP_CAMERA_DEVICE_TYPE]: ipCameraProfile,
};

export const getNetworkDeviceProfile = type =>
  profileByType[normalizeDeviceType(type)] || printerProfile;
