# Settings Dropdown Preferences Spec

## Contexto

Tema e idioma ficaram expostos diretamente na barra superior. A nova interação deve concentrar ajustes em `Configurações`, deixando o topo mais limpo e separando preferências gerais da configuração de API.

## Requisitos

- O botão `Configurações` deve abrir um menu suspenso.
- O menu deve conter:
  - seletor de tema com apenas `Dark` e `White`;
  - seletor de idioma com `Português` e `English`;
  - item `API`.
- Tema e idioma não devem aparecer como controles diretos fora do menu.
- Clicar em `API` deve abrir a modal/tela de configuração de IA atual.
- A persistência já existente de tema e idioma deve continuar funcionando.
- O menu deve manter o visual do app e não aumentar a altura da topbar.

## TDD

1. Atualizar `StudioCommandRail.test.tsx` para garantir que tema/idioma só aparecem após abrir `Configurações`.
2. Garantir que selecionar tema/idioma dentro do menu chama os callbacks existentes.
3. Garantir que clicar no item `API` chama `onOpenSettings`.
4. Atualizar `page.test.tsx` para abrir a configuração de IA via `Configurações > API`.
5. Rodar os testes focados em RED antes de alterar produção.
6. Implementar o menu e rodar `npm run verify`.

## Verificação

- RED confirmado em `npx vitest run src/components/StudioCommandRail.test.tsx src/app/page.test.tsx`: falhou porque tema/idioma ainda estavam no topo e `Configurações` abria a API direto.
- GREEN confirmado no mesmo comando: 7 testes passando.
- `npm run verify`: lint, typecheck, 46 testes e build passando.
- Validação visual em `localhost:3000`: topbar sem seletores diretos, `Configurações` abre menu com `Tema`, `Idioma` e `API`, e `API` abre a tela atual de configuração de IA.
