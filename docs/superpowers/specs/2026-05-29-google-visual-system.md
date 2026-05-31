# Google Visual System Spec

## Contexto

O redesign ainda está visualmente inconsistente. A direção agora é usar Roboto como fonte principal e Material Symbols do Google Fonts como biblioteca padrão de ícones. O projeto já tem shadcn configurado, mas apenas um subconjunto de componentes instalado.

## Estado do shadcn

- Framework: Next.js App Router.
- Tailwind: v4.
- Base: Radix.
- Estilo: `new-york`.
- Componentes instalados: `alert`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `progress`, `select`, `tabs`, `textarea`, `tooltip`.
- Portanto, não é um shadcn "completo"; shadcn adiciona componentes sob demanda no projeto.

## Requisitos

- Trocar a fonte principal do app de Geist para Roboto via `next/font/google`.
- Carregar Material Symbols Rounded do Google Fonts para os ícones do app.
- Criar um componente local de ícone para renderizar ligatures do Material Symbols.
- Migrar os ícones visíveis dos componentes ativos do app para Material Symbols.
- Manter shadcn como base de componentes, sem reinstalar preset ou sobrescrever componentes.
- Preservar comportamento atual de gravação, configurações, histórico e i18n.

## TDD

1. Adicionar teste de contrato visual para garantir Roboto no layout e stylesheet do Material Symbols.
2. Adicionar teste do componente `MaterialIcon`.
3. Adicionar verificação de que arquivos ativos não importam `lucide-react`.
4. Rodar RED antes da implementação.
5. Implementar fonte, stylesheet e migração de ícones.
6. Rodar GREEN focado, `npm run verify` e validação visual.
