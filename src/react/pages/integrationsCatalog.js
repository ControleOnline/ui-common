import {getOrderChannelLogo} from '@assets/ppc/channels';

const buildLogo = app => {
  try {
    return getOrderChannelLogo({app});
  } catch {
    return null;
  }
};

export const INTEGRATION_LIST = [
  {
    key: '99food',
    label: '99Food',
    route: 'MarketplaceIntegrationPage',
    routeParams: {
      providerKey: '99food',
    },
    accent: '#F97316',
    logo: buildLogo('99Food'),
  },
  {
    key: 'ifood',
    label: 'iFood',
    route: 'MarketplaceIntegrationPage',
    routeParams: {
      providerKey: 'ifood',
    },
    accent: '#EA580C',
    logo: buildLogo('iFood'),
  },
  {
    key: 'mercadolivre',
    label: 'Mercado Livre',
    route: 'MarketplaceIntegrationPage',
    routeParams: {
      providerKey: 'mercadolivre',
    },
    accent: '#FFE600',
    icon: 'shopping-bag',
  },
  {
    key: 'uber',
    label: 'Uber',
    route: 'UberIntegrationPage',
    accent: '#111827',
    icon: 'truck',
  },
  {
    key: 'asaas',
    label: 'Asaas',
    route: 'AsaasIntegrationPage',
    accent: '#2563EB',
    icon: 'credit-card',
  },
  {
    key: 'clicksign',
    label: 'ClickSign',
    route: 'ClickSignIntegrationPage',
    accent: '#0F172A',
    icon: 'file-text',
  },
  {
    key: 'receita-federal',
    label: 'Receita Federal',
    route: 'IntegrationConfigPage',
    routeParams: {
      providerKey: 'receita-federal',
    },
    accent: '#166534',
    icon: 'file-text',
  },
];

