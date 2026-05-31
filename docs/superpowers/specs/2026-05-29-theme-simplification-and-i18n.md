# Theme Simplification And I18n Spec

## Contexto

O seletor atual permite um tema `Padrão`, `Dark`, `White` e ainda expõe duas cores customizadas. A nova direção é remover temas/paletas personalizadas e manter apenas dois temas controlados pelo produto: `Dark` e `White`.

Além disso, o app precisa suportar duas línguas: português do Brasil e inglês.

## Requisitos

### Temas

- Remover o tema `Padrão`.
- Remover seletores de cor principal e secundária.
- Manter apenas `Dark` e `White`.
- Persistir o tema escolhido em `localStorage`.
- Valores antigos de `listen-meet-theme=default` devem cair para `dark`.
- Valores antigos de `listen-meet-palette` devem ser ignorados/removidos.
- O DOM raiz deve continuar recebendo `data-theme`.

### I18n

- Adicionar seletor de idioma com `Português` e `English`.
- Persistir idioma em `localStorage`.
- Idioma padrão: `pt-BR`.
- Valores inválidos devem cair para `pt-BR`.
- Aplicar tradução nas superfícies principais:
  - navegação/topbar;
  - central de captura;
  - configuração de IA;
  - checklist;
  - upload;
  - histórico;
  - modal de guia de captura;
  - mensagens de gravação curta;
  - estados de prontidão.
- Textos dinâmicos de modelo/provedor permanecem como retornados pelo provedor.

## TDD

1. Criar teste de `studio-theme` garantindo apenas `dark` e `white`, e fallback de `default` para `dark`.
2. Criar teste de `i18n` garantindo fallback e strings básicas em `pt-BR` e `en`.
3. Atualizar `StudioCommandRail.test.tsx` para:
   - não encontrar inputs de cor;
   - não encontrar `Padrão`;
   - encontrar seletor de idioma;
   - disparar `onLocaleChange`.
4. Atualizar `page.test.tsx` para:
   - persistir tema e idioma;
   - mudar UI para inglês ao selecionar `English`.
5. Rodar testes focados em RED.
6. Implementar o mínimo para GREEN e depois rodar `npm run verify`.

## Verificação

- `npx vitest run src/lib/studio-theme.test.ts src/lib/i18n.test.ts src/components/StudioCommandRail.test.tsx src/app/page.test.tsx src/components/AdvancedAudioRecorder.test.tsx src/components/SessionReadinessPanel.test.tsx src/components/MeetingsList.test.tsx`: 23 testes passando.
- `npm run verify`: lint, typecheck, 46 testes e build passando.
- Verificação visual em `localhost:3000`: tema `White` ativo, seletor restrito a tema/idioma, idioma alternando para inglês e superfícies principais traduzidas.
