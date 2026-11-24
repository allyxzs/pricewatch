# Contribuindo com o PriceWatch

O compromisso central é simples: uma oscilação acima da meta nunca deve gerar um alerta.

## Ambiente

Use Node.js 22+, execute `npm ci` e copie `.env.example` para `.env.local`. Comece em modo demonstração. PostgreSQL e Redis são necessários apenas para o caminho real.

## Antes de uma mudança

Descreva o comportamento esperado, seu impacto nos alertas e como reproduzir. Para lojas, inclua uma fixture anonimizada mínima com permissão de uso, em vez de dados de uma sessão autenticada.

## Adaptadores de loja

Mantenha validação de hostname, proteção contra SSRF, limites de tempo/tamanho e moeda explícita. Nunca transforme falta de estoque, CAPTCHA ou parsing incompleto em preço zero. Não use um mínimo agregado de variantes como se fosse a oferta escolhida.

Adicione testes para páginas sem preço, indisponíveis e ambíguas. Novos adaptadores devem preservar o contrato de `collect` e usar o caminho de rede validado. Não contorne proteções de acesso de terceiros.

## Verificação

Execute `npm run format`, `npm run typecheck`, `npm test` e `npm run build`. Mudanças no domínio ou persistência também precisam de `npm run test:integration` com `TEST_DATABASE_URL`; mudanças de interação precisam dos testes Playwright relevantes.

Mantenha valores em centavos e UI em português. Prefira componentes acessíveis, textos claros e testes que cubram comportamentos observáveis.

## Pull requests

Explique o problema, a mudança e a validação. Se a interface mudar, atualize as capturas usando a aplicação com dados demonstrativos. Não inclua `.env.local`, tokens, histórico pessoal, `node_modules` ou arquivos de build.
