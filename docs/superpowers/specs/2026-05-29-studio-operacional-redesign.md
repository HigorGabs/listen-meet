# Studio Operacional Redesign Spec

## Objetivo

Redesenhar a experiência visual do Listen Meet para parecer uma mesa de gravação profissional, mantendo intactos os fluxos já validados: seleção de provedor/modelo, origem da API key, gravação/upload, processamento de áudio, transcrição e histórico local.

## Direção Visual Aprovada

Direção: **Studio operacional**.

O produto deve transmitir foco, controle e confiabilidade. A interface deve abandonar o visual atual de dashboard genérico com cards claros e fundo azul suave, adotando uma composição mais próxima de um console de áudio: superfícies grafite, contraste controlado, status claro, ações principais evidentes e movimento discreto apenas onde ajuda o usuário a entender o estado da gravação.

## Escopo

- Redesenhar a tela principal de gravação.
- Redesenhar o painel de configuração de IA.
- Redesenhar o medidor de áudio.
- Redesenhar a área de upload.
- Redesenhar a modal auxiliar de configuração/captura de áudio.
- Refinar o histórico de reuniões para combinar com a nova linguagem visual.
- Atualizar tokens globais necessários em `globals.css`.
- Adicionar testes automatizados antes da implementação visual.

## Fora De Escopo

- Alterar providers de IA, endpoints ou regras de fallback.
- Alterar o limite de upload de 4MB.
- Persistir reuniões fora do navegador.
- Implementar upload por storage.
- Criar autenticação.
- Trocar a stack de UI.

## Jornadas Do Usuário

1. Como usuário, quero abrir o app e entender imediatamente qual IA/modelo está ativo, para confiar que a gravação será processada com a configuração correta.
2. Como usuário, quero iniciar/parar/pausar uma gravação com controles claros, para evitar erro durante uma reunião real.
3. Como usuário, quero ver o nível de áudio de forma legível, para saber se o microfone está capturando som.
4. Como usuário, quero alternar entre chave do servidor e minha chave da sessão sem ambiguidade, para controlar qual credencial será usada.
5. Como usuário, quero consultar reuniões anteriores em uma lista organizada, para recuperar resumos e downloads sem esforço.

## Requisitos De UX

### App Shell

- Header compacto, fixo no topo.
- Nome do produto à esquerda.
- Status ativo da IA à direita, exibindo provedor, modelo e origem da chave.
- Botão de configuração com ícone.
- Layout responsivo sem sobreposição em mobile.

### Tela De Gravação

- O gravador deve ser o bloco visual dominante.
- Timer deve ser grande, legível e em fonte monoespaçada.
- Estado atual deve ser explícito: inativo, monitorando, gravando, pausado ou processando.
- A ação principal deve mudar conforme estado:
  - inativo: iniciar gravação;
  - gravando: pausar e parar;
  - pausado: continuar e parar;
  - processando: controles desabilitados.
- O botão de parar deve ter tratamento destrutivo claro, mas não visualmente agressivo fora do estado de gravação.

### Medidor De Áudio

- Substituir o visual atual por barras mais densas e estáveis.
- Animação deve responder ao nível de áudio sem deslocar layout.
- Durante gravação, incluir pulso discreto no indicador de status.
- Em estado inativo, o medidor deve parecer pronto, não quebrado.

### Upload

- Upload deve ser uma ação secundária em formato de zona de envio.
- Exibir formatos suportados e limite de 4MB.
- Manter `input[type=file]` acessível via botão.
- Não competir visualmente com iniciar gravação.

### Configuração De IA

- Manter escolha de provedor.
- Manter escolha explícita da origem da chave: servidor ou sessão.
- Manter listagem de modelos ativos em tempo real.
- Exibir contagem de modelos e origem usada para listar.
- Bloquear salvar quando o provedor não suportar processamento direto de áudio.
- Preservar mensagens de erro já existentes.

### Modal De Configuração De Áudio

- A modal de ajuda deve acompanhar a linguagem visual do studio operacional.
- Deve evitar cartões claros e ilustrações/emoji decorativos.
- Deve manter abas para macOS e Windows.
- Deve manter links externos para BlackHole, VB-Cable, GitHub e OBS.
- Deve organizar passos em blocos densos, legíveis e responsivos.
- Deve manter o alerta de consentimento/privacidade visível.

### Histórico

- Substituir cards altos por lista mais densa e escaneável.
- Métricas no topo devem ser discretas.
- Cada reunião deve mostrar título, data, duração, participantes e resumo curto.
- A expansão deve revelar pontos principais, ações, tópicos e detalhes avançados.
- Download e exclusão devem continuar disponíveis.

## Sistema Visual

### Paleta

- Base: grafite, zinc, slate e branco suave.
- Acento principal: ciano/teal para IA e conexão.
- Acento de gravação: verde para captura ativa.
- Atenção: âmbar para alertas leves.
- Destrutivo: vermelho apenas em parar/excluir/erro.

### Superfícies

- Fundo geral escuro neutro ou grafite com leve variação radial, sem blobs decorativos.
- Painéis com borda sutil e sombra controlada.
- Cards com raio máximo de 8px, respeitando a regra do projeto.
- Evitar cards dentro de cards.

### Tipografia

- Manter Geist.
- Timer e métricas usam `font-mono`.
- Títulos de painel devem ser compactos.
- Evitar hero typography dentro de painéis operacionais.

