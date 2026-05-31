# Themes, Readiness And Minimum Duration Spec

## Contexto

O Listen Meet precisa de três ajustes de produto:

1. gravações muito curtas não devem ser enviadas para IA;
2. o usuário precisa controlar tema e paleta;
3. o checklist lateral não pode exibir estados OK quando a aplicação ainda não validou microfone ou sinal de áudio.

Também há textos de UI prometendo funcionalidades que não existem diretamente, como `Arraste arquivos` sem dropzone e o chip `Sistema` sugerindo captura nativa de áudio do sistema.

## Requisitos

### Gravações Curtas

- Gravações feitas pelo microfone com menos de 5 segundos devem ser descartadas.
- Uma gravação descartada não deve chamar `onRecordingComplete`, não deve abrir processamento de IA e não deve criar item no histórico.
- O usuário deve receber uma mensagem inline explicando que precisa gravar pelo menos 5 segundos.
- Uploads continuam seguindo a validação de arquivo existente; a regra de 5 segundos se aplica à gravação direta.

### Temas E Paleta

- A aplicação deve oferecer três temas:
  - `Padrão`, mantendo a identidade atual do app;
  - `Dark`, com base mais neutra/escura;
  - `White`, com superfícies claras.
- O tema deve ser persistido em `localStorage`.
- O usuário deve poder escolher cor principal e cor secundária por seletores de cor.
- As cores escolhidas devem ser persistidas em `localStorage`.
- Header, shell, painéis principais, ações primárias e realces de status devem consumir variáveis de tema/paleta em vez de depender apenas de cores fixas.

### Checklist Real

- `Microfone Conectado` não pode ser hardcoded como OK.
- `Sinal de Áudio Detectado` não pode depender de `!isProcessing`.
- O gravador deve reportar para a página:
  - se existem dispositivos de áudio carregados;
  - se existe sinal de áudio detectado;
  - se há erro de captura/permissão.
- A lateral deve mostrar estados pendentes quando esses sinais ainda não foram confirmados.
- A lateral deve exibir estado OK apenas com base nesses dados reais.

### Auditoria De UI Não Implementada

- Remover ou ajustar textos que prometem drag-and-drop se o componente só oferece seleção por botão.
- Remover o chip `Sistema` da matriz quando não existe captura nativa de sistema; o usuário pode capturar sistema via dispositivo virtual escolhido no seletor.

## TDD

1. Adicionar constante/função para duração mínima e testar que gravação de 4 segundos é descartada, enquanto 5 segundos é processável.
2. Atualizar `AdvancedAudioRecorder.test.tsx` para garantir que gravação curta não chama `onRecordingComplete` e exibe aviso.
3. Atualizar `SessionReadinessPanel.test.tsx` para exigir readiness recebido por props, com estados pendentes por padrão e OK apenas quando os sinais vierem reais.
4. Atualizar `StudioCommandRail.test.tsx` para exigir seletor de tema e dois inputs de cor.
5. Atualizar `page.test.tsx` para validar persistência/aplicação do tema no `document.documentElement`.
6. Implementar o mínimo para passar os testes, depois rodar `npm run verify`.
