<p align="center">
  <img src="docs/banner.svg" alt="PriceWatch — Seu preço. Seu momento." width="100%" />
</p>

<p align="center">
  <img alt="Versão 0.1.0" src="https://img.shields.io/badge/versão-0.1.0-7960d7?style=flat-square" />
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-202431?style=flat-square" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-persistência-4169e1?style=flat-square" />
  <img alt="Licença MIT" src="https://img.shields.io/badge/licença-MIT-5caa88?style=flat-square" />
</p>

<p align="center"><strong>Preço mudou? Tudo bem.<br/>Chegou na sua meta? Aí sim, um aviso.</strong></p>

<p align="center">
  <a href="#a-experiência">Interface</a> ·
  <a href="#experimente-em-minutos">Começar</a> ·
  <a href="#do-demo-ao-monitoramento-real">Modo real</a> ·
  <a href="#como-o-antispam-funciona">Antispam</a> ·
  <a href="#o-que-entra-nesta-versão">Escopo</a>
</p>

---

## Uma compra boa não precisa de cinquenta notificações

Você sabe quanto quer pagar. O PriceWatch acompanha os produtos da sua lista e avisa quando uma oferta válida chega ao valor definido — ou fica abaixo dele.

Uma redução de R$ 2.199 para R$ 2.099 não merece interromper o seu dia se a sua meta é R$ 1.800. Uma oferta de R$ 1.799, sim.

**Este é um MVP funcional para uso pessoal, com um único proprietário.** A demonstração funciona sem serviços externos. O modo real inclui API, persistência, worker e integrações de envio; depende da configuração dos serviços e da compatibilidade das páginas das lojas.

## A experiência

### Um lugar para todas as suas próximas compras

Lista de desejos, preço-alvo, melhor oferta válida e estados visuais: **meta atingida**, **quase lá**, **acompanhando**, **pausado** e **sem preço válido**.

![Painel PriceWatch com lista de desejos, metas e comparação de lojas](docs/screenshots/dashboard.png)

### O contexto também importa

Compare o histórico por loja, ajuste sua meta e pause o monitoramento quando quiser. O gráfico mostra a meta como uma linha de referência e permite selecionar 7, 30 ou 90 dias, limitado às 180 amostras mais recentes de cada oferta.

![Detalhes de um produto, gráfico de preços e ofertas por loja](docs/screenshots/history.png)

<details>
<summary><strong>Também cabe no celular</strong></summary>
<br />
<img src="docs/screenshots/mobile.png" alt="Painel responsivo do PriceWatch no celular" width="310" />
</details>

> As capturas são da aplicação executando de verdade em modo demonstração. Produtos, históricos e valores são fictícios; não são ofertas comerciais. As ilustrações dos produtos são vetores locais.

## O que entra nesta versão

| Recurso                | Entrega em v0.1                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Lista de desejos       | Adicionar, editar meta, pausar, retomar e excluir produtos                                                         |
| Cadastro por link      | Identificação experimental de nome, preço e disponibilidade via JSON-LD; nome manual quando a identificação falhar |
| Busca por nome         | Busca e filtros **dentro da sua lista**, sem busca global em lojas                                                 |
| Comparação entre lojas | Várias URLs vinculadas manualmente ao mesmo produto; até 8 ofertas por produto                                     |
| Preço-alvo             | Valores em centavos e condição inclusiva: preço ≤ meta                                                             |
| Produto + frete        | Considera o frete informado pelo usuário; frete desconhecido não qualifica                                         |
| Histórico              | Cada coleta válida salva no PostgreSQL, mesmo sem alteração de preço                                               |
| Alertas                | Resend (e-mail), Telegram e painel com estado de entrega                                                           |
| Antispam               | Um evento por período abaixo da meta e intervalo mínimo de 24h entre eventos                                       |
| Modo silencioso        | Sempre ativo para preços acima da meta; canais podem ser desativados                                               |
| Demonstração           | Dados locais, edição e simulação de queda; nenhum envio ou scraping                                                |
| Acesso pessoal         | Senha do proprietário, sessão assinada, cookie HttpOnly, validação de origem                                       |
| Qualidade              | Testes unitários, PostgreSQL real, fluxos de navegador e CI                                                        |

