'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AdvancedAudioRecorder, type AudioCaptureReadiness } from '@/components/AdvancedAudioRecorder'
import { MeetingsList } from '@/components/MeetingsList'
import { SessionReadinessPanel } from '@/components/SessionReadinessPanel'
import { StudioCommandRail } from '@/components/StudioCommandRail'
import { UserProfileModal } from '@/components/UserProfileModal'
import { getProfile, getClientId, type UserProfile } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaterialIcon } from '@/components/ui/material-icon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select'
import { MeetingRecord, MeetingStorage } from '@/utils/storage'
import { cn } from '@/lib/utils'
import { MAX_AUDIO_UPLOAD_MB, getAudioFilenameForBlob } from '@/lib/audio-constraints'
import {
  AI_PROVIDERS,
  type AiModelOption,
  type AiProviderId,
} from '@/lib/ai-providers'
import {
  LOCALE_STORAGE_KEY,
  getMessages,
  normalizeLocale,
  type Locale,
} from '@/lib/i18n'
import {
  STUDIO_THEME_STORAGE_KEY,
  normalizeStudioTheme,
  type StudioThemeId,
} from '@/lib/studio-theme'

const SESSION_CONFIG_KEY = 'listen-meet-ai-config'

interface SessionAiConfig {
  provider: AiProviderId
  model: string
  apiSource?: ApiSource
  apiKey?: string
}

type ApiKeyMode = 'server' | 'session'
type ApiSource = ApiKeyMode | null

