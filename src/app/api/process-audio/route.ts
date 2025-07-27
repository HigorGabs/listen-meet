import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const apiKey = formData.get('apiKey') as string
    const duration = parseInt(formData.get('duration') as string)

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key é obrigatória' }, { status: 400 })
    }

    if (!audioFile) {
      return NextResponse.json({ error: 'Arquivo de áudio é obrigatório' }, { status: 400 })
    }

    console.log('Processing audio file:', audioFile.name, audioFile.size, 'bytes')

    // Convert audio file to base64
    const audioBuffer = await audioFile.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    // Process with Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `
Analise o seguinte arquivo de áudio de uma reunião e gere um resumo estruturado.

DURAÇÃO: ${Math.floor(duration / 60)} minutos

Por favor, forneça um resumo estruturado no seguinte formato JSON:

{
  "title": "Título sugerido para a reunião",
  "overview": "Resumo geral da reunião em 2-3 parágrafos",
  "summary": "Parágrafo conciso de 2-3 linhas explicando o contexto geral da reunião, principais decisões tomadas e próximos passos definidos",
  "keyPoints": ["Ponto principal 1", "Ponto principal 2", "Ponto principal 3"],
  "actionItems": ["Ação 1", "Ação 2", "Ação 3"],
  "participants": ["Participante 1", "Participante 2"],
  "topics": ["Tópico 1", "Tópico 2", "Tópico 3"],
  "metrics": {
    "efficiency": "75%",
    "engagement": "Alto",
    "decisionsCount": 3
  },
  "timeline": [
    {"phase": "Início", "description": "Apresentação do tópico", "time": "0-5min"},
    {"phase": "Discussão principal", "description": "Análise detalhada", "time": "5-20min"},
    {"phase": "Decisões", "description": "Definição de ações", "time": "20-25min"}
  ],
  "tags": {
    "meetingType": "Planejamento",
    "priority": "Alta",
    "status": "Concluída"
  },
  "insights": {
    "sentiment": "Produtiva",
    "engagement": "Alto",
    "outcome": "Decisões claras"
  },
  "participationAnalysis": [
    {"participant": "Participante A", "talkTime": "40%", "contributions": "Ideias técnicas", "role": "Facilitador"},
    {"participant": "Participante B", "talkTime": "35%", "contributions": "Análise de mercado", "role": "Especialista"},
    {"participant": "Participante C", "talkTime": "25%", "contributions": "Questões práticas", "role": "Questionador"}
  ],
  "transcript": "Transcrição completa do áudio"
}

INSTRUÇÕES:
- Transcreva o áudio completo para texto
- Identifique os pontos mais importantes da discussão
- Extraia todas as ações específicas mencionadas
- Liste os participantes identificáveis na conversa
- Categorize os principais tópicos abordados
- Analise a eficiência da reunião (% de tempo produtivo vs tangencial)
- Avalie o nível de engajamento dos participantes
- Conte quantas decisões concretas foram tomadas
- Crie uma timeline simples das fases da reunião
- Categorize o tipo de reunião (Planejamento, Review, Brainstorm, Status)
- Defina prioridade (Alta, Média, Baixa) baseada na urgência dos tópicos
- Analise o sentimento geral (Produtiva, Construtiva, Tensa)
- Avalie se houve decisões claras ou se precisa follow-up
- Distribua tempo de fala por participante (aproximado)
- Identifique principais contribuições de cada um
- Use português brasileiro
- Seja conciso mas abrangente
- Se não conseguir identificar participantes específicos, use "Participante A", "Participante B", etc.

Responda APENAS com o JSON válido, sem texto adicional.
`

    console.log('Sending audio to Gemini for processing...')
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: audioFile.type,
          data: audioBase64
        }
      },
      { text: prompt }
    ])

    const response = await result.response
    const text = response.text()

    console.log('Raw Gemini response:', text.substring(0, 500) + '...')

    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response')
    }

    const summary = JSON.parse(jsonMatch[0])

    // Validate structure
    if (!summary.title || !summary.overview || !Array.isArray(summary.keyPoints)) {
      throw new Error('Invalid summary structure from Gemini')
    }

    console.log('Audio processing completed successfully')

    // Generate filename for download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `reuniao-${timestamp}.txt`

    // Create downloadable content
    const downloadContent = `RESUMO DA REUNIÃO - ${summary.title}
Data: ${new Date().toLocaleDateString('pt-BR')}
Duração: ${Math.floor(duration / 60)} minutos

=== RESUMO ===
${summary.summary || summary.overview}

=== RESUMO GERAL ===
${summary.overview}

=== 📊 MÉTRICAS DA REUNIÃO ===
Eficiência: ${summary.metrics?.efficiency || 'N/A'}
Participação: ${summary.metrics?.engagement || 'N/A'}
Decisões tomadas: ${summary.metrics?.decisionsCount || 'N/A'}

=== ⏰ TIMELINE DA REUNIÃO ===
${summary.timeline?.map((item: { phase: string; description: string; time: string }) => `${item.phase}: ${item.description} (${item.time})`).join('\n') || 'Timeline não disponível'}

=== 🏷️ TAGS/CATEGORIAS ===
Tipo de reunião: ${summary.tags?.meetingType || 'N/A'}
Prioridade: ${summary.tags?.priority || 'N/A'}
Status: ${summary.tags?.status || 'N/A'}

=== 📈 INSIGHTS DA IA ===
Sentiment: ${summary.insights?.sentiment || 'N/A'}
Engagement: ${summary.insights?.engagement || 'N/A'}
Outcome: ${summary.insights?.outcome || 'N/A'}

=== 👥 ANÁLISE DE PARTICIPAÇÃO ===
${summary.participationAnalysis?.map((p: { participant: string; talkTime: string; contributions: string; role: string }) => 
  `${p.participant}: ${p.talkTime} do tempo | ${p.contributions} | Papel: ${p.role}`
).join('\n') || 'Análise não disponível'}

=== PONTOS PRINCIPAIS ===
${summary.keyPoints.map((point: string, index: number) => `${index + 1}. ${point}`).join('\n')}

=== AÇÕES IDENTIFICADAS ===
${summary.actionItems.map((action: string, index: number) => `${index + 1}. ${action}`).join('\n')}

=== PARTICIPANTES ===
${summary.participants.join(', ')}

=== TÓPICOS ABORDADOS ===
${summary.topics.join(', ')}

=== TRANSCRIÇÃO COMPLETA ===
${summary.transcript || 'Transcrição não disponível'}

---
Gerado automaticamente pelo Listen Meet com Google Gemini AI
`

    return NextResponse.json({
      success: true,
      summary,
      filename,
      downloadContent,
      duration
    })

  } catch (error: unknown) {
    console.error('Error processing audio:', error)
    
    return NextResponse.json({
      error: 'Erro ao processar áudio: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
      fallback: true
    }, { status: 500 })
  }
}