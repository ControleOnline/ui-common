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
- Nao criar banners, alerts ou toasts paralelos para erro quando o caso puder usar o `MessageService`.

## Regras de UI compartilhada
- Componentes que implementam comportamento default de listagem/filtros pertencem a `ui-default`.
- `ui-common` pode fornecer helpers e utilitarios usados por esses componentes, mas nao deve manter uma segunda implementacao de `DateShortcutFilter`, `CompactFilterSelector` ou componentes equivalentes de filtro de listagem.
- `DefaultProvider` carrega `menus-people` com `myCompany` e `APP_TYPE` atual e grava o resultado normalizado em `theme.menus`.
- Normalizacao de payload de menu runtime deve ficar em helper compartilhado neste modulo.
