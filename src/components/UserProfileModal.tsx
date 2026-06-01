'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaterialIcon } from '@/components/ui/material-icon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getMessages, type Locale } from '@/lib/i18n'
import {
  UserProfile,
  Collaborator,
  AVATAR_GRADIENTS,
  getProfile,
  saveProfile,
} from '@/lib/profile'
import { cn } from '@/lib/utils'

interface UserProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locale?: Locale
  onProfileUpdated?: (profile: UserProfile) => void
  defaultTab?: string
}

export function UserProfileModal({
  open,
  onOpenChange,
  locale = 'pt-BR',
  onProfileUpdated,
  defaultTab = 'profile',
}: UserProfileModalProps) {
  const t = getMessages(locale)
  
  // State loaded from localStorage
  const [profile, setProfile] = useState<UserProfile | null>(null)
  
  // Tab control
  const [activeTab, setActiveTab] = useState(defaultTab)
  
  // Local state for adding company
  const [newCompany, setNewCompany] = useState('')
  
  // Local state for adding collaborator
  const [newCollabName, setNewCollabName] = useState('')
  const [newCollabRole, setNewCollabRole] = useState('')
  const [newCollabCompany, setNewCollabCompany] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load profile on open
  useEffect(() => {
    if (open) {
      const loaded = getProfile()
      setProfile(loaded)
      setActiveTab(defaultTab)
      if (loaded.companies.length > 0) {
        setNewCollabCompany(loaded.defaultCompany || loaded.companies[0])
      } else {
        setNewCollabCompany('outros')
      }
    }
  }, [open, defaultTab])

  if (!profile) return null

  const handleSave = (updated: UserProfile) => {
    setProfile(updated)
    saveProfile(updated)
    onProfileUpdated?.(updated)
  }

  // Handle name update
  const handleNameChange = (name: string) => {
    handleSave({ ...profile, name })
  }

  // Handle avatar color preset selection
  const handleAvatarColorSelect = (color: string) => {
    handleSave({ ...profile, avatarColor: color, avatar: undefined })
  }

  // Compress and handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 120
        let w = img.width
        let h = img.height
        
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, w, h)
        const base64 = canvas.toDataURL('image/jpeg', 0.7)
        handleSave({ ...profile, avatar: base64 })
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Handle roles per company
  const handleCompanyRoleChange = (company: string, role: string) => {
    const updatedRoles = { ...profile.rolesByCompany, [company]: role }
    handleSave({ ...profile, rolesByCompany: updatedRoles })
  }

  // Add new company
  const handleAddCompany = () => {
    const trimmed = newCompany.trim()
    if (!trimmed) return
    if (profile.companies.includes(trimmed)) {
      setNewCompany('')
      return
    }

    const updatedCompanies = [...profile.companies, trimmed]
    const updatedRoles = { ...profile.rolesByCompany }
    if (!updatedRoles[trimmed]) {
      updatedRoles[trimmed] = ''
    }

    const newDefault = profile.defaultCompany || trimmed

    handleSave({
      ...profile,
      companies: updatedCompanies,
      rolesByCompany: updatedRoles,
      defaultCompany: newDefault,
    })
    setNewCompany('')
    setNewCollabCompany(trimmed)
  }

  // Delete company
  const handleDeleteCompany = (comp: string) => {
    const updatedCompanies = profile.companies.filter((c) => c !== comp)
    
    const updatedRoles = { ...profile.rolesByCompany }
    delete updatedRoles[comp]

    // Set fallback default company
    let newDefault = profile.defaultCompany
    if (newDefault === comp) {
      newDefault = updatedCompanies[0] || ''
    }

    // Remap collaborators company to 'outros'
    const updatedCollabs = profile.collaborators.map((c) => 
      c.company === comp ? { ...c, company: 'outros' } : c
    )

    handleSave({
      ...profile,
      companies: updatedCompanies,
      rolesByCompany: updatedRoles,
      defaultCompany: newDefault,
      collaborators: updatedCollabs,
    })
  }

  // Make default company
  const handleSetDefaultCompany = (comp: string) => {
    handleSave({ ...profile, defaultCompany: comp })
  }

  // Add collaborator
  const handleAddCollaborator = () => {
    const name = newCollabName.trim()
    const role = newCollabRole.trim()
    if (!name) return

    const newCollab: Collaborator = {
      id: crypto.randomUUID(),
      name,
      role,
      company: newCollabCompany || 'outros',
    }

    handleSave({
      ...profile,
      collaborators: [...profile.collaborators, newCollab],
    })

    setNewCollabName('')
    setNewCollabRole('')
  }

  // Delete collaborator
  const handleDeleteCollaborator = (id: string) => {
    handleSave({
      ...profile,
      collaborators: profile.collaborators.filter((c) => c.id !== id),
    })
  }

  // Get initials for avatar
  const getInitials = () => {
    if (!profile.name) return 'EU'
    const parts = profile.name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-[color:var(--studio-border)] bg-[var(--studio-card)] p-0 text-[var(--studio-text)] shadow-2xl shadow-black/40 sm:max-w-3xl animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="border-b border-[color:var(--studio-border)] bg-[var(--studio-panel)] px-6 py-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--studio-primary-border)] bg-[var(--studio-primary-soft)]">
              <MaterialIcon name="person" className="text-lg text-[var(--studio-primary)]" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base font-semibold text-[var(--studio-text)] leading-none">
                {locale === 'pt-BR' ? 'Perfil & Configurações' : 'Profile & Settings'}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-[var(--studio-muted)] leading-none">
                {locale === 'pt-BR'
                  ? 'Ajuste sua identidade, gerencie empresas e configure equipes.'
                  : 'Adjust your identity, manage companies, and configure teams.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-1">
              <TabsTrigger value="profile" className="gap-1.5 text-xs py-1.5">
                <MaterialIcon name="account_circle" className="text-sm" />
                {locale === 'pt-BR' ? 'Meu Perfil' : 'My Profile'}
              </TabsTrigger>
              <TabsTrigger value="companies" className="gap-1.5 text-xs py-1.5">
                <MaterialIcon name="business" className="text-sm" />
                {locale === 'pt-BR' ? 'Empresas' : 'Companies'}
              </TabsTrigger>
              <TabsTrigger value="collaborators" className="gap-1.5 text-xs py-1.5">
                <MaterialIcon name="groups" className="text-sm" />
                {locale === 'pt-BR' ? 'Colaboradores' : 'Collaborators'}
              </TabsTrigger>
              <TabsTrigger value="preferences" className="gap-1.5 text-xs py-1.5">
                <MaterialIcon name="tune" className="text-sm" />
                {locale === 'pt-BR' ? 'Preferências' : 'Preferences'}
              </TabsTrigger>
            </TabsList>

            {/* TAB: PROFILE */}
            <TabsContent value="profile" className="space-y-6 outline-none focus:outline-none">
              <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-5">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt="Avatar"
                      className="h-20 w-20 rounded-full object-cover border-2 border-[var(--studio-primary-border)] shadow-glow-primary transition duration-300 group-hover:opacity-80"
                    />
                  ) : (
                    <div
                      className={cn(
                        'flex h-20 w-20 items-center justify-center rounded-full border-2 border-[color:var(--studio-border)] bg-gradient-to-tr text-2xl font-bold text-white shadow-lg transition duration-300 group-hover:opacity-85',
                        profile.avatarColor || AVATAR_GRADIENTS[0]
                      )}
                    >
                      {getInitials()}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <MaterialIcon name="photo_camera" className="text-white text-lg" />
                  </div>
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div className="space-y-1">
                    <Label htmlFor="profile-name" className="text-xs font-semibold text-[var(--studio-muted)]">
                      {locale === 'pt-BR' ? 'Seu Nome completo' : 'Your Full Name'}
                    </Label>
                    <Input
                      id="profile-name"
                      type="text"
                      placeholder={locale === 'pt-BR' ? 'Ex: Higor Gabs' : 'e.g. Higor Gabs'}
                      value={profile.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] h-9 text-sm focus:border-[var(--studio-primary)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-wider block">
                      {locale === 'pt-BR' ? 'Ou escolha cores de gradiente' : 'Or select preset gradient colors'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_GRADIENTS.map((grad, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleAvatarColorSelect(grad)}
                          className={cn(
                            'h-6 w-6 rounded-full bg-gradient-to-tr border transition duration-300 hover:scale-110 cursor-pointer',
                            grad,
                            profile.avatarColor === grad && !profile.avatar
                              ? 'border-white scale-105 shadow-md'
                              : 'border-transparent'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Roles Per Company */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--studio-text)]">
                    {locale === 'pt-BR' ? 'Seus Cargos por Empresa' : 'Your Roles by Company'}
                  </h3>
                  <p className="text-[10px] text-[var(--studio-muted)] mt-0.5">
                    {locale === 'pt-BR'
                      ? 'Defina seu cargo específico em cada empresa para contextualizar a IA nas atas.'
                      : 'Define your specific role in each company to give the AI proper context.'}
                  </p>
                </div>

                {profile.companies.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[color:var(--studio-border)] p-5 text-center text-xs text-[var(--studio-muted)]">
                    {locale === 'pt-BR'
                      ? 'Adicione empresas na aba "Empresas" para configurar seus cargos.'
                      : 'Add companies under the "Companies" tab to configure your roles.'}
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-[200px] overflow-y-auto pr-1">
                    {profile.companies.map((company) => (
                      <div
                        key={company}
                        className="flex items-center gap-3 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-3"
                      >
                        <span className="text-xs font-semibold text-[var(--studio-text)] w-28 truncate">
                          {company}
                        </span>
                        <Input
                          type="text"
                          placeholder={locale === 'pt-BR' ? 'Ex: Tech Lead, PO, Dev' : 'e.g. Tech Lead, Dev'}
                          value={profile.rolesByCompany[company] || ''}
                          onChange={(e) => handleCompanyRoleChange(company, e.target.value)}
                          className="border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] h-8 text-xs flex-1"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB: COMPANIES */}
            <TabsContent value="companies" className="space-y-4 outline-none focus:outline-none">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder={locale === 'pt-BR' ? 'Nova Empresa (Ex: Google)' : 'New Company (e.g. Google)'}
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCompany()}
                  className="border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] h-9 text-xs"
                />
                <Button
                  onClick={handleAddCompany}
                  size="sm"
                  className="bg-[var(--studio-primary)] text-zinc-950 hover:opacity-90 h-9 px-3 gap-1"
                >
                  <MaterialIcon name="add" className="text-sm" />
                  {locale === 'pt-BR' ? 'Adicionar' : 'Add'}
                </Button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {profile.companies.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[color:var(--studio-border)] p-6 text-center text-xs text-[var(--studio-muted)]">
                    {locale === 'pt-BR'
                      ? 'Nenhuma empresa cadastrada.'
                      : 'No companies configured.'}
                  </div>
                ) : (
                  profile.companies.map((comp) => {
                    const isDefault = profile.defaultCompany === comp
                    return (
                      <div
                        key={comp}
                        className={cn(
                          'flex items-center justify-between rounded-lg border p-3 transition duration-300',
                          isDefault
                            ? 'border-[var(--studio-primary-border)] bg-[var(--studio-primary-soft)]/20'
                            : 'border-[color:var(--studio-border)] bg-[var(--studio-panel)]'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <MaterialIcon
                            name="business"
                            className={cn('text-base', isDefault ? 'text-[var(--studio-primary)]' : 'text-[var(--studio-subtle)]')}
                          />
                          <span className="text-xs font-semibold text-[var(--studio-text)]">{comp}</span>
                          {isDefault && (
                            <span className="rounded bg-[var(--studio-primary-soft)] border border-[var(--studio-primary-border)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--studio-primary)] uppercase tracking-wider">
                              {locale === 'pt-BR' ? 'Padrão' : 'Default'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefaultCompany(comp)}
                              className="h-7 text-[10px] font-semibold text-[var(--studio-subtle)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-panel-strong)]"
                            >
                              {locale === 'pt-BR' ? 'Definir Padrão' : 'Set Default'}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCompany(comp)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer rounded-full"
                          >
                            <MaterialIcon name="delete" className="text-sm" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </TabsContent>

            {/* TAB: COLLABORATORS */}
            <TabsContent value="collaborators" className="space-y-4 outline-none focus:outline-none">
              {/* Add form */}
              <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--studio-secondary)]">
                  {locale === 'pt-BR' ? 'Novo Colaborador Frequente' : 'New Frequent Collaborator'}
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="collab-name" className="text-[10px] text-[var(--studio-muted)]">Nome</Label>
                    <Input
                      id="collab-name"
                      type="text"
                      placeholder="Ex: Carlos Dev"
                      value={newCollabName}
                      onChange={(e) => setNewCollabName(e.target.value)}
                      className="border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="collab-role" className="text-[10px] text-[var(--studio-muted)]">Cargo</Label>
                    <Input
                      id="collab-role"
                      type="text"
                      placeholder="Ex: Senior Developer"
                      value={newCollabRole}
                      onChange={(e) => setNewCollabRole(e.target.value)}
                      className="border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--studio-muted)]">Empresa</Label>
                    <select
                      className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] px-2.5 h-8 focus:outline-none focus:border-[var(--studio-primary)] cursor-pointer"
                      value={newCollabCompany}
                      onChange={(e) => setNewCollabCompany(e.target.value)}
                    >
                      {profile.companies.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="outros">{locale === 'pt-BR' ? 'Outros (Sem Empresa)' : 'Others (No Company)'}</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    onClick={handleAddCollaborator}
                    disabled={!newCollabName.trim()}
                    size="sm"
                    className="bg-[var(--studio-secondary)] text-zinc-950 font-semibold hover:opacity-90 h-8 gap-1"
                  >
                    <MaterialIcon name="person_add" className="text-sm" />
                    {locale === 'pt-BR' ? 'Salvar Colaborador' : 'Save Collaborator'}
                  </Button>
                </div>
              </div>

              {/* Collab list */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {profile.collaborators.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[color:var(--studio-border)] p-6 text-center text-xs text-[var(--studio-muted)]">
                    {locale === 'pt-BR'
                      ? 'Nenhum colaborador frequente cadastrado.'
                      : 'No frequent collaborators configured.'}
                  </div>
                ) : (
                  profile.collaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-3 hover:border-[var(--studio-secondary-border)] transition duration-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--studio-secondary-soft)] text-[var(--studio-secondary)] shrink-0 font-bold text-xs uppercase">
                          {collab.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--studio-text)] truncate">{collab.name}</p>
                          <p className="text-[10px] text-[var(--studio-muted)] truncate">
                            {collab.role || (locale === 'pt-BR' ? 'Sem Cargo' : 'No Role')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded bg-[var(--studio-panel-strong)] px-2 py-0.5 text-[9px] font-medium text-[var(--studio-subtle)] border border-[color:var(--studio-border)]">
                          {collab.company === 'outros' ? (locale === 'pt-BR' ? 'Outros' : 'Others') : collab.company}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCollaborator(collab.id)}
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer rounded-full"
                        >
                          <MaterialIcon name="delete" className="text-sm" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB: PREFERENCES */}
            <TabsContent value="preferences" className="space-y-4 outline-none focus:outline-none">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[var(--studio-muted)]">
                    {locale === 'pt-BR' ? 'Empresa Padrão' : 'Default Company'}
                  </Label>
                  <select
                    className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] px-3 h-9 focus:outline-none focus:border-[var(--studio-primary)] cursor-pointer"
                    value={profile.defaultCompany || ''}
                    onChange={(e) => handleSave({ ...profile, defaultCompany: e.target.value })}
                  >
                    {profile.companies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="">{locale === 'pt-BR' ? 'Nenhuma (Selecionar Manual)' : 'None (Manual Selection)'}</option>
                  </select>
                  <p className="text-[10px] text-[var(--studio-subtle)]">
                    {locale === 'pt-BR'
                      ? 'Workspace padrão pré-selecionado na tela de gravação.'
                      : 'Default workspace selected in the recording panel.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[var(--studio-muted)]">
                    {locale === 'pt-BR' ? 'Template Padrão da Reunião' : 'Default Meeting Template'}
                  </Label>
                  <select
                    className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] px-3 h-9 focus:outline-none focus:border-[var(--studio-primary)] cursor-pointer"
                    value={profile.defaultTemplate || 'default'}
                    onChange={(e) => handleSave({ ...profile, defaultTemplate: e.target.value as 'default' | 'daily' | 'oneOnOne' })}
                  >
                    <option value="default">{locale === 'pt-BR' ? 'Padrão (Reunião Geral)' : 'Default (General Meeting)'}</option>
                    <option value="daily">{locale === 'pt-BR' ? 'Daily Scrum (Acompanhamento)' : 'Daily Scrum (Status Tracker)'}</option>
                    <option value="oneOnOne">{locale === 'pt-BR' ? '1:1 Feedback (Individual)' : '1:1 Feedback (Individual)'}</option>
                  </select>
                  <p className="text-[10px] text-[var(--studio-subtle)]">
                    {locale === 'pt-BR'
                      ? 'Modelo de relatório padrão pré-selecionado para processar áudios.'
                      : 'Default report template pre-selected to process audio.'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-[var(--studio-primary-soft)] p-2 text-[var(--studio-primary)]">
                    <MaterialIcon name="psychology" className="text-base" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-[var(--studio-text)]">
                      {locale === 'pt-BR' ? 'Sincronização com IA Inteligente' : 'Smart AI Sync'}
                    </h5>
                    <p className="mt-1 text-[11px] text-[var(--studio-muted)] leading-relaxed">
                      {locale === 'pt-BR'
                        ? 'Todas as informações cadastradas neste painel (seu cargo e os colaboradores do respectivo projeto) são enviadas reativamente no payload de processamento do áudio. Isso possibilita que os algoritmos de transcrição façam a correlação exata de cargos e nomes, minimizando oradores genéricos.'
                        : 'All info configured here (your role and collaborators of the active workspace) is automatically synced in the audio processing payload, enabling accurate name/role correlation.'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="border-t border-[color:var(--studio-border)] bg-[var(--studio-panel)] px-6 py-4">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-[var(--studio-primary)] text-zinc-950 font-semibold hover:opacity-90 cursor-pointer h-9 px-4 text-xs"
          >
            {locale === 'pt-BR' ? 'Concluir' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
