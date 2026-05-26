## Escopo
- Modulo compartilhado de infraestrutura do front.
- Reune providers, servicos globais, componentes comuns, rotas compartilhadas, stores e utils.

## Estado
- Este modulo tem implementacao ativa em `src/react` e deve constar em novos prompts.
- Se existir `src/vue`, ela e apenas legado e deve ser ignorada, salvo pedido explicito.

## Quando usar
- Prompts sobre helpers compartilhados, `DefaultProvider`, mensageria, impressao, importacao, logs, devices, gateways e utilitarios cross-app.
- O helper compartilhado de dinheiro/manual fica aqui e pode ser reutilizado por `ui-orders`, listeners remotos e outros gateways.
- A execucao tecnica dos gateways operacionais compartilhados, como `Cielo` e `Infinite Pay`, pode ficar aqui para ser reutilizada pelo checkout principal e pelo listener remoto.
- O protocolo de ida e volta do pagamento remoto entre web e device deve ficar centralizado aqui, para que checkout e listener remoto compartilhem a mesma chave de requisicao e o mesmo formato de resposta.
- O bridge nativo de kiosk fica aqui e deve apenas ligar/desligar a infraestrutura Android quando `APP_TYPE=POS` e `pos-operation-mode=kiosk`; regra de fluxo do totem continua no modulo dono.

## Limites
- Nao mover para `ui-common` regra de negocio que pertence claramente a `ui-orders`, `ui-shop`, `ui-manager` ou outro modulo dono.
- `ui-common` pode centralizar a parte tecnica de pagamento sem gateway, mas a decisao de quando usar dinheiro continua no modulo dono do fluxo.
- `ui-common` nao deve montar uma segunda UI de checkout para gateway. Quando houver listener remoto, ele deve executar o mesmo helper compartilhado do fluxo principal.
- Quando a implementacao tecnica do gateway ficar melhor organizada em arquivos separados por provedor no modulo dono, `ui-common` deve apenas orquestrar ou reaproveitar esses arquivos, sem recriar fluxo paralelo.

## Regras de mensageria
- Erros visuais transitrios do sistema devem sair por um unico componente compartilhado ligado ao `MessageService`.
- `showError` e o ponto canonico para esse feedback. Ele recebe string ou objeto de erro, exibe por alguns segundos e some sozinho.
- O card/modal transitorio de erro do `MessageService` e a unica UI permitida para esse feedback. Nao criar segunda tela de erro no modulo.
- Stores compartilhadas tambem devem usar esse fluxo. Quando uma store fizer `SET_ERROR`, o erro visual precisa sair pelo `MessageService`, nunca por caixa local do `StateStore`.
- `StateStore` e o componente canonico de loading/saving. Ele pode receber `store` e `stores` para configurar quais estados acompanhar, mas nao deve ser substituido por loaders locais nas telas consumidoras.
- O `StateStore` deve ler `isLoading` e `isSaving` diretamente dos stores; o erro deve entrar pelo contrato de `SET_ERROR` e ser publicado pelo `storeErrorBridge`, que alimenta o `MessageService`.
- Nao criar banners, alerts ou toasts paralelos para erro quando o caso puder usar o `MessageService`.
- O contrato canonico de erro HTTP do backend e o envelope do `HydratorService` com `@type: Error`, `hydra:title` e `hydra:description`; o `fetch` e os parsers compartilhados devem ler esse formato como fonte principal de mensagem.

## Regras de runtime em background
- O `BackgroundRuntimeBridge` deve manter o registro nativo por package/app, device e empresa para permitir varios APKs instalados no mesmo Android.
- O runtime de background pode ser religado pelo Android com `BOOT_COMPLETED` e `MY_PACKAGE_REPLACED`, reutilizando as inscricoes persistidas para seguir notificando mesmo sem a UI aberta.
- Em nativo, `WebsocketListener.native.js` deve consumir o stream local exposto pelo `BackgroundRuntimeService`, nao abrir websocket direto no backend.
- `WebsocketListener.web.js` e o fluxo web e deve usar runtime compartilhado com owner unico no browser via BroadcastChannel; nao abrir websocket direto do backend nem depender do runtime Android.
- Mensagens entregues pelo runtime nativo devem ser marcadas com `source: 'background-runtime'`, mas todos os apps com som configurado devem continuar processando `order.created` para aviso sonoro mesmo que a notificacao do sistema tambem apareca.
- O som configurado em `device_config` para `order.created` vale para qualquer `APP_TYPE`, incluindo KDS, Manager e PDV; deve ser enviado ao `BackgroundRuntimeService` como configuracao de device e tocado nativamente para funcionar mesmo com o app fechado.
- A configuracao de som do Manager e por usuario e separada da configuracao do device; ela tambem deve ser enviada ao `BackgroundRuntimeService` como configuracao de usuario, sem virar regra global dos demais apps.
- Quando a URL personalizada de audio estiver vazia, o runtime deve cair para o asset `src/assets/sound/caixa.m4a` empacotado no app. URL personalizada continua vencendo o fallback.
- No `MANAGER` Android, o push FCM humano usa canal nativo com `caixa.m4a`; URL personalizada nao pode tocar quando a notificacao chega com o app fechado.
- Alteracoes no protocolo local do runtime precisam manter compatibilidade entre o template do plugin e qualquer arquivo Android gerado.

## Regras de UI compartilhada
- Componentes que implementam comportamento default de listagem/filtros pertencem a `ui-default`.
- `ui-common` pode fornecer helpers e utilitarios usados por esses componentes, mas nao deve manter uma segunda implementacao de `DateShortcutFilter`, `CompactFilterSelector` ou componentes equivalentes de filtro de listagem.
- `DefaultProvider` carrega `menus-people` com `myCompany` e `APP_TYPE` atual e grava o resultado normalizado em `theme.menus`.
- Normalizacao de payload de menu runtime deve ficar em helper compartilhado neste modulo.
- O `RuntimeInfoFooter` deve montar o texto como `nome (identificador) / versao`, usando em runtime web o IP externo lido de `/runtime/ip` e persistido na metadata do device, com `location.hostname` apenas como fallback. No nativo, deve priorizar a versao persistida na metadata do device salvo no backend e o mesmo identificador mostrado na lista de devices (`device_config.device.device`), com fallback local quando o backend ainda nao tiver esse valor.
- O help contextual canônico deve ficar em `ui-common` como componente parametrizado acionado por `?`, com modal proprio e sem reaproveitar `ConfirmModal`. Telas consumidoras nao devem escrever explicacao fixa quando esse padrao estiver disponivel.
