# Arquitetura e decisões

## Dois modos com responsabilidades diferentes

`DEMO_MODE=true` (padrão) renderiza a interface com estado local no navegador. O servidor recusa operações de dados; o worker recusa iniciar. Nenhuma configuração de canal torna o demo capaz de enviar mensagens. O modo é decidido no servidor e passado à interface.

`DEMO_MODE=false` usa PostgreSQL, sessão pessoal e worker independente. Não existe fallback de banco para dados fictícios. Uma falha no banco aparece como falha.

## Estrutura

| Caminho        | Responsabilidade                                      |
| -------------- | ----------------------------------------------------- |
| `app/`         | Layout, página e API                                  |
| `components/`  | Painel, formulários, diálogos, gráficos e ilustrações |
| `lib/model.ts` | Tipos, dinheiro, validade de oferta e estado visual   |
| `lib/rules.ts` | Regra pura de elegibilidade e antispam                |
| `lib/demo.ts`  | Exemplos claramente fictícios                         |
| `lib/server/`  | Autenticação, validação de rede, coleta e repositório |
| `worker/`      | Agenda, coleta, avaliação transacional e entrega      |
| `db/`          | Migração SQL inicial idempotente                      |
| `tests/`       | Casos unitários, integração e navegador               |
| `docs/`        | Arquitetura, operação e capturas reais                |

## Dinheiro e ofertas

Todos os valores monetários usam inteiros em centavos. O preço-alvo é inclusivo. O frete é `null` quando desconhecido e `0` quando informado como grátis. O sistema nunca converte `null` em frete grátis para tomar uma decisão.

Ofertas só participam da comparação se estiverem disponíveis, sem erro de coleta e com amostra de no máximo sete horas. Isso comporta a agenda máxima de seis horas com uma hora de margem. Não se usa uma oferta antiga como se fosse atual.

A identidade entre URLs é confirmada pelo proprietário. Não há correspondência automática por nome, seller, GTIN ou SKU. O valor JSON-LD pode representar uma condição de pagamento específica; essa condição deve ser confirmada na loja. Frete informado é uma estimativa manual até a compra.

## Coleta conservadora

O coletor aceita somente HTTPS, hostnames exatos e porta padrão. Resolve DNS, rejeita endereços privados/reservados e fixa o endereço verificado na conexão TLS, preservando a verificação de certificado pelo hostname. Redirecionamentos não são seguidos. Há limite de 15 segundos e 3 MB por resposta; a página não é executada em um navegador.

É necessário encontrar exatamente um `Product` e um `Offer`, com preço positivo, moeda BRL e disponibilidade explícita. `AggregateOffer`, variantes ambíguas e recomendações adicionais são rejeitados. Essa escolha reduz cobertura para evitar falsos alertas.

Falhas atualizam `offers.error`, sem fabricar um preço ou destruir o último histórico válido. Preços indisponíveis podem ser armazenados como amostras, mas não qualificam nem aparecem na série de ofertas disponíveis.

## Transações e antispam

`evaluateProduct` bloqueia a linha do produto, relê suas ofertas e avalia a condição usando a meta atual. O evento e o estado `latched` são gravados juntos. O índice único por produto, episódio e canal protege a caixa de saída contra avaliações concorrentes.

O estado permanece travado enquanto houver qualquer oferta válida abaixo da meta. Só todas as ofertas válidas acima da meta permitem rearmar automaticamente. Uma coleta com falha não prova uma subida. Uma nova meta pode rearmar, mas o intervalo de 24h permanece.

O worker executa um job por vez globalmente. A coleta de cada oferta é isolada: a falha de uma URL não impede salvar as demais. Uma lista inteira é verificada em sequência; listas grandes e sites lentos podem atrasar a agenda. O MVP limita a 100 produtos e 8 ofertas por produto.

## Entrega

A caixa de saída persiste no PostgreSQL. O despachante usa `FOR UPDATE SKIP LOCKED` para reivindicar uma mensagem. Antes de enviá-la, verifica se o canal/destinatário continua ativo, se o produto não está pausado, se a meta não mudou e se ainda existe uma oferta válida elegível.

A mensagem apresenta o preço **coletado no evento**, não uma promessa de preço em tempo real. O usuário confirma preço final e condições no destino. Uma mudança entre a verificação e o envio pode ocorrer; a transação não controla as lojas externas.

Resend: até cinco tentativas com a mesma chave, intervalo de cinco minutos e expiração em 23h, dentro da janela de idempotência de 24h. Telegram: uma falha de entrega fica `uncertain`; não há reenvio automático sem saber se a primeira tentativa chegou. Após uma interrupção do worker, mensagens em `sending` há mais de cinco minutos seguem a mesma política por canal.

## Modelo de segurança

A instalação tem **um proprietário**, sem tenant ou cadastro público. Cookies assinados duram sete dias, são HttpOnly e SameSite=Strict; `Secure` acompanha o HTTPS de `APP_URL`. Todas as mutações autenticadas exigem origem exata. O login limita globalmente a vinte tentativas a cada quinze minutos no banco, compatível com o escopo pessoal.

Tokens de provedores e segredo de sessão ficam no ambiente. SQL usa parâmetros; entradas passam por Zod. As APIs limitam corpos a 16 KB. E-mails são texto simples, sem interpolação de HTML.

O acesso é um ponto inicial para hospedagem pessoal. Um serviço público multiusuário exige autenticação dedicada, isolamento por usuário, quotas por conta, revisão de abuso, política de dados e observabilidade adicional.
