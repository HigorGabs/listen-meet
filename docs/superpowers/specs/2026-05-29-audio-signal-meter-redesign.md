# Audio Signal Meter Redesign Spec

## Contexto

O medidor atual de `Sinal ao vivo` usa 24 barras com altura baseada em `index % 6`. Visualmente isso gera quatro picos repetidos, parecendo decoração estática em vez de captação de áudio.

## Direção

Trocar o visual por um `Espectro de captação`:

- mais amostras visuais, sem repetição óbvia;
- alturas determinísticas, mas orgânicas;
- cor por faixa de intensidade: verde para normal, âmbar para alto, vermelho para clipping;
- percentual e estado continuam acessíveis;
- incluir uma barra de presença horizontal para leitura rápida do volume;
- preservar `role="meter"` e os atributos ARIA.

## Fora De Escopo

- Não alterar lógica do hook de áudio.
- Não alterar permissões ou captura do microfone.
- Não introduzir biblioteca visual.

## TDD

- Atualizar teste do `AudioLevelMeter` para esperar `Espectro de captação`.
- Esperar 40 barras `audio-spectrum-bar`.
- Esperar barra `audio-presence-rail`.
- Confirmar `aria-valuenow` arredondado e `data-state`.
