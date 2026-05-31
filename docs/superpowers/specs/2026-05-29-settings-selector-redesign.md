# Settings Selector Redesign Spec

## Contexto

O menu de `Configurações` centralizou tema, idioma e API, mas os seletores nativos de tema/idioma ficaram visualmente fracos dentro do dropdown. A interação precisa parecer parte do design do app, não um formulário genérico.

## Requisitos

- Remover selects nativos de `Tema` e `Idioma` dentro do menu.
- Usar controles segmentados com botões para:
  - `Dark` / `White`;
  - `Português` / `English`.
- Cada opção deve ter estado selecionado visível.
- Clicar em uma opção deve manter o menu aberto e aplicar a preferência imediatamente.
- O item `API` deve continuar abrindo a configuração de IA.
- O menu deve manter proporções compactas, com ícones e alinhamento consistente com a topbar.

## TDD

1. Atualizar teste do `StudioCommandRail` para abrir o menu e verificar que não existem `combobox`.
2. Testar clique em `Tema: White` e `Idioma: English`.
3. Verificar estado `aria-pressed` da opção ativa.
4. Atualizar teste de página para usar os novos botões no menu.
5. Rodar RED antes da implementação.
6. Implementar e rodar `npm run verify`.

## Verificação

- RED confirmado em `npx vitest run src/components/StudioCommandRail.test.tsx src/app/page.test.tsx`: falhou porque o menu ainda expunha dois `combobox` nativos e não tinha botões `Tema: White` / `Idioma: English`.
- GREEN confirmado no mesmo comando: 7 testes passando.
- `npm run verify`: lint, typecheck, 46 testes e build passando.
- Validação visual em `localhost:3000`: o menu passou a usar botões segmentados com ícones, destaque ativo e check visual; tema/idioma trocam mantendo o menu aberto.
