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

## Limites
- Nao mover para `ui-common` regra de negocio que pertence claramente a `ui-orders`, `ui-shop`, `ui-manager` ou outro modulo dono.
- `ui-common` pode centralizar a parte tecnica de pagamento sem gateway, mas a decisao de quando usar dinheiro continua no modulo dono do fluxo.
- `ui-common` nao deve montar uma segunda UI de checkout para gateway. Quando houver listener remoto, ele deve executar o mesmo helper compartilhado do fluxo principal.
