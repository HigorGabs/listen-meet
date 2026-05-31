'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AdvancedAudioRecorder, type AudioCaptureReadiness } from '@/components/AdvancedAudioRecorder'
import { MeetingsList } from '@/components/MeetingsList'
import { SessionReadinessPanel } from '@/components/SessionReadinessPanel'
import { StudioCommandRail } from '@/components/StudioCommandRail'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaterialIcon } from '@/components/ui/material-icon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MeetingRecord, MeetingStorage } from '@/utils/storage'
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

function providerLabel(providerId: AiProviderId): string {
  return AI_PROVIDERS.find((provider) => provider.id === providerId)?.name || providerId
}

export default function Home() {
  const [theme, setTheme] = useState<StudioThemeId>('dark')
  const [locale, setLocale] = useState<Locale>('pt-BR')
  const [isPreferencesHydrated, setIsPreferencesHydrated] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
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
  const [showProcessedMessage, setShowProcessedMessage] = useState(false)
  const [captureReadiness, setCaptureReadiness] = useState<AudioCaptureReadiness>({
    hasAudioDevice: false,
    hasAudioSignal: false,
    hasCaptureError: false,
  })

  const selectedProvider = AI_PROVIDERS.find((item) => item.id === provider) || AI_PROVIDERS[0]
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
        headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch('/api/models')
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
      alert(t.errors.configureProvider)
      setShowSettings(true)
      return
    }

    setIsProcessing(true)
    setProcessingStatus(t.errors.sendingAudio)

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

      setProcessingStatus(t.errors.analyzingAudio(providerLabel(provider)))

      const response = await fetch('/api/process-audio', {
        method: 'POST',
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
        filename: result.filename || `reuniao-${new Date().toISOString().split('T')[0]}.txt`
      }

      const saved = MeetingStorage.saveMeeting(meetingRecord)
      if (!saved) {
        alert(t.errors.saveMeetingFailure)
      }

      setLastProcessedMeeting(meetingRecord)
      setShowProcessedMessage(true)
      setActiveTab('history')

      setTimeout(() => {
        setShowProcessedMessage(false)
      }, 10000)
    } catch (error) {
      console.error('Error processing recording:', error)
      alert(t.errors.processingRecording + (error as Error).message)
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

  if (showSettings) {
    return (
      <div className="flex min-h-screen items-start justify-center overflow-y-auto bg-[var(--studio-bg)] px-4 py-6 text-[var(--studio-text)]">
        <div className="w-full max-w-xl rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] shadow-2xl shadow-black/20">
          <div className="border-b border-[color:var(--studio-border)] px-6 py-5 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[color:var(--studio-secondary-border)] bg-[var(--studio-secondary-soft)]">
              <MaterialIcon name="key" className="text-2xl text-[var(--studio-secondary)]" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--studio-text)]">{t.settings.title}</h2>
            <p className="mt-2 text-sm text-[var(--studio-muted)]">
              {t.settings.description}
            </p>
          </div>
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="ai-provider" className="text-[var(--studio-muted)]">{t.settings.provider}</Label>
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
              <Label className="text-[var(--studio-muted)]">{t.settings.keySource}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={apiKeyMode === 'server' ? 'default' : 'outline'}
                  disabled={!serverProviders[provider]}
                  onClick={() => handleApiKeyModeChange('server')}
                  className="justify-start"
                >
                  <MaterialIcon name="dns" className="text-base" />
                  {t.settings.server}
                </Button>
                <Button
                  type="button"
                  variant={apiKeyMode === 'session' ? 'default' : 'outline'}
                  onClick={() => handleApiKeyModeChange('session')}
                  className="justify-start"
                >
                  <MaterialIcon name="person" className="text-base" />
                  {t.settings.session}
                </Button>
              </div>
              <p className="text-xs text-[var(--studio-subtle)]">
                {apiKeyMode === 'server'
                  ? t.settings.serverHelp(selectedProvider.serverEnvVar)
                  : t.settings.sessionHelp}
              </p>
            </div>

            {apiKeyMode === 'session' && (
              <div className="space-y-2">
                <Label htmlFor="apikey" className="text-[var(--studio-muted)]">{selectedProvider.apiKeyLabel}</Label>
                <Input
                  id="apikey"
                  type="password"
                  placeholder={t.settings.apiKeyPlaceholder}
                  value={apiKey}
                  className="border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)]"
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
                className="flex-1 bg-[var(--studio-secondary)] text-zinc-950 hover:opacity-90"
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
                <Label htmlFor="ai-model" className="text-[var(--studio-muted)]">{t.settings.model}</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger id="ai-model" className="w-full border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)]">
                    <SelectValue placeholder={t.settings.modelPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name || model.id}{model.recommended ? ` (${t.settings.recommended})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--studio-subtle)]">
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
              <Alert className="border-[color:var(--studio-warning-border)] bg-[var(--studio-warning-bg)] text-[var(--studio-warning-text)]">
                <MaterialIcon name="error" className="text-base" />
                <AlertTitle>{t.settings.unsupportedTitle}</AlertTitle>
                <AlertDescription>
                  {t.settings.unsupportedDescription}
                </AlertDescription>
              </Alert>
            )}

            {modelError && (
              <Alert variant="destructive">
                <MaterialIcon name="error" className="text-base" />
                <AlertTitle>{t.settings.modelErrorTitle}</AlertTitle>
                <AlertDescription>{modelError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={saveAiSettings}
                disabled={!selectedModel || !selectedProvider.supportsAudioProcessing || !selectedSourceHasKey}
                className="flex-1 bg-[var(--studio-primary)] text-zinc-950 hover:opacity-90"
              >
                {t.settings.useConfig}
              </Button>
              {isConfigured && (
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                  className="border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)]"
                >
                  {t.common.cancel}
                </Button>
              )}
            </div>
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
        isConfigured={isConfigured}
        locale={locale}
        modelName={selectedModelName}
        modelsCount={models.length}
        onLocaleChange={setLocale}
        onOpenSettings={() => setShowSettings(true)}
        onThemeChange={setTheme}
        onTabChange={(tab) => setActiveTab(tab)}
        providerName={providerLabel(provider)}
        theme={theme}
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

          {activeTab === 'record' ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <AdvancedAudioRecorder
                onRecordingComplete={handleRecordingComplete}
                onReadinessChange={setCaptureReadiness}
                locale={locale}
                disabled={isProcessing}
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
                uploadLimitMb={MAX_AUDIO_UPLOAD_MB}
              />
            </div>
          ) : (
            <MeetingsList locale={locale} onNewRecording={() => setActiveTab('record')} />
          )}
        </div>
      </main>
    </div>
  )
}
