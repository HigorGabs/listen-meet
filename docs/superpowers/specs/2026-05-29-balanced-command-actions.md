# Balanced Command Actions Spec

## Contexto

O status superior da IA ainda parece um card de duas linhas, ficando maior que o botão `Configurações`. No console de captura, `Iniciar Gravação` e `Testar Áudio` também ficaram visualmente desbalanceados porque usam larguras diferentes e altura excessiva.

## Requisitos

- O status superior da IA deve ter a mesma altura e largura base do botão `Configurações`.
- O status superior deve mostrar apenas o estado atual, como `Conectado` ou `Pendente`, mantendo os detalhes completos no rótulo acessível.
- `Iniciar Gravação` e `Testar Áudio` devem ocupar colunas equivalentes em desktop.
- Os dois botões principais de captura devem ter a mesma altura, mesma base tipográfica e peso visual proporcional.
- O comportamento de abrir configurações, trocar abas, iniciar gravação e testar áudio não deve mudar.

## TDD

1. Atualizar os testes do `StudioCommandRail` para exigir status compacto (`h-10`, `sm:w-40`) e sem título visível `Rota de IA`/`AI Route`.
2. Atualizar os testes do `AdvancedAudioRecorder` para exigir botões de ação balanceados (`sm:grid-cols-2`, `h-12` nos dois botões).
3. Rodar RED com os testes focados.
4. Implementar somente classes e composição visual necessárias.
5. Rodar GREEN focado e `npm run verify`.
