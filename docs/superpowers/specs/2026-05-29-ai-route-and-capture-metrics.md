# AI Route And Capture Metrics Spec

## Contexto

O header atual mostra `Rota de IA` com provedor, modelo, origem da chave, contagem de modelos e estado. A informação é útil, mas ficou desproporcional no topo da aplicação e compete com a navegação principal.

Dentro da `Console de captura`, os cards `Limite 4MB` e `Saída TXT` também não ajudam a decidir se a gravação está pronta. O limite de 4MB é uma política estática de upload definida em `MAX_AUDIO_UPLOAD_BYTES`; faz sentido na área de upload e na validação, não como métrica operacional da captura. `TXT` é formato de exportação, não uma condição de gravação.

## Objetivo

Reduzir o header para comunicar apenas o estado essencial da IA e trocar as métricas da console por dados úteis durante captura.

## Requisitos

- O bloco `Rota de IA` no header deve exibir visualmente apenas:
  - título `Rota de IA`;
  - estado `Conectado` quando a IA estiver configurada;
  - estado `Pendente` quando faltar configuração.
- Detalhes como provedor, modelo, origem da chave e contagem de modelos devem continuar disponíveis em áreas de configuração/readiness, mas não ocupar espaço no header.
- A console de captura não deve exibir `Limite 4MB` como card operacional.
- A console de captura não deve exibir `Saída TXT` como card operacional.
- As métricas da console devem mostrar:
  - `Fonte`: `Microfone` por padrão ou `Upload` após arquivo carregado;
  - `Sinal`: percentual arredondado do nível de áudio;
  - `Modo`: estado curto da captura, como `Pronto`, `Ao vivo`, `Pausado` ou `Teste`.
- O limite de upload de 4MB continua definido em `src/lib/audio-constraints.ts` e visível apenas no card de upload e mensagens de validação.

## TDD

1. Atualizar o teste de `StudioCommandRail` para esperar `Conectado` e garantir que provedor, modelo, origem da chave e contagem de modelos não apareçam como texto visível no header.
2. Atualizar o teste de `AdvancedAudioRecorder` para esperar `Fonte`, `Sinal`, `Modo`, `Microfone`, `0%` e `Pronto` no estado inativo.
3. Rodar os testes focados e confirmar falha antes da implementação.
4. Implementar a alteração mínima.
5. Rodar testes focados, depois a verificação completa.