### Movimento

- Transições entre estados devem durar entre 150ms e 250ms.
- Medidor de áudio pode usar transição de altura/opacidade.
- Gravação ativa pode ter pulso discreto no ponto de status.
- Não usar animações decorativas que distraiam da reunião.

## Arquitetura De Componentes

### Arquivos Modificados

- `src/app/page.tsx`
  - App shell, layout geral, configuração ativa, tela de configuração.
- `src/components/AdvancedAudioRecorder.tsx`
  - Layout e controles do gravador.
- `src/components/AudioLevelMeter.tsx`
  - Visual e estados do medidor.
- `src/components/MeetingsList.tsx`
  - Histórico, filtros, estatísticas e expansão.
- `src/components/AudioSetupModal.tsx`
  - Guia auxiliar de captura de áudio.
- `src/app/globals.css`
  - Tokens visuais e classes base necessárias.
- `README.md`
  - Atualização curta das telas, se necessário.

### Arquivos De Teste A Criar Ou Expandir

- `src/components/AudioLevelMeter.test.tsx`
- `src/components/AdvancedAudioRecorder.test.tsx`
- `src/app/page.test.tsx`
- `src/components/MeetingsList.test.tsx`
- `src/components/AudioSetupModal.test.tsx`

### Dependências De Teste Necessárias

O projeto hoje usa Vitest para lógica pura, mas não tem setup de teste para componentes React. Para TDD de UI, a implementação deve adicionar:

- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `jsdom`

O setup deve ser mínimo e compatível com Vitest.

## Estratégia TDD

Nenhum arquivo de implementação visual deve ser alterado antes de existir um teste falhando para o comportamento que será protegido.

### RED 1: Configuração De IA

Teste: a tela deve exibir origem de chave com opções `Servidor` e `Minha chave`, status de modelo ativo e botão de listar modelos.

Falha esperada antes da implementação: teste não encontra os controles ou não consegue renderizar a página com mocks mínimos.

### RED 2: Gravador

Teste: com estado inativo, deve mostrar timer `00:00`, botão `Iniciar Gravação`, botão `Testar Áudio` e área de upload secundária.

Teste: com estado gravando, deve mostrar `Pausar`, `Parar` e status `Gravando`.

Falha esperada antes da implementação: estrutura atual não expõe os estados e rótulos conforme o novo layout esperado.

### RED 3: Medidor De Áudio

Teste: deve renderizar um número fixo de barras, marcar o estado ativo/inativo por atributo acessível e exibir percentual arredondado.

Falha esperada antes da implementação: componente atual não expõe semântica suficiente para garantir o novo comportamento.

### RED 4: Histórico

Teste: sem reuniões, deve exibir estado vazio com ação `Gravar Nova Reunião`.

Teste: com reuniões mockadas, deve exibir métricas, filtros e permitir expandir uma reunião para ver pontos principais.

Falha esperada antes da implementação: mocks e renderização ainda não estão preparados para o novo contrato visual/comportamental.

### RED 5: Modal De Configuração De Áudio

Teste: a modal aberta deve exibir `Guia de captura`, abas `macOS` e `Windows`, instruções de roteamento e alerta de privacidade/consentimento.

Teste: ao trocar para Windows, deve exibir `VB-Audio Virtual Cable` e manter a ação de fechar.

Falha esperada antes da implementação: a modal atual ainda usa o título antigo e não expõe o novo contrato textual.

### GREEN

Implementar o mínimo necessário para passar cada grupo de testes, em ciclos pequenos:

1. teste falha;
2. implementação mínima;
3. teste passa;
4. refatoração visual limitada;
5. teste continua passando.

### Regressão Obrigatória

Ao final:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- teste manual no navegador em `http://localhost:3000`
- confirmar que a transcrição continua funcionando com `gemini-flash-latest`

## Critérios De Aceite

- A primeira tela parece um produto de gravação profissional, não um dashboard genérico.
- O usuário identifica em até 3 segundos: provedor, modelo, origem da chave e ação principal.
- O estado de gravação é visualmente inequívoco.
- O medidor de áudio é legível e não desloca layout.
- A configuração de IA continua funcional.
- A transcrição continua funcionando.
- O histórico continua permitindo busca, filtro, expansão, download e exclusão.
- Todos os testes automatizados passam.
- Build de produção passa.

## Riscos E Mitigações

- Risco: redesign quebrar fluxo de gravação.
  - Mitigação: mockar `useAdvancedAudioRecorder` nos testes do componente antes de alterar o layout.
- Risco: testes React aumentarem complexidade do setup.
  - Mitigação: setup Vitest mínimo com jsdom e Testing Library.
- Risco: UI escura prejudicar legibilidade.
  - Mitigação: validar contraste visual no navegador e manter textos pequenos em tons de zinc/slate claros.
- Risco: alteração no `page.tsx` quebrar escolha de chave.
  - Mitigação: teste específico para origem da chave e modelo ativo.

## Regra De Processo

Para este projeto, mudanças de feature, bugfix ou redesign devem seguir:

1. spec escrita;
2. plano de implementação;
3. teste falhando confirmado;
4. implementação mínima;
5. teste passando;
6. refatoração;
7. validação completa.

Essa regra passa a valer para os próximos ciclos antes de qualquer alteração funcional ou visual relevante.