**Lojas aceitas pelo coletor experimental:** Amazon Brasil, Magazine Luiza, Mercado Livre e KaBuM!. O domínio aceito não garante que uma página exponha JSON-LD compatível. CAPTCHA, redirecionamentos, páginas com várias variantes e preços ambíguos resultam em erro explícito, nunca em um preço inventado. Não há contorno de proteções nem API oficial contratada nesta versão.

## Experimente em minutos

Requisito: **Node.js 22 ou superior** e npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Abra [localhost:3000](http://localhost:3000). O modo demonstração vem habilitado e não precisa de banco, Redis ou chaves.

1. Explore os seis produtos de exemplo.
2. Abra um produto para comparar lojas e visualizar o histórico.
3. Cadastre um produto com preço fictício acima da sua meta.
4. Clique em **Simular queda** e veja o alerta aparecer no painel.
5. Simule novamente: a mesma condição não gera outro aviso.

Os dados de demonstração ficam no armazenamento local do navegador. Para reiniciar os exemplos, remova a chave `pricewatch-demo-v1` nas ferramentas do navegador.

## Do demo ao monitoramento real

### 1. Prepare PostgreSQL e Redis

O Compose fornece serviços locais com portas expostas apenas em `127.0.0.1`:

```bash
docker compose up -d
```

As credenciais do Compose são para desenvolvimento local. Também é possível usar PostgreSQL e Redis gerenciados, definindo suas URLs em `.env.local`.

### 2. Configure seu ambiente

Em `.env.local`:

```dotenv
DEMO_MODE=false
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://pricewatch:pricewatch@localhost:5432/pricewatch
REDIS_URL=redis://localhost:6379
CHECK_INTERVAL_HOURS=3
```

Gere **dois valores diferentes**, um para `OWNER_PASSWORD` e outro para `SESSION_SECRET`:

```bash
openssl rand -hex 32
```

A senha exige pelo menos 16 caracteres; o segredo de sessão exige pelo menos 32. `APP_URL` deve corresponder à origem exata usada no navegador. Em produção, configure uma URL HTTPS.

### 3. Crie as tabelas e inicie os processos

```bash
npm run db:migrate
npm run dev
```

Em outro terminal:

```bash
npm run worker
```

Entre com a senha do proprietário, cadastre uma URL direta e defina sua meta. **O cadastro não grava o preço de uma prévia como histórico:** a primeira amostra vem da próxima coleta do worker. Adicione outras lojas na tela de detalhes e confira se são o mesmo modelo, capacidade, cor e condição.

O worker agenda coletas a cada 1–6 horas, conforme a configuração, e verifica a caixa de saída a cada minuto. Ele precisa permanecer em execução; a interface sozinha não monitora preços em segundo plano.

### 4. Ative seus canais

**E-mail:** configure `RESEND_API_KEY` e `RESEND_FROM` com um remetente verificado. Na interface, salve o endereço destinatário e ative o canal.

**Telegram:** configure `TELEGRAM_BOT_TOKEN`. Inicie uma conversa com o bot, obtenha seu Chat ID pela API do Telegram e informe o ID em **Preferências**. Tokens nunca vão para o navegador.

Sem um canal ativado, o monitoramento e o histórico continuam funcionando, mas nenhum evento de envio é criado. A demonstração nunca envia mensagens, mesmo com canais selecionados.

## Como o antispam funciona

| Situação                                           | Comportamento                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| Preço acima da meta                                | Salva a coleta, sem alerta                                          |
| Primeira oferta válida ≤ meta                      | Cria um evento por canal habilitado                                 |
| Próximas coletas continuam ≤ meta                  | Mantém o evento já registrado, sem novos alertas                    |
| Todas as ofertas válidas voltam acima da meta      | Rearma o monitoramento para uma nova queda                          |
| Nova queda antes de 24h                            | Aguarda; só avisa depois do intervalo, se ainda estiver na meta     |
| Falha de coleta, indisponibilidade ou preço antigo | Não dispara nem rearma por inferência                               |
| Frete desconhecido com meta total                  | A oferta não participa da decisão                                   |
| Produto pausado                                    | Não coleta nem dispara; cancela envio pendente antes de despachá-lo |

O estado é travado **no banco**, e não apenas na interface. A avaliação usa transação e bloqueio por produto; a restrição única `(produto, episódio, canal)` protege contra eventos duplicados.

E-mails repetem tentativas com a mesma chave de idempotência, dentro da janela de 24h do provedor. O Telegram não fornece a mesma garantia: em caso de entrega incerta, o sistema marca **Conferir entrega** e evita um reenvio automático. Nenhuma integração distribuída é apresentada como entrega exatamente uma vez.

O momento do evento, registrado ao entrar na caixa de saída, inicia o intervalo de 24h. Alterar a meta rearma a condição, mas preserva esse intervalo. Um evento cancelado ou expirado não é recriado enquanto a mesma condição permanecer ativa; consulte [a operação dos alertas](docs/OPERATIONS.md) antes de rearmar manualmente.

## Por dentro

| Camada            | Tecnologia                                                        |
| ----------------- | ----------------------------------------------------------------- |
| Interface         | Next.js App Router, React, TypeScript, Tailwind CSS e CSS próprio |
| Componentes       | Radix Dialog, ícones Lucide e gráficos SVG acessíveis             |
| API               | Route Handlers do Next.js + validação Zod                         |
| Persistência      | PostgreSQL e `pg`, SQL versionado                                 |
| Agenda e execução | BullMQ + Redis, concorrência global de um job                     |
| Coleta            | HTTPS com DNS validado e fixado; parser JSON-LD com Cheerio       |
| Notificações      | Caixa de saída transacional, Resend e Telegram Bot API            |
| Testes            | Node Test Runner, PostgreSQL e Playwright                         |

```mermaid
flowchart TD
  UI[Interface] --> API[API autenticada]
  API --> DB[(PostgreSQL)]
  REDIS[(Redis / BullMQ)] --> WORKER[Worker]
  WORKER --> COLLECT[Coletor JSON-LD]
  COLLECT --> STORES[Lojas permitidas]
  WORKER --> DB
  DB --> RULE[Regra da meta]
  RULE --> OUTBOX[Caixa de saída]
  OUTBOX --> MAIL[E-mail]
  OUTBOX --> TELEGRAM[Telegram]
```

Leia [ARCHITECTURE.md](docs/ARCHITECTURE.md) para decisões de domínio e [OPERATIONS.md](docs/OPERATIONS.md) para configuração, falhas e execução em produção.

## Testes e desenvolvimento

```bash
npm run typecheck
npm test
npm run build
```

Após `npm run build`, os testes de integração criam e removem schemas isolados em um banco de testes e executam a API compilada na porta 3101:

```bash
TEST_DATABASE_URL=postgresql://pricewatch:pricewatch@localhost:5432/pricewatch npm run test:integration
```

Fluxos reais de navegador em modo demonstração:

```bash
npx playwright install chromium
npm run test:e2e
```

```bash
npm run format
npm run format:check
```

A CI executa formatação, tipos, testes unitários, integração com PostgreSQL, compilação e Playwright. Os envios dos testes são substituídos por respostas controladas; não disparam e-mails ou mensagens reais.

## Próximos passos

- [ ] Adaptadores específicos por loja e integrações com APIs oficiais.
- [ ] Busca global por nome e associação automática por GTIN/EAN.
- [ ] Extração e cache de imagens reais dos produtos.
- [ ] Frete calculado por CEP e atualização das condições de pagamento.
- [ ] Menor preço histórico e análise de descontos artificialmente inflados.
- [ ] Web Push e integração com WhatsApp Business.
- [ ] Contas múltiplas, listas compartilháveis e extensão de navegador.
- [ ] Ferramentas na interface para inspecionar e reprocessar falhas de entrega.

Esses itens são planos, não funcionalidades disponíveis nesta entrega.

## Contribuições

Novas lojas, exemplos de JSON-LD anonimizados, melhorias de acessibilidade e casos de teste são bem-vindos. Veja [CONTRIBUTING.md](CONTRIBUTING.md). Não inclua cookies, tokens, dados de compradores nem páginas protegidas em fixtures.

## Licença

[MIT](LICENSE). As marcas citadas pertencem aos seus respectivos titulares; o projeto não é afiliado às lojas.

<p align="center"><strong>Menos ruído. Mais controle sobre a próxima compra.</strong></p>