export const INTEGRATION_CONFIGS = {
  uber: {
    key: 'uber',
    label: 'Uber',
    accent: '#111827',
    icon: 'truck',
    description:
      'Conecte sua conta Uber para descobrir e provisionar a store automaticamente.',
    oauthConnect: true,
    authorizationEndpoint:
      '/marketplace/integrations/uber/store/authorization-page',
    connectLabel: 'Conectar Uber',
    requiredKeys: ['OAUTH_UBER_STORE_ID'],
    fields: [],
  },
  asaas: {
    key: 'asaas',
    label: 'Asaas',
    accent: '#2563EB',
    icon: 'credit-card',
    description: 'Chaves da conta para cobranca/PIX e token exclusivo do Webhook Asaas.',
    saveLabel: 'Salvar Asaas',
    requiredKeys: ['asaas-key', 'asaas-receiver-pix-key', 'asaas-webhook-token'],
    fields: [
      {
        key: 'asaas-key',
        label: 'Asaas key',
        placeholder: 'Informe a chave de acesso do Asaas',
        secureTextEntry: true,
      },
      {
        key: 'asaas-receiver-pix-key',
        label: 'Receiver PIX key',
        placeholder: 'Informe a chave PIX de recebimento',
        secureTextEntry: true,
      },
      {
        key: 'asaas-webhook-token',
        label: 'Webhook token',
        placeholder: 'Token de autenticacao do Webhook no painel Asaas',
        secureTextEntry: true,
      },

    ],
  },
  clicksign: {
    key: 'clicksign',
    label: 'ClickSign',
    accent: '#0F172A',
    icon: 'file-text',
    description:
      'Chave usada pelo fluxo de assinatura e webhook da empresa atual.',
    saveLabel: 'Salvar ClickSign',
    requiredKeys: ['clicksign-key'],
    fields: [
      {
        key: 'clicksign-key',
        label: 'ClickSign key',
        placeholder: 'Informe a chave da ClickSign',
        secureTextEntry: true,
      },
    ],
  },

  'receita-federal': {
    key: 'receita-federal',
    label: 'Receita Federal',
    accent: '#166534',
    icon: 'file-text',
    description:
      'Configuracoes fiscais por tipo de documento (NF-e, cupom, NFS-e, CT-e, pre-notas).',
    saveLabel: 'Salvar configuracoes fiscais',
    requiredKeys: [
      'receita-federal-tax-regime',
      'receita-federal-certificate-file',
      'receita-federal-certificate-password',
    ],
    tabs: [
      {
        key: 'general',
        label: 'Gerais',
        description: 'Dados compartilhados pela empresa para emissao fiscal.',
        fields: [
          {
            key: 'receita-federal-tax-regime',
            label: 'Regime tributario',
            type: 'select',
            options: [
              { value: '1', label: 'Simples Nacional' },
              { value: '2', label: 'Simples Nacional - excesso sublimite' },
              { value: '3', label: 'Regime Normal' },
            ],
          },
          {
            key: 'receita-federal-environment',
            label: 'Ambiente SEFAZ',
            type: 'select',
            options: [
              { value: '2', label: 'Homologacao' },
              { value: '1', label: 'Producao' },
            ],
          },
          {
            key: 'receita-federal-certificate-file',
            label: 'Certificado digital (.pfx / .p12)',
            type: 'file',
            accept: '.pfx,.p12,application/x-pkcs12',
            fileContext: 'company_certificate',
            companyScopedFilePicker: true,
          },
          {
            key: 'receita-federal-certificate-password',
            label: 'Senha do certificado',
            placeholder: 'Informe a senha do certificado',
            secureTextEntry: true,
          },
          {
            key: 'receita-federal-state-registration',
            label: 'Inscricao estadual',
            placeholder: 'IE do emitente',
          },
          {
            key: 'receita-federal-ibge-code',
            label: 'Codigo IBGE do municipio',
            placeholder: 'Ex.: 3522505',
          },
        ],
      },
      {
        key: 'nfe',
        label: 'NF-e (produtos)',
        description: 'Nota Fiscal Eletronica modelo 55 — saida de mercadorias.',
        fields: [
          {
            key: 'receita-federal-nfe-serie',
            label: 'Serie NF-e',
            placeholder: 'Ex.: 1',
          },
        ],
      },
      {
        key: 'nfce',
        label: 'NFC-e / Cupom',
        description: 'Cupom fiscal eletronico modelo 65 — consumidor final.',
        fields: [
          {
            key: 'receita-federal-nfce-serie',
            label: 'Serie NFC-e',
            placeholder: 'Ex.: 1',
          },
        ],
      },
      {
        key: 'nfse',
        label: 'NFS-e (servicos)',
        description: 'Nota de servicos eletronica — prestacao de servicos.',
        fields: [
          // NFS-e provider-specific fields are not supported by the current backend.
        ],
      },
      {
        key: 'cte',
        label: 'CT-e',
        description: 'Conhecimento de Transporte Eletronico.',
        fields: [
          {
            key: 'receita-federal-cte-serie',
            label: 'Serie CT-e',
            placeholder: 'Ex.: 1',
          },
          {
            key: 'receita-federal-cte-rntrc',
            label: 'RNTRC',
            placeholder: 'Registro da transportadora na ANTT',
          },
        ],
      },
    ],
    fields: [],
  },
};

export const getIntegrationListItem = key =>
  INTEGRATION_LIST.find(item => item.key === key) || null;

export const getIntegrationConfig = key => INTEGRATION_CONFIGS[key] || null;

export const parseIntegrationCollection = response => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.member)) {
    return response.member;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.['hydra:member'])) {
    return response['hydra:member'];
  }

  return [];
};

export const getIntegrationByKey = (response, key) => {
  const normalizedKey = String(key || '')
    .trim()
    .toLowerCase();

  if (!normalizedKey) {
    return null;
  }

  return (
    parseIntegrationCollection(response).find(
      item =>
        String(item?.key || '')
          .trim()
          .toLowerCase() === normalizedKey,
    ) || null
  );
};