function readSessionConfig(): SessionAiConfig | null {
  try {
    const stored = sessionStorage.getItem(SESSION_CONFIG_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const PROVIDER_METADATA: Record<AiProviderId, {
  grade: string
  contextLimit: string
  gradeColor: string
  efficiencyDescription: (locale: Locale) => string
  pros: (locale: Locale) => string[]
}> = {
  gemini: {
    grade: 'S',
    contextLimit: '1.048.576 tokens',
    gradeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    efficiencyDescription: (loc) => loc === 'en' ? 'Best native audio processing efficiency.' : 'Melhor eficiência em áudio bruto do mercado.',
    pros: (loc) => loc === 'en' ? [
      'Native audio processing (full multimodal)',
      'Extremely reduced token consumption',
      'Giant context window (1M+ tokens)',
      'Detects vocal dynamics and emotions accurately'
    ] : [
      'Processamento nativo de áudio (multimodal completo)',
      'Custo de tokens extremamente reduzido',
      'Janela de contexto gigante (1M+ tokens)',
      'Detecta dinâmica vocal e emoções com precisão'
    ]
  },
  openrouter: {
    grade: 'A+',
    contextLimit: '200.000 tokens (avg)',
    gradeColor: 'text-[var(--studio-primary)] border-[color:var(--studio-primary-border)] bg-[var(--studio-primary-soft)] shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    efficiencyDescription: (loc) => loc === 'en' ? 'Excellent flexibility with open models.' : 'Ótima flexibilidade com modelos abertos.',
    pros: (loc) => loc === 'en' ? [
      'Access to dozens of third-party models (Llama, Claude, etc.)',
      'Native multimodal audio processing support',
      'Intelligent routing for lower latency',
      'Excellent cost-to-performance ratio'
    ] : [
      'Acesso a dezenas de modelos de terceiros (Llama, Claude, etc)',
      'Suporte a processamento multimodal nativo',
      'Roteamento inteligente de menor latência',
      'Excelente relação custo-benefício'
    ]
  },
  openai: {
    grade: 'B+',
    contextLimit: '128.000 tokens',
    gradeColor: 'text-sky-400 border-sky-500/30 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.2)]',
    efficiencyDescription: (loc) => loc === 'en' ? 'Classic workflow via text transcription.' : 'Processamento clássico por transcrição de texto.',
    pros: (loc) => loc === 'en' ? [
      'Impeccable logical reasoning and text structuring',
      'Requires external Whisper transcription (higher token cost)',
      'Extremely stable, low-latency API',
      'Highly recommended for summaries and reports'
    ] : [
      'Raciocínio lógico e estruturação de texto impecável',
      'Requer transcrição externa Whisper (maior custo de tokens)',
      'API extremamente estável e de baixa latência',
      'Altamente recomendado para relatórios e resumos estruturados'
    ]
  },
  anthropic: {
    grade: 'B',
    contextLimit: '200.000 tokens',
    gradeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    efficiencyDescription: (loc) => loc === 'en' ? 'Premium analytical quality, higher token cost.' : 'Qualidade analítica premium com custo de tokens superior.',
    pros: (loc) => loc === 'en' ? [
      'Peerless synthesis and action items identification',
      'No native audio support (requires Whisper text input)',
      'Higher token pricing for long recordings',
      'Ideal for meetings with dense decision making'
    ] : [
      'Refinamento de texto e identificação de tarefas peerless',
      'Sem suporte a áudio nativo (requer Whisper e envio de texto)',
      'Preço de token mais alto para processamento longo',
      'Ideal para 1:1s e reuniões com alta densidade de decisões'
    ]
  }
}

function providerLabel(providerId: AiProviderId): string {
  return AI_PROVIDERS.find((provider) => provider.id === providerId)?.name || providerId
}

export default function Home() {
  const [theme, setTheme] = useState<StudioThemeId>('dark')
  const [locale, setLocale] = useState<Locale>('pt-BR')
  const [isPreferencesHydrated, setIsPreferencesHydrated] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [processingMode, setProcessingMode] = useState<'multimodal' | 'text'>('multimodal')
  const [provider, setProvider] = useState<AiProviderId>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyMode, setApiKeyMode] = useState<ApiKeyMode>('server')
  const [apiSource, setApiSource] = useState<ApiSource>(null)
  const [models, setModels] = useState<AiModelOption[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelError, setModelError] = useState('')
  const [serverProviders, setServerProviders] = useState<Record<AiProviderId, boolean>>({
    gemini: false,
    openrouter: false,
    openai: false,
    anthropic: false,
  })
  const [isConfigured, setIsConfigured] = useState(false)
  const [isCheckingConfig, setIsCheckingConfig] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('record')
  const [lastProcessedMeeting, setLastProcessedMeeting] = useState<MeetingRecord | null>(null)
  const [processingMeeting, setProcessingMeeting] = useState<{
    id: string
    title: string
    date: string
    duration: number
    status: 'processing'
  } | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showProcessedMessage, setShowProcessedMessage] = useState(false)
  const [predefinedParticipants, setPredefinedParticipants] = useState<string[]>([])
  const [company, setCompany] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [meetingContext, setMeetingContext] = useState('')
  const [knownCompanies, setKnownCompanies] = useState<string[]>([])
  const [template, setTemplate] = useState<'default' | 'daily' | 'oneOnOne'>('default')
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'alert' | 'confirm'
    onConfirm?: () => void
  } | null>(null)

  // Profile configuration states
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [profileModalTab, setProfileModalTab] = useState('profile')

  // Load profile on mount
  useEffect(() => {
    const loaded = getProfile()
    setProfile(loaded)
    if (loaded.defaultCompany) {
      setCompany(loaded.defaultCompany)
    }
    if (loaded.defaultTemplate) {
      setTemplate(loaded.defaultTemplate as 'default' | 'daily' | 'oneOnOne')
    }
  }, [])

  // Combine configured companies with database companies
  useEffect(() => {
    if (!profile) return
    MeetingStorage.getAllMeetings().then((meetings) => {
      const dbCompanies = meetings.map((m) => m.company).filter(Boolean) as string[]
      const allCompanies = Array.from(new Set([...profile.companies, ...dbCompanies])).sort()
      setKnownCompanies(allCompanies)
    })
  }, [profile, refreshTrigger])

  // Automatically pre-populate collaborators when the company changes
  const handleCompanyChange = useCallback((newComp: string) => {
    const selectedComp = newComp === 'outros' ? '' : newComp
    setCompany(selectedComp)
    
    if (profile) {
      if (selectedComp) {
        const compCollabs = profile.collaborators
          .filter((c) => c.company === selectedComp)
          .map((c) => c.name)
        setPredefinedParticipants(compCollabs)
      } else {
        setPredefinedParticipants([])
      }
    }
  }, [profile])

  const showAlert = (message: string, title?: string) => {
    setModalConfig({
      isOpen: true,
      title: title || (locale === 'en' ? 'System Notification' : 'Aviso do Sistema'),
      message,
      type: 'alert',
    })
  }
  const [captureReadiness, setCaptureReadiness] = useState<AudioCaptureReadiness>({
    hasAudioDevice: false,
    hasAudioSignal: false,
    hasCaptureError: false,
  })

  const selectedProvider = AI_PROVIDERS.find((item) => item.id === provider) || AI_PROVIDERS[0]
  const currentUploadLimitMb = selectedProvider.maxUploadMb || MAX_AUDIO_UPLOAD_MB
  const t = getMessages(locale)
  const selectedModelName = models.find((model) => model.id === selectedModel)?.name || selectedModel
  const hasServerKey = serverProviders[provider]
  const hasSessionKey = Boolean(apiKey.trim())
  const selectedSourceHasKey = apiKeyMode === 'server' ? hasServerKey : hasSessionKey
  const canListModels = selectedSourceHasKey || !selectedProvider.requiresApiKeyForModels
  const apiKeySourceLabel = apiSource === 'session'
    ? t.settings.apiSourceSession
    : t.settings.apiSourceServer
  const modelErrorTitleRef = useRef(t.settings.modelErrorTitle)
  const modelRequestIdRef = useRef(0)

  useEffect(() => {
    modelErrorTitleRef.current = t.settings.modelErrorTitle
  }, [t.settings.modelErrorTitle])

  useEffect(() => {
    document.title = t.brand.pageTitle
  }, [t.brand.pageTitle])

  useEffect(() => {
    setTheme(normalizeStudioTheme(localStorage.getItem(STUDIO_THEME_STORAGE_KEY)))
    setLocale(normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY)))
    localStorage.removeItem('listen-meet-palette')
    document.documentElement.style.removeProperty('--studio-primary')
    document.documentElement.style.removeProperty('--studio-secondary')
    setIsPreferencesHydrated(true)
  }, [])

  useEffect(() => {
    if (!isPreferencesHydrated) return

    const root = document.documentElement
    root.dataset.theme = theme
    root.lang = locale
    root.style.removeProperty('--studio-primary')
    root.style.removeProperty('--studio-secondary')

    localStorage.setItem(STUDIO_THEME_STORAGE_KEY, theme)
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    localStorage.removeItem('listen-meet-palette')
  }, [isPreferencesHydrated, locale, theme])

  const loadModelsForProvider = useCallback(async (
    nextProvider: AiProviderId,
    nextApiKey: string,
    preferredModel?: string
  ) => {
    const requestId = modelRequestIdRef.current + 1
    modelRequestIdRef.current = requestId
    const isCurrentRequest = () => modelRequestIdRef.current === requestId

    setIsLoadingModels(true)
    setModelError('')

    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-ID': getClientId(),
        },
        body: JSON.stringify({
          provider: nextProvider,
          apiKey: nextApiKey || undefined,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || modelErrorTitleRef.current)
      }

      const nextModels = result.models as AiModelOption[]
      if (!isCurrentRequest()) {
        return {
          models: [],
          selectedModel: '',
        }
      }

      setModels(nextModels)

      const preferred =
        nextModels.find((model) => model.id === preferredModel) ||
        nextModels.find((model) => model.id === result.defaultModel) ||
        nextModels.find((model) => model.recommended) ||
        nextModels[0]

      setSelectedModel(preferred?.id || '')
      return {
        models: nextModels,
        selectedModel: preferred?.id || '',
      }
    } catch (error) {
      if (!isCurrentRequest()) {
        return {
          models: [],
          selectedModel: '',
        }
      }

      const message = error instanceof Error ? error.message : modelErrorTitleRef.current
      setModels([])
      setSelectedModel('')
      setModelError(message)
      return {
        models: [],
        selectedModel: '',
      }
    } finally {
      if (isCurrentRequest()) {
        setIsLoadingModels(false)
      }
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadConfiguration() {
      localStorage.removeItem('gemini-api-key')
      sessionStorage.removeItem('gemini-api-key-session')

      const sessionConfig = readSessionConfig()

      try {
        const response = await fetch('/api/models', {
          headers: {
            'X-Client-ID': getClientId(),
          }
        })
        const result = await response.json()

        if (!isMounted) return

        const configuredProviders = Object.fromEntries(
          AI_PROVIDERS.map((item) => [
            item.id,
            Boolean(result.providers?.find((provider: { id: AiProviderId; configured: boolean }) =>
              provider.id === item.id
            )?.configured),
          ])
        ) as Record<AiProviderId, boolean>

        setServerProviders(configuredProviders)

        const initialProvider =
          sessionConfig?.provider ||
          AI_PROVIDERS.find((item) => configuredProviders[item.id])?.id ||
          'gemini'
        const savedConfigBelongsToProvider = sessionConfig?.provider === initialProvider
        const initialApiKey = ''
        const initialApiKeyMode: ApiKeyMode = savedConfigBelongsToProvider && (
          sessionConfig.apiSource === 'session'
        )
          ? 'session'
          : 'server'

        setProvider(initialProvider)
        setApiKey(initialApiKey)
        setApiKeyMode(initialApiKeyMode)

        const initialHasServerKey = configuredProviders[initialProvider]
        const initialHasSessionKey = Boolean(initialApiKey)

        if (initialHasServerKey || initialHasSessionKey) {
          const loaded = await loadModelsForProvider(
            initialProvider,
            initialApiKeyMode === 'session' ? initialApiKey : '',
            sessionConfig?.model
          )

          if (loaded.selectedModel) {
            setApiSource(initialApiKeyMode === 'session' ? 'session' : 'server')
            setIsConfigured(true)
            setShowSettings(false)
            return
          }
        }

        setShowSettings(true)
      } catch {
        if (isMounted) {
          setShowSettings(true)
        }
      } finally {
        if (isMounted) {
          setIsCheckingConfig(false)
        }
      }
    }

    loadConfiguration()

    return () => {
      isMounted = false
    }
  }, [loadModelsForProvider])

  const handleProviderChange = (nextProvider: AiProviderId) => {
    setProvider(nextProvider)
    setApiKey('')
    setApiKeyMode(serverProviders[nextProvider] ? 'server' : 'session')
    setApiSource(null)
    setModels([])
    setSelectedModel('')
    setModelError('')

    const nextProviderConfig = AI_PROVIDERS.find((item) => item.id === nextProvider)
    if (serverProviders[nextProvider] || !nextProviderConfig?.requiresApiKeyForModels) {
      void loadModelsForProvider(nextProvider, '')
    }
  }

  const handleApiKeyModeChange = (nextMode: ApiKeyMode) => {
    setApiKeyMode(nextMode)
    setApiSource(null)
    setModels([])
    setSelectedModel('')
    setModelError('')

    if (nextMode === 'server' && serverProviders[provider]) {
      void loadModelsForProvider(provider, '')
    }
  }

  const loadModelsFromSettings = async () => {
    if (!canListModels) {
      setModelError(t.errors.listModelsKey(providerLabel(provider)))
      return
    }

    await loadModelsForProvider(
      provider,
      apiKeyMode === 'session' ? apiKey.trim() : '',
      selectedModel
    )
  }

  const saveAiSettings = () => {
    if (!selectedModel) {
      setModelError(t.errors.selectModel)
      return
    }

    if (!selectedSourceHasKey) {
      setModelError(
        apiKeyMode === 'server'
          ? t.errors.missingServerKey(selectedProvider.serverEnvVar)
          : t.errors.missingProviderKey(providerLabel(provider))
      )
      return
    }

    const sessionConfig: SessionAiConfig = {
      provider,
      model: selectedModel,
      apiSource: apiKeyMode,
    }

    sessionStorage.setItem(SESSION_CONFIG_KEY, JSON.stringify(sessionConfig))
    setApiSource(apiKeyMode)
    setIsConfigured(true)
    setShowSettings(false)
  }

  const handleRecordingComplete = async (data: { blob: Blob; duration: number; filename?: string; source: 'recording' | 'upload' }) => {
    if (!isConfigured || !selectedModel) {
      showAlert(t.errors.configureProvider)
      setShowSettings(true)
      return
    }

    setIsProcessing(true)
    setProcessingStatus(t.errors.sendingAudio)

    const tempId = crypto.randomUUID()
    const tempTitle = customTitle.trim() || data.filename || (locale === 'en' ? 'Recording Session' : 'Sessão Gravada')
    setProcessingMeeting({
      id: tempId,
      title: tempTitle,
      date: new Date().toISOString(),
      duration: data.duration,
      status: 'processing'
    })
    setActiveTab('history')

    try {
      const formData = new FormData()
      formData.append('audio', data.blob, data.filename || getAudioFilenameForBlob(data.blob))
      formData.append('provider', provider)
      formData.append('model', selectedModel)
      if (apiSource === 'session' && apiKey.trim()) {
        formData.append('apiKey', apiKey.trim())
      }
      formData.append('locale', locale)
      formData.append('duration', data.duration.toString())
      formData.append('processingMode', processingMode)
      if (predefinedParticipants.length > 0) {
        formData.append('participants', JSON.stringify(predefinedParticipants))
      }
      if (company.trim()) {
        formData.append('company', company.trim())
      }
      if (customTitle.trim()) {
        formData.append('customTitle', customTitle.trim())
      }
      if (meetingContext.trim()) {
        formData.append('meetingContext', meetingContext.trim())
      }
      if (template && template !== 'default') {
        formData.append('template', template)
      }
      if (profile) {
        if (profile.name) {
          const userRole = company ? (profile.rolesByCompany[company] || '') : ''
          formData.append('userProfile', JSON.stringify({ name: profile.name, role: userRole }))
        }
        if (company) {
          const companyCollabs = profile.collaborators
            .filter((c) => c.company === company)
            .map((c) => ({ name: c.name, role: c.role }))
          if (companyCollabs.length > 0) {
            formData.append('collaborators', JSON.stringify(companyCollabs))
          }
        }
      }

      setProcessingStatus(t.errors.analyzingAudio(providerLabel(provider)))

      const response = await fetch('/api/process-audio', {
        method: 'POST',
        headers: {
          'X-Client-ID': getClientId(),
        },
        body: formData
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || t.errors.processFailure)
      }

      if (!result?.success) {
        throw new Error(result.error || t.errors.unknown)
      }

      setProcessingStatus(t.errors.savingMeeting)

      const meetingRecord: MeetingRecord = {
        id: crypto.randomUUID(),
        title: result.summary.title,
        date: new Date().toISOString(),
        duration: data.duration,
        summary: result.summary,
        locale,
        providerName: providerLabel(provider),
        modelName: selectedModelName || selectedModel,
        audioBlob: data.blob,
        filename: result.filename || `reuniao-${new Date().toISOString().split('T')[0]}.txt`,
        company: company.trim() || undefined
      }

      const saved = await MeetingStorage.saveMeeting(meetingRecord)
      if (!saved) {
        showAlert(t.errors.saveMeetingFailure)
      }

      setProcessingMeeting(null)
      setRefreshTrigger((prev) => prev + 1)
      setLastProcessedMeeting(meetingRecord)
      setPredefinedParticipants([])
      setCompany('')
      setCustomTitle('')
      setMeetingContext('')
      setTemplate('default')
      setShowProcessedMessage(true)

      setTimeout(() => {
        setShowProcessedMessage(false)
      }, 10000)
    } catch (error) {
      console.error('Error processing recording:', error)
      setProcessingMeeting(null)
      setRefreshTrigger((prev) => prev + 1)
      showAlert(t.errors.processingRecording + (error as Error).message)
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  if (isCheckingConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--studio-bg)] text-[var(--studio-text)]">
        <div className="w-full max-w-sm rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] p-6 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-center gap-3 text-sm text-[var(--studio-muted)]">
              <MaterialIcon name="progress_activity" className="animate-spin text-base text-[var(--studio-secondary)]" />
              {t.shell.verifyConfig}
          </div>
        </div>
      </div>
    )
  }



  return (
    <div className="min-h-screen bg-[var(--studio-bg)] text-[var(--studio-text)]">
      <StudioCommandRail
        activeTab={activeTab}
        apiKeySourceLabel={apiKeySourceLabel}
        locale={locale}
        onLocaleChange={setLocale}
        onOpenSettings={() => setShowSettings(true)}
        onOpenProfile={() => {
          setProfileModalTab('profile')
          setIsProfileModalOpen(true)
        }}
        onThemeChange={setTheme}
        onTabChange={(tab) => setActiveTab(tab)}
        theme={theme}
        userProfile={profile ? { name: profile.name, avatar: profile.avatar, avatarColor: profile.avatarColor } : undefined}
      />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="space-y-6">
          <section className="flex flex-col gap-4 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--studio-primary)]">
                {t.shell.activeStudio}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--studio-text)]">{t.shell.captureCenter}</h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--studio-muted)]">
                {t.shell.captureDescription}
              </p>
            </div>
            <div className="grid gap-2 text-xs text-[var(--studio-muted)] sm:grid-cols-3">
              <div className="rounded-md bg-[var(--studio-panel-strong)] px-3 py-2">
                <span className="block text-[var(--studio-subtle)]">{t.shell.provider}</span>
                <strong className="font-medium text-[var(--studio-text)]">{providerLabel(provider)}</strong>
              </div>
              <div className="rounded-md bg-[var(--studio-panel-strong)] px-3 py-2">
                <span className="block text-[var(--studio-subtle)]">{t.shell.model}</span>
                <strong className="font-medium text-[var(--studio-text)]">{selectedModelName || t.common.pending}</strong>
              </div>
              <div className="rounded-md bg-[var(--studio-panel-strong)] px-3 py-2">
                <span className="block text-[var(--studio-subtle)]">{t.shell.status}</span>
                <strong className="font-medium text-[var(--studio-text)]">{isConfigured ? t.common.ready : t.common.pending}</strong>
              </div>
            </div>
          </section>

          {!isConfigured && (
            <Alert className="border-[color:var(--studio-warning-border)] bg-[var(--studio-warning-bg)] text-[var(--studio-warning-text)]">
              <MaterialIcon name="error" className="text-base" />
              <AlertTitle>{t.shell.configureAiAlertTitle}</AlertTitle>
              <AlertDescription className="mt-2">
                {t.shell.configureAiAlertDescription}
                <div className="mt-3">
                  <Button size="sm" onClick={() => setShowSettings(true)}>
                    {t.common.configureNow}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isProcessing && (
            <div role="status" aria-live="polite" className="rounded-lg border border-[color:var(--studio-info-border)] bg-[var(--studio-info-bg)] px-4 py-3 text-[var(--studio-info-text)]">
                <div className="flex items-center gap-3">
                  <MaterialIcon name="progress_activity" className="animate-spin text-base" />
                  <div>
                    <p className="text-sm font-medium">{t.shell.processingMeeting}</p>
                    <p className="text-xs opacity-80">{processingStatus}</p>
                  </div>
                </div>
            </div>
          )}

          {lastProcessedMeeting && !isProcessing && showProcessedMessage && (
            <div role="status" aria-live="polite" className="rounded-lg border border-[color:var(--studio-success-border)] bg-[var(--studio-success-bg)] px-4 py-3 text-[var(--studio-success-text)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MaterialIcon name="check_circle" className="text-base" filled />
                    <div>
                      <p className="text-sm font-medium">
                        {t.shell.processedMeeting}: {lastProcessedMeeting.title}
                      </p>
                      <p className="text-xs opacity-80">
                        {t.shell.savedToHistory}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => MeetingStorage.downloadMeetingTxt(lastProcessedMeeting)}
                    className="h-8 gap-2 border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)]"
                  >
                    <MaterialIcon name="download" className="text-sm" />
                    {t.common.download}
                  </Button>
                </div>
            </div>
          )}

          <div className={cn(activeTab === 'record' ? 'block' : 'hidden')}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <AdvancedAudioRecorder
                onRecordingComplete={handleRecordingComplete}
                onReadinessChange={setCaptureReadiness}
                locale={locale}
                disabled={isProcessing}
                maxUploadMb={currentUploadLimitMb}
                processingMode={processingMode}
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab)}
              />

              <SessionReadinessPanel
                apiKeySourceLabel={apiKeySourceLabel}
                captureReadiness={captureReadiness}
                isConfigured={isConfigured}
                isProcessing={isProcessing}
                locale={locale}
                lastProcessedMeetingTitle={lastProcessedMeeting?.title}
                modelName={selectedModelName}
                modelsCount={models.length}
                providerName={providerLabel(provider)}
                uploadLimitMb={currentUploadLimitMb}
                processingMode={processingMode}
                onProcessingModeChange={setProcessingMode}
                participants={predefinedParticipants}
                onParticipantsChange={setPredefinedParticipants}
                company={company}
                onCompanyChange={handleCompanyChange}
                customTitle={customTitle}
                onCustomTitleChange={setCustomTitle}
                meetingContext={meetingContext}
                onMeetingContextChange={setMeetingContext}
                knownCompanies={knownCompanies}
                template={template}
                onTemplateChange={setTemplate}
                onOpenProfileToTab={(tab) => {
                  setProfileModalTab(tab)
                  setIsProfileModalOpen(true)
                }}
              />
            </div>
          </div>

          <div className={cn(activeTab === 'history' ? 'block' : 'hidden')}>
            <MeetingsList
              locale={locale}
              onNewRecording={() => setActiveTab('record')}
              processingMeeting={processingMeeting}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </main>

      {modalConfig && modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-6 shadow-2xl shadow-black/40 text-[var(--studio-text)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400">
                <MaterialIcon name="warning" className="text-xl" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-base font-semibold leading-none tracking-tight">
                  {modalConfig.title}
                </h3>
                <p className="text-sm text-[var(--studio-muted)] leading-relaxed">
                  {modalConfig.message}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={() => setModalConfig(null)}
                className="bg-[var(--studio-primary)] text-zinc-950 font-semibold hover:opacity-90 cursor-pointer"
              >
                {locale === 'en' ? 'OK' : 'Entendi'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] shadow-2xl shadow-black/40 text-[var(--studio-text)] animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[color:var(--studio-border)] px-6 py-4 flex items-center justify-between bg-[var(--studio-panel)]/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--studio-secondary-border)] bg-[var(--studio-secondary-soft)]">
                  <MaterialIcon name="key" className="text-lg text-[var(--studio-secondary)]" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-[var(--studio-text)] leading-none">{t.settings.title}</h2>
                  <p className="mt-1 text-xs text-[var(--studio-muted)] leading-none">{t.settings.description}</p>
                </div>
              </div>
              {isConfigured && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                  className="h-8 w-8 p-0 text-[var(--studio-subtle)] hover:bg-[var(--studio-panel)] hover:text-[var(--studio-text)] cursor-pointer rounded-full"
                >
                  <MaterialIcon name="close" className="text-base" />
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-12 gap-6 p-6">
              {/* Form Config */}
              <div className="space-y-4 md:col-span-7">
                <div className="space-y-2">
                  <Label htmlFor="ai-provider" className="text-[var(--studio-muted)] text-xs font-semibold uppercase tracking-wide">{t.settings.provider}</Label>
                  <Select value={provider} onValueChange={(value) => handleProviderChange(value as AiProviderId)}>
                    <SelectTrigger id="ai-provider" className="w-full border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)]">
                      <SelectValue placeholder={t.settings.providerPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}{serverProviders[item.id] ? ` (${t.settings.serverConfigured})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--studio-muted)] text-xs font-semibold uppercase tracking-wide">{t.settings.keySource}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={apiKeyMode === 'server' ? 'default' : 'outline'}
                      disabled={!serverProviders[provider]}
                      onClick={() => handleApiKeyModeChange('server')}
                      className="justify-start gap-2 h-10 text-xs"
                    >
                      <MaterialIcon name="dns" className="text-base" />
                      {t.settings.server}
                    </Button>
                    <Button
                      type="button"
                      variant={apiKeyMode === 'session' ? 'default' : 'outline'}
                      onClick={() => handleApiKeyModeChange('session')}
                      className="justify-start gap-2 h-10 text-xs"
                    >
                      <MaterialIcon name="person" className="text-base" />
                      {t.settings.session}
                    </Button>
                  </div>
                  <p className="text-[10px] text-[var(--studio-subtle)] leading-relaxed">
                    {apiKeyMode === 'server'
                      ? t.settings.serverHelp(selectedProvider.serverEnvVar)
                      : t.settings.sessionHelp}
                  </p>
                </div>

                {apiKeyMode === 'session' && (
                  <div className="space-y-2">
                    <Label htmlFor="apikey" className="text-[var(--studio-muted)] text-xs font-semibold uppercase tracking-wide">{selectedProvider.apiKeyLabel}</Label>
                    <Input
                      id="apikey"
                      type="password"
                      placeholder={t.settings.apiKeyPlaceholder}
                      value={apiKey}
                      className="border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)] h-10 text-sm"
                      onChange={(event) => {
                        setApiKey(event.target.value)
                        setModels([])
                        setSelectedModel('')
                        setModelError('')
                      }}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={loadModelsFromSettings}
                    disabled={isLoadingModels || !canListModels}
                    className="flex-1 bg-[var(--studio-secondary)] text-zinc-950 font-semibold hover:opacity-90 gap-2 cursor-pointer h-10 text-xs"
                  >
                    {isLoadingModels ? (
                      <>
                        <MaterialIcon name="progress_activity" className="animate-spin text-base" />
                        {t.settings.listingModels}
                      </>
                    ) : (
                      t.settings.listModels
                    )}
                  </Button>
                </div>

                {models.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="ai-model" className="text-[var(--studio-muted)] text-xs font-semibold uppercase tracking-wide">{t.settings.model}</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger id="ai-model" className="w-full border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)]">
                        <SelectValue placeholder={t.settings.modelPlaceholder} />
                      </SelectTrigger>
                      {(() => {
                        const audioModels = models.filter((m) => m.category === 'audio')
                        const textModels = models.filter((m) => m.category === 'text' || !m.category)
                        const imageModels = models.filter((m) => m.category === 'image')
                        const otherModels = models.filter((m) => m.category === 'other')
                        
                        return (
                          <SelectContent className="max-h-[320px] overflow-y-auto">
                            {audioModels.length > 0 && (
                              <SelectGroup>
                                <SelectLabel className="text-[9px] font-bold tracking-wider text-[var(--studio-primary)] uppercase bg-[var(--studio-panel-strong)]/40 px-2 py-1 select-none">
                                  {locale === 'en' ? '🎤 Multimodal (Audio & Text)' : '🎤 Multimodal (Áudio e Texto)'}
                                </SelectLabel>
                                {audioModels.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.name || model.id}{model.recommended ? ` (${t.settings.recommended})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {textModels.length > 0 && (
                              <SelectGroup>
                                <SelectLabel className="text-[9px] font-bold tracking-wider text-[var(--studio-secondary)] uppercase bg-[var(--studio-panel-strong)]/40 px-2 py-1 mt-1 select-none">
                                  {locale === 'en' ? '💬 Text Only (Chat)' : '💬 Apenas Texto (Chat)'}
                                </SelectLabel>
                                {textModels.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.name || model.id}{model.recommended ? ` (${t.settings.recommended})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {imageModels.length > 0 && (
                              <SelectGroup>
                                <SelectLabel className="text-[9px] font-bold tracking-wider text-pink-400 uppercase bg-[var(--studio-panel-strong)]/40 px-2 py-1 mt-1 select-none">
                                  {locale === 'en' ? '🖼️ Vision/Image (Multimodal)' : '🖼️ Visão/Imagem (Multimodal)'}
                                </SelectLabel>
                                {imageModels.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.name || model.id}{model.recommended ? ` (${t.settings.recommended})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {otherModels.length > 0 && (
                              <SelectGroup>
                                <SelectLabel className="text-[9px] font-bold tracking-wider text-zinc-400 uppercase bg-[var(--studio-panel-strong)]/40 px-2 py-1 mt-1 select-none">
                                  {locale === 'en' ? '⚙️ Others (Embedding/Classifiers)' : '⚙️ Outros (Embedding/Classificadores)'}
                                </SelectLabel>
                                {otherModels.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.name || model.id}{model.recommended ? ` (${t.settings.recommended})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                          </SelectContent>
                        )
                      })()}
                    </Select>
                    <p className="text-[10px] text-[var(--studio-subtle)] leading-relaxed">
                      {t.settings.modelCount(models.length, providerLabel(provider), (
                        apiKeyMode === 'server' && serverProviders[provider]
                          ? t.settings.sourceServer
                          : apiKeyMode === 'session' && apiKey.trim()
                            ? t.settings.sourceSession
                            : t.settings.sourcePublic
                      ))}
                    </p>
                  </div>
                )}

                {!selectedProvider.supportsAudioProcessing && (
                  <Alert className="border-[color:var(--studio-warning-border)] bg-[var(--studio-warning-bg)] text-[var(--studio-warning-text)] py-2.5 px-3">
                    <MaterialIcon name="error" className="text-base" />
                    <AlertTitle className="text-xs font-bold leading-none">{t.settings.unsupportedTitle}</AlertTitle>
                    <AlertDescription className="text-[10px] leading-relaxed mt-1">
                      {t.settings.unsupportedDescription}
                    </AlertDescription>
                  </Alert>
                )}

                {modelError && (
                  <Alert variant="destructive" className="py-2.5 px-3">
                    <MaterialIcon name="error" className="text-base" />
                    <AlertTitle className="text-xs font-bold leading-none">{t.settings.modelErrorTitle}</AlertTitle>
                    <AlertDescription className="text-[10px] leading-relaxed mt-1">{modelError}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Specs & Stats Sidebar */}
              <div className="space-y-4 md:col-span-5 border-t border-[color:var(--studio-border)]/40 pt-5 md:border-t-0 md:pt-0 md:border-l md:border-[color:var(--studio-border)]/40 md:pl-5">
                {(() => {
                  const baseMeta = PROVIDER_METADATA[provider]
                  const activeModelObj = models.find((m) => m.id === selectedModel)
                  
                  // 1. Dynamic Context Window
                  const getContextLimitLabel = () => {
                    if (activeModelObj?.contextLength) {
                      return activeModelObj.contextLength.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR') + ' tokens'
                    }
                    if (provider === 'gemini') {
                      const id = (selectedModel || '').toLowerCase()
                      if (id.includes('-pro')) {
                        return (2097152).toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR') + ' tokens'
                      }
                      return (1048576).toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR') + ' tokens'
                    }
                    if (provider === 'openai') {
                      return (128000).toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR') + ' tokens'
                    }
                    if (provider === 'anthropic') {
                      return (200000).toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR') + ' tokens'
                    }
                    return baseMeta.contextLimit
                  }

                  // 2. Dynamic Audio Input Support Check
                  const getModelSupportsAudio = () => {
                    if (provider === 'openai' || provider === 'anthropic') {
                      return false
                    }
                    if (activeModelObj) {
                      return Boolean(activeModelObj.inputModalities?.includes('audio'))
                    }
                    // Fallbacks for Gemini
                    if (provider === 'gemini') {
                      const id = (selectedModel || '').toLowerCase()
                      if (id && (id.includes('vision') || id.includes('embedding') || id.includes('aqa') || id.includes('1.0'))) {
                        return false
                      }
                    }
                    return selectedProvider.supportsAudioProcessing
                  }

                  const supportsAudio = getModelSupportsAudio()
                  const contextLimit = getContextLimitLabel()

                  // 3. Dynamic Meta Grade & Description
                  const getMeta = () => {
                    if (selectedProvider.supportsAudioProcessing && !supportsAudio && selectedModel) {
                      return {
                        grade: 'B-',
                        gradeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
                        efficiencyDescription: (loc: Locale) => loc === 'en' 
                          ? 'Text-only model. Requires transcription first.' 
                          : 'Modelo apenas de texto. Requer transcrição prévia.',
                        pros: (loc: Locale) => loc === 'en' ? [
                          'Stable text generation',
                          'Does not support native audio input',
                          'Requires external transcription pass',
                          'Ideal for low latency summaries'
                        ] : [
                          'Geração de texto estável',
                          'Sem suporte a envio direto de áudio',
                          'Requer etapa de transcrição externa',
                          'Ideal para resumos com menor latência'
                        ]
                      }
                    }
                    return baseMeta
                  }

                  const meta = getMeta()

                  return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-lg font-black leading-none",
                          meta.gradeColor
                        )}>
                          {meta.grade}
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--studio-subtle)]">
                            {locale === 'en' ? 'Efficiency Grade' : 'Nota de Eficiência'}
                          </span>
                          <span className="block mt-0.5 text-xs font-semibold text-[var(--studio-text)]">
                            {meta.efficiencyDescription(locale)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)]/40 p-4 text-[11px] leading-none">
                        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--studio-border)]/40 pb-2.5">
                          <span className="text-[var(--studio-subtle)]">{locale === 'en' ? 'Context Window' : 'Janela de Contexto'}</span>
                          <span className="font-semibold text-[var(--studio-text)]">{contextLimit}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--studio-border)]/40 pb-2.5">
                          <span className="text-[var(--studio-subtle)]">{locale === 'en' ? 'Audio Input' : 'Envio de Áudio'}</span>
                          <span className="font-semibold text-[var(--studio-text)]">
                            {supportsAudio 
                              ? (locale === 'en' ? 'Native Multimodal' : 'Nativo Multimodal') 
                              : (locale === 'en' ? 'Transcription Required' : 'Requer Transcrição')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[var(--studio-subtle)]">{locale === 'en' ? 'Upload Limit' : 'Limite de Upload'}</span>
                          <span className="font-semibold text-[var(--studio-text)]">{selectedProvider.maxUploadMb} MB</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--studio-subtle)]">
                          {locale === 'en' ? 'Advantages & Factors' : 'Vantagens e Fatores'}
                        </span>
                        <ul className="space-y-2">
                          {meta.pros(locale).map((pro, index) => (
                            <li key={index} className="flex items-start gap-2 text-[10px] leading-relaxed text-[var(--studio-muted)]">
                              <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--studio-primary)] shadow-[0_0_4px_var(--studio-primary)]" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="flex gap-2 border-t border-[color:var(--studio-border)]/40 p-6 bg-[var(--studio-panel)]/30 backdrop-blur-md rounded-b-xl">
              <Button
                onClick={saveAiSettings}
                disabled={!selectedModel || !selectedProvider.supportsAudioProcessing || !selectedSourceHasKey}
                className="flex-1 bg-[var(--studio-primary)] text-zinc-950 font-semibold hover:opacity-90 cursor-pointer h-10 text-xs"
              >
                {t.settings.useConfig}
              </Button>
              {isConfigured && (
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                  className="border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)] cursor-pointer h-10 text-xs"
                >
                  {t.common.cancel}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {isProfileModalOpen && (
        <UserProfileModal
          open={isProfileModalOpen}
          onOpenChange={setIsProfileModalOpen}
          locale={locale}
          defaultTab={profileModalTab}
          onProfileUpdated={(updatedProfile) => {
            setProfile(updatedProfile)
            // Trigger refresh in MeetingsList so it reloads meName
            setRefreshTrigger((prev) => prev + 1)
          }}
        />
      )}
    </div>
  )
}
