# Validação da versão 0.1.0

Verificada em 24 de novembro de 2026.

| Verificação                                        | Resultado        |
| -------------------------------------------------- | ---------------- |
| TypeScript em modo estrito                         | Aprovado         |
| Build de produção Next.js                          | Aprovada         |
| Formatação Prettier                                | Aprovada         |
| Testes unitários                                   | 28 aprovados     |
| Integração PostgreSQL e API HTTP                   | 12 aprovados     |
| Fluxos de navegador Chromium                       | 4 aprovados      |
| Erros de execução do navegador durante as capturas | Nenhum observado |

## Cobertura exercitada

- Limites de preço inclusivos, centavos, frete e preços antigos.
- Repetição de ofertas abaixo da meta, rearme e intervalo de 24h.
- Disponibilidade, moedas e parsing de JSON-LD não ambíguo.
- Hosts permitidos e classificação de endereços de rede.
- Sessões assinadas, origem, login/logout e cookie HttpOnly.
- CRUD HTTP, limites do corpo, validação de preferências e URLs duplicadas.
- Oito avaliações concorrentes gerando apenas um evento por canal.
- Repetição de envio de e-mail com chave estável e incerteza no Telegram.
- Cancelamento de alertas pendentes e exclusão em cascata.
- Cadastro, edição, simulação, persistência local, pausa e remoção pela interface.
- Filtros, busca, adição de ofertas, preferências e navegação móvel sem overflow horizontal.
- Frete desconhecido impedindo alerta de preço total também na demonstração.

## Limites da validação

O PostgreSQL foi executado localmente em um ambiente de teste isolado; os testes HTTP usaram a build de produção. O navegador foi Chromium headless. As capturas presentes no README vieram dessa aplicação em execução.

Os provedores de envio foram substituídos por respostas controladas. Nenhum e-mail ou Telegram real foi enviado. Não houve coleta validada em páginas comerciais reais nem execução da agenda contra um Redis real. Esses caminhos requerem validação operacional com a infraestrutura e as páginas escolhidas pelo proprietário.

As capturas demonstram a interface, não atestam ofertas reais ou compatibilidade comercial das lojas. Não foi realizada auditoria externa de segurança ou acessibilidade.
