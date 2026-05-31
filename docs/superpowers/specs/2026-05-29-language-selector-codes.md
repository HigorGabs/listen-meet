# Language Selector Codes Spec

## Contexto

O seletor de tema ficou adequado com opções lado a lado. O seletor de idioma ainda ocupa muito espaço porque mostra nome completo (`Português`, `English`) em linhas separadas. A nova direção é usar apenas siglas e deixar as opções lado a lado.

## Requisitos

- O seletor de idioma deve usar botões lado a lado, como o seletor de tema.
- Os botões devem mostrar apenas `BR` e `EN`.
- Os nomes completos dos idiomas não devem aparecer visualmente dentro do menu.
- O estado ativo deve continuar claro.
- A troca de idioma deve continuar funcionando e mantendo o menu aberto.
- O item `API` deve continuar funcionando.

## TDD

1. Atualizar `StudioCommandRail.test.tsx` para esperar botões `Idioma: BR` e `Idioma: EN`.
2. Garantir que `Português` e `English` não aparecem como texto visível dentro do menu.
3. Atualizar `page.test.tsx` para trocar idioma via `Idioma: EN`.
4. Rodar RED antes da implementação.
5. Implementar o layout lado a lado e rodar `npm run verify`.

## Verificação

- RED confirmado em `npx vitest run src/components/StudioCommandRail.test.tsx src/app/page.test.tsx`: falhou porque os botões ainda eram `Idioma: Português` e `Idioma: English`.
- GREEN confirmado no mesmo comando após a implementação: 7 testes passaram.
- `npm run verify` passou após remover artefatos duplicados gerados em `.next/types/* 2.ts`: lint, typecheck, 46 testes e build.
