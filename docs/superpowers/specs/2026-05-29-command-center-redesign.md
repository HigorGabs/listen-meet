# Listen Meet Audio Studio Redesign Spec

## Contexto

O redesign anterior melhorou cores e contraste, mas preservou parte da arquitetura antiga: header horizontal, tabs simples, gravador em bloco único e histórico em lista. A nova etapa deve mudar a experiência, não apenas o tema.

A referência correta é o próprio Listen Meet:

- baseline original claro: tela simples com header, gravador central e cards de ajuda/recursos à direita;
- estado atual escuro: tela local capturada em `/tmp/listen-meet-current-real.png`, com `Deck de captura`, tabs horizontais, cards `Fluxo` e `Configuração ativa`.

O Google Stitch MCP foi configurado localmente e o projeto correto criado para esta etapa é `Listen Meet Redesign` (`projects/9382423097226611157`). A tela atual foi enviada ao Stitch como screen `16505439015758658904`. Não usar referências de FinOps, finanças, HR, CRM ou dashboards analíticos genéricos para este redesign.

## Direção Visual

Direção: **Audio Studio de reunião**.

O Listen Meet deve parecer um estúdio de captura de reuniões: calmo, direto, premium e focado em áudio. A tela precisa comunicar:

- controle de gravação;
- estado de prontidão;
- rota de IA ativa;
- sinal de áudio;
- próxima ação;
- inteligência gerada após o processamento.

O produto não deve parecer dashboard financeiro, centro de métricas, SaaS corporativo genérico ou ferramenta de BI. A prioridade visual é gravar ou enviar áudio com confiança.

## Mudanças Estruturais Obrigatórias

### 1. App Shell

- Manter um shell compacto porque o app tem poucas áreas.
- Substituir tabs genéricas por navegação segmentada integrada ao topo do estúdio.
- Exibir marca Listen Meet, status da IA e `Configurações` sem ocupar altura excessiva.
- A área principal deve ficar visualmente centrada e usar melhor o espaço horizontal, sem grandes vazios escuros.
- Em mobile, o shell deve empilhar sem sobrepor conteúdo.

### 2. Studio Header

- Adicionar um cabeçalho de estúdio dentro do conteúdo principal.
- Mostrar título contextual `Estúdio de captura`.
- Mostrar estado de prontidão: configurado, processando ou pendente.
- Exibir atalhos/ações principais como `Nova sessão`, `Configurar IA`, `Histórico` e status de upload.

### 3. Tela De Captura

- Reordenar a tela para áreas claras:
  - centro: console de gravação dominante;
  - direita: rota de IA, checklist de sessão e upload;
  - inferior ou lateral: histórico recente e próxima ação.
- O gravador deve deixar de parecer um card genérico e passar a parecer um deck:
  - título `Console de captura`;
  - timer central grande;
  - bloco `Sinal ao vivo`;
  - bloco `Entrada de áudio`;
  - upload como `Dropzone de áudio`;
  - indicadores `Entrada`, `Limite`, `Saída`.

### 4. Features Visuais Novas

As novas features são de experiência/visibilidade, sem alterar backend:

- `Checklist de sessão`: mostra se IA, modelo, microfone e upload estão prontos.
- `Rota de IA`: mostra provedor, modelo, origem da chave e modelos ativos retornados sem virar dashboard de métricas.
- `Pulse timeline`: mostra o fluxo Preparar, Capturar, Processar, Arquivar.
- `Insight panel`: mostra última reunião processada ou estado vazio orientado à ação.
- `Arquivo inteligente`: histórico em layout master-detail, com lista à esquerda e painel de leitura à direita.
- `Histórico recente`: preview compacto na tela de captura quando houver reuniões salvas.

### 5. Configuração De IA

- Recriar a tela de configuração como `AI control center`.
- Layout deve ter:
  - coluna de provedores;
  - painel de origem da chave;
  - painel de modelo ativo;
  - chamada para `Listar modelos ativos`;
  - contagem de modelos em destaque.
- Manter todos os fluxos atuais de seleção, listagem em tempo real, sessão do navegador e chave do servidor.

### 6. Histórico

- Trocar expansão inline por master-detail:
  - lista compacta de reuniões;
  - painel lateral `Painel de leitura`;
  - se nada estiver selecionado, selecionar automaticamente a primeira reunião disponível;
  - manter busca, filtros, download e exclusão.
- A área de detalhes deve destacar:
  - resumo;
  - pontos principais;
  - ações;
  - tópicos;
  - métricas quando existirem.

## Design System

- Base: manter tema escuro, mas reduzir o vazio preto: `#080b10`, `#101723`, `#172033`, `#202a3d`.
- Acento principal: verde-ciano `#4edea3` para ações de gravação e estado pronto.
- Acento secundário: azul limpo `#5aa7ff` para IA/modelos.
- Acento de áudio: lilás frio `#b8a7ff` apenas para waveform/entrada, evitando paleta de uma nota.
- Atenção: âmbar apenas para pendência/alerta.
- Tipografia: manter Geist, com monoespaçada para dados.
- Raio: 8px ou menos para cards e botões, exceto pills de status.
- Layout: mais editorial e focado em áudio; evitar pilhas de cards iguais e evitar aparência de dashboard financeiro.

## Fora De Escopo

- Não alterar transcrição, endpoints, providers ou persistência.
- Não criar autenticação.
- Não ampliar limite de upload.
- Não introduzir biblioteca visual nova.
- Não depender do Stitch runtime em produção.
- Não introduzir navegação lateral pesada se ela reduzir foco do gravador.

## TDD

Antes da implementação:

- Criar testes RED para o shell `Estúdio de captura`.
- Criar testes RED para `Checklist de sessão`.
- Criar testes RED para o gravador com `Console de captura`.
- Criar testes RED para histórico `Arquivo inteligente` e `Painel de leitura`.
- Atualizar teste da página para verificar a nova composição.

## Critérios De Aceite

- A tela parece reordenada e intencional, não apenas recolorida.
- O usuário vê imediatamente: estado da IA, modelo, origem da chave, ação principal e prontidão.
- O gravador é o foco visual, com painéis de apoio claros.
- O histórico vira uma experiência de leitura e recuperação, não apenas lista.
- A configuração de IA continua funcional.
- Testes, lint, typecheck e build passam.
- Verificação visual no navegador confirma ausência de sobreposição em desktop.
