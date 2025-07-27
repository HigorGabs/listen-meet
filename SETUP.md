# Listen Meet - Setup Guide

## 📋 Pré-requisitos

- Node.js 18+ instalado
- NPM ou Yarn
- Conta Google Cloud Platform (para APIs)
- PostgreSQL (usando Prisma Dev Server local)

## 🚀 Configuração Rápida (3 minutos!)

### 1. Clonar e Instalar

```bash
git clone https://github.com/seu-usuario/listen-meet
cd listen-meet
npm install
```

### 2. Configurar Banco de Dados

```bash
npx prisma dev  # Inicia PostgreSQL local
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Configurar Autenticação Google

Edite o arquivo `.env` com suas credenciais do Google OAuth:

```env
NEXTAUTH_SECRET="seu-secret-super-seguro-aqui"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="seu-google-client-id"
GOOGLE_CLIENT_SECRET="seu-google-client-secret"
```

**Como obter as credenciais OAuth:**
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto ou selecione existente
3. Vá em "Credenciais" > "Criar credenciais" > "ID do cliente OAuth 2.0"
4. Configure:
   - Tipo: Aplicação Web
   - URLs autorizadas: `http://localhost:3000`
   - URLs de callback: `http://localhost:3000/api/auth/callback/google`

### 4. Executar a Aplicação

```bash
npm run dev
```

🎉 **Pronto!** Acesse `http://localhost:3000`

## 🔑 Configuração das APIs (Via Interface Web)

**IMPORTANTE:** As APIs do Google (Speech-to-Text, Gemini, Storage) agora são configuradas diretamente na interface web! 

### Após fazer login:

1. **Clique em "Configurações"** no header
2. **Configure cada API** nas abas correspondentes:
   - **Speech-to-Text:** Project ID, Service Account, Private Key
   - **Gemini:** API Key
   - **Storage:** Bucket Name
3. **Teste cada API** com o botão "Testar API"
4. **Salve as configurações**

### Como obter as credenciais:

#### Google Speech-to-Text & Storage
1. No [Google Cloud Console](https://console.cloud.google.com):
   - Ative as APIs "Cloud Speech-to-Text" e "Cloud Storage"
   - Crie uma Service Account com permissões adequadas
   - Baixe a chave JSON da service account
   - Crie um bucket no Cloud Storage

#### Google Gemini
1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crie uma API Key

## ✅ Vantagens da Nova Configuração

- **✅ Setup super rápido:** Apenas OAuth é necessário no .env
- **✅ Interface amigável:** Configure APIs via web, não arquivos
- **✅ Validação em tempo real:** Teste APIs diretamente na interface  
- **✅ Segurança:** Credenciais ficam no banco, não em arquivos
- **✅ Multi-usuário:** Cada usuário tem suas próprias credenciais

## 🔧 Status das Funcionalidades

### ✅ Implementado
- [x] Autenticação com Google OAuth
- [x] Gravação de áudio com Web Audio API
- [x] Interface responsiva com Shadcn/ui
- [x] Upload de áudio
- [x] Banco de dados com Prisma
- [x] APIs RESTful para meetings e chat

### 🚧 Em Desenvolvimento
- [ ] Integração Google Speech-to-Text (estrutura pronta)
- [ ] Integração Google Gemini (estrutura pronta)
- [ ] Upload para Google Cloud Storage
- [ ] Sistema de jobs para processamento assíncrono
- [ ] Interface para visualizar reuniões processadas

### 📝 Próximos Passos
1. Configurar credenciais das APIs do Google
2. Implementar integração Speech-to-Text
3. Implementar integração Gemini
4. Criar interface para visualizar reuniões
5. Implementar sistema de jobs com Redis

## 🐛 Troubleshooting

### Erro de conexão com banco
Se houver erro de conexão com PostgreSQL:
```bash
npx prisma dev
```

### Erro de autenticação Google
Verifique se:
- As URLs de callback estão corretas no Google Cloud Console
- As variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão configuradas
- A API Google+ está ativada

### Erro de permissão de microfone
- Certifique-se de que está acessando via HTTPS em produção
- Em desenvolvimento local (HTTP), permita acesso ao microfone no navegador

## 📚 Documentação Adicional

- [Next.js](https://nextjs.org/docs)
- [Prisma](https://www.prisma.io/docs)
- [NextAuth.js](https://next-auth.js.org)
- [Shadcn/ui](https://ui.shadcn.com)
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/docs)
- [Google Gemini API](https://ai.google.dev/docs)