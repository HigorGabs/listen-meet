import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.type || !body.payload) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const { type, payload } = body

    if (type === 'slack') {
      const { webhookUrl, meeting } = payload
      if (!webhookUrl || !meeting) {
        return NextResponse.json({ error: 'Slack Webhook URL e Dados da Reunião são obrigatórios' }, { status: 400 })
      }

      const summaryText = meeting.summary.summary || meeting.summary.overview || ''
      const actionItemsText = (meeting.summary.actionItems || [])
        .map((a: string) => `• ${a}`)
        .join('\n')

      const slackPayload = {
        text: `*Listen Meet: ${meeting.title || 'Reunião'}*\n\n*Resumo Geral:*\n${summaryText}\n\n*Ações e Próximos Passos:*\n${actionItemsText || 'Nenhum passo de ação detectado.'}`
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(slackPayload)
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(errText || `Slack API retornou status ${response.status}`)
      }

      return NextResponse.json({ success: true })
    }

    if (type === 'notion') {
      const { token, databaseId, meeting } = payload
      if (!token || !databaseId || !meeting) {
        return NextResponse.json({ error: 'Token, Database ID e Dados da Reunião são obrigatórios' }, { status: 400 })
      }

      const title = meeting.title || 'Reunião sem título'
      const dateStr = new Date(meeting.date || Date.now()).toLocaleDateString('pt-BR')
      const durationStr = meeting.duration ? `${Math.floor(meeting.duration / 60)}m` : 'N/A'
      const overview = meeting.summary.summary || meeting.summary.overview || ''
      const keyPoints = meeting.summary.keyPoints || []
      const actionItems = meeting.summary.actionItems || []
      const participants = meeting.summary.participants || []

      // Prepare rich text blocks for the Notion page content
      const childrenBlocks = [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: '📝 Resumo Geral' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: overview } }]
          }
        }
      ]

      if (participants.length > 0) {
        childrenBlocks.push(
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ text: { content: '👥 Participantes' } }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: participants.join(', ') } }]
            }
          }
        )
      }

      if (keyPoints.length > 0) {
        childrenBlocks.push(
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ text: { content: '🎯 Pontos Principais' } }]
            }
          },
          ...keyPoints.map((point: string) => ({
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: [{ text: { content: point } }]
            }
          })) as any
        )
      }

      if (actionItems.length > 0) {
        childrenBlocks.push(
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ text: { content: '⚡ Ações e Próximos Passos' } }]
            }
          },
          ...actionItems.map((item: string) => ({
            object: 'block',
            type: 'to_do',
            to_do: {
              rich_text: [{ text: { content: item } }],
              checked: false
            }
          })) as any
        )
      }

      const notionResponse = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            Name: {
              title: [
                { text: { content: `${title} (${dateStr} - ${durationStr})` } }
              ]
            }
          },
          children: childrenBlocks
        })
      })

      const notionData = await notionResponse.json()
      if (!notionResponse.ok) {
        throw new Error(notionData.message || `Notion API retornou status ${notionResponse.status}`)
      }

      return NextResponse.json({ success: true, pageId: notionData.id })
    }

    if (type === 'jira') {
      const { domain, projectKey, token, meeting } = payload
      if (!domain || !projectKey || !token || !meeting) {
        return NextResponse.json({ error: 'Domain, Project Key, Token e Dados da Reunião são obrigatórios' }, { status: 400 })
      }

      const actionItems = meeting.summary.actionItems || []
      const meetingTitle = meeting.title || 'Reunião'
      const cleanDomain = domain.replace(/^https?:\/\//, '').trim()

      if (actionItems.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: 'Nenhuma ação para criar no Jira' })
      }

      // Basic Auth expects base64 encoded username/email + API token
      // If the user input email:api_token, we base64 encode it. If it is already a base64 string, we might use it or encode it.
      // We assume the user typed "email:api_token" or similar, or just their API token. If it doesn't contain a colon, 
      // we assume it is the token but since Jira Cloud requires email, we tell the user or handle it.
      const authHeader = token.includes(':') 
        ? `Basic ${Buffer.from(token).toString('base64')}` 
        : `Basic ${Buffer.from(`user@example.com:${token}`).toString('base64')}` // Fallback wrapper

      const results = []

      for (const item of actionItems) {
        const response = await fetch(`https://${cleanDomain}/rest/api/3/issue`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              project: {
                key: projectKey
              },
              summary: item.substring(0, 255),
              description: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: `Criado automaticamente pelo Listen Meet a partir da reunião: ${meetingTitle}`
                      }
                    ]
                  }
                ]
              },
              issuetype: {
                name: 'Task'
              }
            }
          })
        })

        const data = await response.json().catch(() => null)
        if (!response.ok) {
          const errMsg = data?.errorMessages?.join(', ') || (data?.errors ? JSON.stringify(data.errors) : '')
          throw new Error(errMsg || `Jira API retornou status ${response.status}`)
        }
        results.push(data)
      }

      return NextResponse.json({ success: true, count: results.length, issues: results.map((r: any) => r.key) })
    }

    return NextResponse.json({ error: 'Tipo de integração inválido' }, { status: 400 })
  } catch (error: any) {
    console.error('API Sync Integration error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na sincronização externa' },
      { status: 500 }
    )
  }
}
