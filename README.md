<div align="center">

![Listen Meet Banner](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,2,30,26&height=300&section=header&text=Listen%20Meet&fontSize=80&fontAlignY=35&fontColor=fff&desc=Transforme%20reuniões%20em%20inteligência%20acionável%20com%20IA&descAlignY=55&descSize=18)

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=28&duration=3000&pause=1000&color=4F46E5&center=true&vCenter=true&multiline=true&random=false&width=800&height=100&lines=🎤+Grave+%7C+📝+Transcreva+%7C+🤖+Analise;🧠+21+Categorias+de+Análise+%7C+Multi-Provider+AI)](https://git.io/typing-svg)

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenRouter-FF6600?style=for-the-badge&logo=openai&logoColor=white" />
</p>

<p align="center">
  <a href="https://github.com/HigorGabs/listen-meet/stargazers"><img src="https://img.shields.io/github/stars/HigorGabs/listen-meet?style=social" /></a>
  <a href="https://github.com/HigorGabs/listen-meet/network/members"><img src="https://img.shields.io/github/forks/HigorGabs/listen-meet?style=social" /></a>
  <a href="https://github.com/HigorGabs/listen-meet/watchers"><img src="https://img.shields.io/github/watchers/HigorGabs/listen-meet?style=social" /></a>
</p>

<p align="center">
  <a href="#-funcionalidades-principais">✨ Features</a> •
  <a href="#-super-report-21-categorias-de-análise">🧠 Super Report</a> •
  <a href="#-instalação-e-execução">⚡ Install</a> •
  <a href="#-arquitetura-do-sistema">🏗️ Arquitetura</a> •
  <a href="#-contribuição">🤝 Contribute</a>
</p>

</div>

---

## ✨ Funcionalidades Principais

O **Listen Meet** foi desenvolvido para transformar gravações de áudio cruas em relatórios executivos altamente estruturados. Abaixo estão listados os pilares operacionais da plataforma:

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h3>🎤 Estúdio de Gravação Pro</h3>
      <ul>
        <li><strong>Osciloscópio Fluido em Tempo Real:</strong> Feedback visual dinâmico com medidor de volume por ondas senoidais reativas <i>(Web Audio API + requestAnimationFrame)</i>.</li>
        <li><strong>Roteamento de Dispositivos:</strong> Suporte nativo a microfones físicos e cabos de loopback virtual (BlackHole/VB-Audio) para gravação bidirecional limpa.</li>
        <li><strong>Upload Inteligente:</strong> Drag-and-drop de arquivos locais (MP3, WAV, M4A, FLAC, etc.) com checagem de assinatura binária real e mime-type.</li>
        <li><strong>Previsão de Custo/Tempo:</strong> Estimativa dinâmica e instantânea do tempo de análise de IA com base na duração do áudio antes de enviar.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🤖 Inteligência Multi-Provider</h3>
      <ul>
        <li><strong>Processamento Multimodal Nativo:</strong> Conexão direta com Google Gemini para análise de arquivos de áudio de até 25MB de forma eficiente e sem perdas.</li>
        <li><strong>Filtro de Modelos Gratuitos (FREE):</strong> Opção para listar e utilizar apenas os modelos gratuitos da OpenRouter, com tags de destaque visual <code>(FREE)</code>.</li>
        <li><strong>Resiliência de Transcrição:</strong> Configuração facilitada de modelos locais e fallbacks inteligentes entre Gemini, OpenRouter, OpenAI e Anthropic.</li>
        <li><strong>Modo Econômico de Texto:</strong> Permite transcrever o áudio localmente via Whisper antes de enviar ao LLM, reduzindo drasticamente o consumo de tokens.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>👤 Workspaces Corporativos & Equipes</h3>
      <ul>
        <li><strong>Múltiplas Empresas:</strong> Crie e gerencie workspaces independentes com avatares neon, cargos personalizados e separação de histórico.</li>
        <li><strong>Diarização por Colaboradores:</strong> Cadastre sua equipe e a IA mapeará e atribuirá as vozes e falas aos nomes corretos nas minutas.</li>
        <li><strong>Templates Especializados:</strong> Modelos estruturados de minutas prontos para Scrum Daily (Kanban Board), Geral ou Feedbacks 1:1.</li>
        <li><strong>Identificação de Usuário ("Eu"):</strong> Marque a si mesmo nas reuniões para filtrar instantaneamente suas tarefas e ações no dashboard.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>💾 Segurança Local & Player Obsidian</h3>
      <ul>
        <li><strong>IndexedDB Local:</strong> Gravações e relatórios são salvos localmente direto no navegador. Privacidade absoluta e conformidade com LGPD/GDPR.</li>
        <li><strong>Player de Áudio Obsidian:</strong> Barra de progresso premium, skipping rápido (-10s / +10s) e controle de velocidade (1.0x, 1.25x, 1.5x, 2.0x).</li>
        <li><strong>Checklists Interativas:</strong> Marque e gerencie itens concluídos ou pendentes diretamente no corpo estruturado do relatório.</li>
        <li><strong>Edição Reativa:</strong> Renomeie ou remova participantes após o processamento, e o sistema atualizará a transcrição e tarefas em tempo real.</li>
      </ul>
    </td>
  </tr>
</table>

> [!TIP]
> **Modo Apenas Texto:** Ao ativar o modo apenas texto na barra de configuração, a plataforma realiza a transcrição localmente e envia o texto plano para os provedores, reduzindo custos de API e acelerando as respostas em conexões lentas.

---

## 🧠 Super Report: 21 Categorias de Análise

O Listen Meet gera um mapa cognitivo exaustivo e estruturado em 21 categorias analíticas, classificadas em 4 grandes eixos:

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h4>📋 Relatório Executivo</h4>
      <ul>
        <li>✍️ <strong>Resumo em 1 Linha:</strong> Sentença marcante condensando a essência do encontro.</li>
        <li>📝 <strong>Visão Geral:</strong> Overview inteligível e detalhado em 2-3 parágrafos.</li>
        <li>📌 <strong>Pontos Principais:</strong> Destaques críticos identificados ao longo das discussões.</li>
        <li>🎯 <strong>Decisões Críticas:</strong> Racional por trás das deliberações com justificativas claras.</li>
        <li>⏳ <strong>Linha do Tempo:</strong> Rastreamento cronológico das fases da reunião.</li>
        <li>🧩 <strong>Consenso e Divergências:</strong> Graus de concordância e mapeamento de pontos debatidos.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h4>🏃 Ações & Prioridades</h4>
      <ul>
        <li>📅 <strong>Plano de Ação:</strong> Lista de tarefas estruturadas com responsável, prazo e tags.</li>
        <li>⚖️ <strong>Matriz de Eisenhower:</strong> Divisão visual em Urgente vs. Importante.</li>
        <li>⚠️ <strong>Riscos & Impedimentos:</strong> Mapeamento de problemas potenciais com planos de mitigação.</li>
        <li>❓ <strong>Perguntas em Aberto:</strong> Questões não resolvidas que exigem follow-up posterior.</li>
        <li>🔮 <strong>Próxima Pauta:</strong> Pauta sugerida e recomendada para o próximo alinhamento.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h4>🎭 Sentimento & Humor</h4>
      <ul>
        <li>📈 <strong>Evolução Emocional:</strong> Sentimento geral e suas oscilações por fase da reunião.</li>
        <li>⚡ <strong>Energia & Vibração:</strong> Métricas de humor e dinamismo (início → pico → fim).</li>
        <li>👥 <strong>Participação e Voz:</strong> Análise de tempo de fala (talk time) e contribuição de cada um.</li>
        <li>🧘 <strong>Desenvolvimento Individual:</strong> Feedbacks construtivos personalizados para cada participante.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h4>⚙️ Eficiência & Glossário</h4>
      <ul>
        <li>⏱️ <strong>Métricas Conversacionais:</strong> Tempo de silêncio, velocidade média e pausas.</li>
        <li>🎯 <strong>Score de Foco:</strong> Nível de aproveitamento da pauta e desvios de assunto.</li>
        <li>📖 <strong>Glossário Técnico:</strong> Explicação simples de jargões, siglas e termos de engenharia.</li>
        <li>🛠️ <strong>Sistemas Mencionados:</strong> Softwares e ferramentas citados no decorrer da conversa.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🔗 Exportações & Integrações Reais

Leve os resultados do seu estúdio diretamente para o fluxo de trabalho do seu time:

- 📤 **Exportações Multiformato:** Baixe relatórios estruturados em Markdown (.md), HTML standalone (Dashboard de ata offline interativo) ou copie a minuta limpa formatada.
- 🖨️ **Layout de Impressão Inteligente:** Regras CSS dedicadas (`@media print`) que eliminam botões, menus e geram um PDF elegante em preto e branco perfeito para arquivamento físico.
- 🔗 **Sincronização Ativa de Integrações (via Proxy Server seguro):**
  - **Notion:** Conecta-se ao seu workspace, mapeia dinamicamente o esquema do banco de dados selecionado e cria páginas formatadas sem depender de propriedades fixas.
  - **Jira Cloud:** Cria issues e subtarefas baseando-se nas ações da ata através de autenticação Basic Auth com tokens Atlassian.
  - **Slack:** Envia o resumo executivo e a lista de tarefas da reunião diretamente no canal configurado via Slack Webhooks protegidos de SSRF.

---

## 🏗️ Arquitetura do Sistema

Abaixo está o fluxo detalhado de processamento e persistência das reuniões:

```mermaid
graph TB
    subgraph "🎤 Frontend - Next.js 16 + React 19"
        A[👤 Usuário] --> B[🎯 Studio Interface]
        B --> C[📊 Audio Level Meter - Web Audio API]
        B --> D[🎙️ Advanced Audio Recorder]
        B --> E[📁 File Upload + Validação Binária]
        B --> N[👤 User Profile Modal]
        B --> O[🏢 Company Selector]
    end

    subgraph "🔧 API Layer - Next.js API Routes"
        D --> F{🛡️ Rate Limiter}
        E --> F
        F --> G[🔀 Provider Router]
        G --> H[🧠 Google Gemini SDK]
        G --> I[🌐 OpenRouter API]
        G --> J[🤖 OpenAI API]
        G --> K[💬 Anthropic API]
    end

    subgraph "📊 Analysis & Storage"
        H --> L[📝 Super Report - 21 Categorias]
        I --> L
        L --> M[💾 IndexedDB + localStorage Fallback]
        M --> P[📚 Meetings Dashboard]
        P --> Q[📄 Export TXT]
        P --> R[🔍 Busca & Filtros]
        P --> S[🏢 Filtro por Empresa]
    end

    style A fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style L fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style M fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style N fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

### 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── page.tsx                          # Página principal - Studio de gravação
│   ├── layout.tsx                        # Root layout com metadata e fonts
│   ├── globals.css                       # Estilos globais + design system
│   └── api/
│       ├── process-audio/route.ts        # POST - Processamento de áudio (multi-provider)
│       ├── models/route.ts               # GET  - Listagem de modelos por provedor
│       └── sync/route.ts                 # POST - Proxy de sincronização Notion, Jira e Slack
│
├── components/
│   ├── AdvancedAudioRecorder.tsx          # Gravador profissional com Web Audio API
│   ├── AudioLevelMeter.tsx               # Medidor de nível em tempo real com espectro
│   ├── AudioSetupModal.tsx               # Guia de configuração de dispositivos virtuais
│   ├── MeetingsList.tsx                  # Dashboard de reuniões (contém o player e widgets)
│   ├── SessionReadinessPanel.tsx         # Painel de checklist e prontidão
│   ├── StudioCommandRail.tsx             # Barra lateral de comandos do estúdio
│   ├── UserProfileModal.tsx              # Modal de perfil, empresas e colaboradores
│   └── ui/                              # Primitivos Radix UI (15 componentes)
│
├── hooks/
│   └── useAdvancedAudioRecorder.ts        # Web Audio API hook (compressão + downsampling)
│
├── lib/
│   ├── ai-providers.ts                   # Config de 4 provedores + fallback inteligente
│   ├── audio-constraints.ts              # Validação de formato + assinatura binária
│   ├── i18n.ts                           # Sistema completo de i18n (pt-BR + en)
│   ├── meeting-summary.ts               # Schema Zod (21 categorias) + exportação TXT
│   ├── profile.ts                        # Tipos e persistência de perfil/empresa
│   └── rate-limit.ts                     # Rate limiter por IP
```

---

## 🛠️ Stack Tecnológica

<table align="center" width="100%">
  <tr>
    <th align="center">Core & UI</th>
    <th align="center">Processamento de Áudio & IA</th>
    <th align="center">Persistência & Validação</th>
    <th align="center">Testes & DevOps</th>
  </tr>
  <tr>
    <td valign="top" align="center">
      <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" /><br/>
      <img src="https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/Radix%20UI-161618?style=for-the-badge&logo=radix-ui&logoColor=white" />
    </td>
    <td valign="top" align="center">
      <img src="https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/OpenRouter-FF6600?style=for-the-badge" /><br/>
      <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/Web_Audio_API-FF6B00?style=for-the-badge" />
    </td>
    <td valign="top" align="center">
      <img src="https://img.shields.io/badge/IndexedDB-FF9800?style=for-the-badge&logo=html5&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/Zod_4-3E67B1?style=for-the-badge" />
    </td>
    <td valign="top" align="center">
      <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/Testing_Library-E33332?style=for-the-badge&logo=testinglibrary&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
    </td>
  </tr>
</table>

---

## ⚡ Instalação e Execução

Para rodar o projeto localmente em ambiente de desenvolvimento, siga as instruções abaixo:

### 1️⃣ Clonar o Repositório e Instalar Dependências
```bash
# Clone o projeto
git clone https://github.com/HigorGabs/listen-meet.git
cd listen-meet

# Instale as dependências com NPM
npm install
```

### 2️⃣ Configurar Chaves de API
Crie um arquivo `.env.local` na raiz do projeto:
```bash
cp .env.example .env.local
```
Edite o `.env.local` inserindo as credenciais dos provedores que deseja usar:
```env
GEMINI_API_KEY=sua-chave-gemini-aqui
OPENAI_API_KEY=sua-chave-openai-opcional
OPENROUTER_API_KEY=sua-chave-openrouter-opcional
ANTHROPIC_API_KEY=sua-chave-anthropic-opcional
```
> [!NOTE]
> Se nenhuma chave for fornecida no servidor, os usuários poderão configurar e utilizar suas próprias chaves no painel lateral do app. As chaves serão usadas apenas na sessão local do cliente.

### 3️⃣ Iniciar Servidor
```bash
# Roda o servidor local na porta 4001
npm run dev
```
Acesse: **[http://localhost:4001](http://localhost:4001)**

---

## 🔐 Privacidade e Segurança

| Aspecto | Comportamento no Listen Meet |
| :--- | :--- |
| **Segurança das Chaves** | As chaves de API do servidor nunca são expostas ao cliente. Chaves inseridas pelo usuário ficam apenas na memória da sessão. |
| **Limitação de Acesso** | Opção para desativar chaves do servidor (`LISTEN_MEET_ALLOW_SERVER_KEYS=false`) em deploys públicos. |
| **Retenção de Arquivos** | Os arquivos de áudio enviados para processamento são removidos do servidor temporário logo após a análise da IA terminar. |
| **Proteção SSRF** | Validação rígida de subdomínios de webhook para garantir conexões seguras com Slack, Notion e Jira. |

---

## 🔧 Configuração Avançada de Áudio (Loopback)

Para gravar áudios diretamente de chamadas virtuais (Google Meet, Zoom, Skype, Teams, Discord), utilize redirecionamentos de som:

<details>
<summary><b>🍎 Configuração no macOS (BlackHole)</b></summary>

1. Instale o **BlackHole 2ch** via Homebrew:
   ```bash
   brew install blackhole-2ch
   ```
2. Abra a aplicação **Configuração de Áudio MIDI** no seu Mac.
3. Crie um **Dispositivo Agregado** (Aggregate Device):
   - Marque a caixinha do seu microfone físico e do **BlackHole 2ch**.
   - Defina o microfone físico como o dispositivo de clock principal.
4. Crie um **Dispositivo de Múltiplas Saídas** (Multi-Output Device):
   - Selecione seus fones de ouvido e o **BlackHole 2ch**.
5. No som do sistema macOS, selecione o **Dispositivo de Múltiplas Saídas** como saída principal de áudio.
6. No **Listen Meet**, selecione o **Dispositivo Agregado** como canal de entrada do gravador.
</details>

<details>
<summary><b>🪟 Configuração no Windows (VB-Cable)</b></summary>

1. Baixe e instale o driver do **VB-Audio Virtual Cable** em [vb-audio.com/Cable](https://vb-audio.com/Cable/).
2. Abra as configurações de áudio do painel de controle do Windows:
   - Configure o **CABLE Input** como seu dispositivo de áudio de saída padrão.
3. No **Listen Meet**, escolha o **CABLE Output** correspondente como canal de entrada de áudio.
</details>

---

## 🤝 Contribuição

Toda contribuição é bem-vinda para melhorar a plataforma!

1. Realize um **Fork** do repositório.
2. Crie uma branch para o desenvolvimento da sua feature: `git checkout -b feature/nova-funcionalidade`.
3. Verifique o lint, tipos e testes do projeto: `npm run verify`.
4. Faça o commit das mudanças seguindo convenções semânticas: `git commit -m "feat: adiciona nova funcionalidade"`.
5. Envie a branch para o seu fork: `git push origin feature/nova-funcionalidade`.
6. Abra um **Pull Request** para análise.

---

## 📄 Licença

Este projeto está sob os termos da licença **MIT**. Leia o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

Desenvolvido com ❤️ por **HigorGabs**.

<div align="center">

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/higor-gabs)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/HigorGabs)

***

**⭐ Se este projeto foi útil, deixe uma estrela no repositório!**

[![Stars](https://img.shields.io/github/stars/HigorGabs/listen-meet?style=social)](https://github.com/HigorGabs/listen-meet/stargazers)
[![Forks](https://img.shields.io/github/forks/HigorGabs/listen-meet?style=social)](https://github.com/HigorGabs/listen-meet/network/members)

![Footer](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,2,30,26&height=200&section=footer&text=Listen%20Meet&fontSize=50&fontColor=fff&desc=Transforme%20reuniões%20em%20inteligência%20acionável&descSize=16&descAlignY=70)

</div>
