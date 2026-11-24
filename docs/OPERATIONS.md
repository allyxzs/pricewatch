# Operação

## Processos e infraestrutura

O frontend/API e o worker são processos separados. Para executar uma build local de produção:

```bash
npm ci
npm run build
npm run db:migrate
npm run start
```

Em outro processo, com o mesmo ambiente:

```bash
npm run worker
```

O processo Next carrega `.env.local`; os scripts Node de migração e worker também o carregam explicitamente. Em uma plataforma que injeta variáveis sem arquivo, use `node --import tsx worker/index.ts` e `node --import tsx scripts/migrate.ts` diretamente. O worker utiliza `tsx`, então a instalação precisa incluir essa dependência de desenvolvimento, ou um pipeline deve compilá-lo antes.

Hospede a aplicação Next em um ambiente compatível com Node e o worker em um serviço de execução contínua. Não inicie o worker dentro de uma função HTTP serverless. Mantenha PostgreSQL e Redis persistentes; o Redis deve usar política `noeviction` e, preferencialmente, AOF. O Compose é para infraestrutura local, não um deploy público completo.

Use TLS nas conexões remotas conforme seu provedor, uma senha forte, `APP_URL` HTTPS e backups do PostgreSQL. A migração inicial é idempotente; evoluções futuras devem ter novos arquivos versionados. Não exponha diretamente as portas de banco e Redis.

## Variáveis

| Variável               | Uso                                                                  |
| ---------------------- | -------------------------------------------------------------------- |
| `DEMO_MODE`            | Apenas o valor literal `false` habilita o modo real                  |
| `APP_URL`              | Origem exata da aplicação, sem variação de hostname                  |
| `DATABASE_URL`         | URL PostgreSQL para web e worker                                     |
| `REDIS_URL`            | URL Redis para o worker                                              |
| `OWNER_PASSWORD`       | Senha pessoal, mínimo de 16 caracteres                               |
| `SESSION_SECRET`       | Segredo de assinatura, mínimo de 32 caracteres                       |
| `CHECK_INTERVAL_HOURS` | Intervalo numérico entre 1 e 6, padrão 3                             |
| `RESEND_API_KEY`       | Chave de envio; somente no servidor                                  |
| `RESEND_FROM`          | Remetente verificado, por exemplo `PriceWatch <alertas@seu-dominio>` |
| `TELEGRAM_BOT_TOKEN`   | Token do bot; somente no servidor                                    |

Trocar `SESSION_SECRET` invalida todas as sessões. Trocar apenas `OWNER_PASSWORD` não revoga sessões existentes; altere ambos quando precisar revogar o acesso.

## Quando algo falha

| Sintoma                        | Verificação                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- |
| API retorna erro de banco      | `DATABASE_URL`, migração e conectividade                                    |
| Produto fica aguardando coleta | Worker iniciado, Redis acessível e próximo ciclo da agenda                  |
| Falha HTTP 403 ou CAPTCHA      | A página não permite a coleta atual; use outra oferta compatível            |
| Página redireciona             | Cadastre a URL HTTPS final e completa, sem encurtadores                     |
| JSON-LD ambíguo                | Use a página de uma variante; um adaptador específico pode ser necessário   |
| Meta total sem preço válido    | Informe o frete da oferta, inclusive `0` quando grátis                      |
| Oferta ficou antiga            | Verifique os erros do coletor; amostras de mais de 7h ficam inelegíveis     |
| Login bloqueado                | Aguarde a janela de 15 minutos; o limite é global para a instalação pessoal |
| Origem não autorizada          | Abra exatamente a origem configurada em `APP_URL`                           |
| Alerta pendente                | Confirme canal, credenciais e execução do despachante                       |
| Telegram “Conferir entrega”    | Confira a conversa e o estado no provedor; não duplique o envio cegamente   |

O frete é informado manualmente no cadastro. Para corrigir o frete de uma oferta nesta versão, remova e adicione a URL novamente; isso remove o histórico daquela oferta. A edição de frete sem perder histórico é uma melhoria futura.

## Caixa de saída

`notifications` registra `pending`, `sending`, `sent`, `cancelled`, `expired`, `failed` e `uncertain`. `sent` significa que o provedor aceitou o envio, não que o destinatário leu a mensagem.

Sem credenciais de um canal ativado, o evento permanece pendente com erro de configuração e é reavaliado depois de cinco minutos. Expira após 23h. Um evento cancelado, expirado ou com falha definitiva não destrava o episódio automaticamente. Isso favorece ausência de spam, mas pode exigir intervenção após corrigir a configuração.

Antes de rearmar um produto manualmente, confira se a mensagem anterior chegou e se o preço ainda é válido. Em uma manutenção controlada, o proprietário pode limpar `products.latched` pelo ID do produto; preserve `last_alert` para manter o intervalo de 24h. Não apague registros enviados nem troque IDs para forçar retentativas do Resend.

O painel exibe os cem eventos mais recentes. O gráfico lê até 180 amostras recentes por oferta; todas as amostras continuam no banco. Não há política automática de expurgo. Planeje retenção e backup conforme o tamanho da lista.

## Validação desta entrega

- Testes unitários da comparação, centavos, frete, disponibilidade, frescor, cooldown, sessão, origem e parser.
- Integração com PostgreSQL real: transações concorrentes, episódios, caixa de saída, cancelamento e exclusão em cascata.
- Navegador Chromium: criação, edição, pausa, remoção, filtros, preferências, persistência e layout móvel.
- Compilação de produção e checagem de tipos.

A coleta em páginas comerciais reais e a entrega real via Resend/Telegram **não foram validadas nesta entrega**. Os testes do parser usam fixtures; os testes de envio usam respostas controladas. A agenda BullMQ exige Redis no ambiente de execução. Antes de depender dos avisos, valide uma URL de cada loja desejada e o recebimento em seus próprios canais.

## Referências dos provedores

- [Next.js: instalação e execução](https://nextjs.org/docs/app/getting-started/installation)
- [BullMQ: Job Schedulers](https://docs.bullmq.io/guide/job-schedulers)
- [Resend: Send Email](https://resend.com/docs/api-reference/emails/send-email)
- [Telegram Bot API](https://core.telegram.org/bots/api)
