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
import { Badge } from '@/components/ui/badge'
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
  
  // Local state for editing collaborator
  const [editingCollabId, setEditingCollabId] = useState<string | null>(null)
  const [editingCollabName, setEditingCollabName] = useState('')
  const [editingCollabRole, setEditingCollabRole] = useState('')
  const [editingCollabCompany, setEditingCollabCompany] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load profile on open
  useEffect(() => {
    if (open) {
      const loaded = getProfile()
      setProfile(loaded)
      setActiveTab(defaultTab)
      setEditingCollabId(null)
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

  // Start editing collaborator
  const handleStartEditCollab = (collab: Collaborator) => {
    setEditingCollabId(collab.id)
    setEditingCollabName(collab.name)
    setEditingCollabRole(collab.role)
    setEditingCollabCompany(collab.company)
  }

  // Save collaborator edit
  const handleSaveCollaboratorEdit = () => {
    if (!editingCollabId || !editingCollabName.trim()) return

    const updatedCollabs = profile.collaborators.map((c) => {
      if (c.id === editingCollabId) {
        return {
          ...c,
          name: editingCollabName.trim(),
          role: editingCollabRole.trim(),
          company: editingCollabCompany || 'outros',
        }
      }
      return c
    })

    handleSave({
      ...profile,
      collaborators: updatedCollabs,
    })

    setEditingCollabId(null)
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
      <DialogContent className="h-[700px] max-h-[90vh] max-w-4xl flex flex-col border-[color:var(--studio-border)] bg-[var(--studio-card)] p-0 text-[var(--studio-text)] shadow-2xl shadow-black/40 sm:max-w-4xl animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="border-b border-[color:var(--studio-border)] bg-[var(--studio-panel)] px-6 py-4 flex flex-row items-center justify-between shrink-0">
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

        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-10 border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-1 shrink-0">
              <TabsTrigger value="profile" className="gap-1.5 text-xs">
                <MaterialIcon name="account_circle" className="text-sm" />
                {locale === 'pt-BR' ? 'Meu Perfil' : 'My Profile'}
              </TabsTrigger>
              <TabsTrigger value="companies" className="gap-1.5 text-xs">
                <MaterialIcon name="business" className="text-sm" />
                {locale === 'pt-BR' ? 'Empresas' : 'Companies'}
              </TabsTrigger>
              <TabsTrigger value="collaborators" className="gap-1.5 text-xs">
                <MaterialIcon name="groups" className="text-sm" />
                {locale === 'pt-BR' ? 'Colaboradores' : 'Collaborators'}
              </TabsTrigger>
              <TabsTrigger value="preferences" className="gap-1.5 text-xs">
                <MaterialIcon name="tune" className="text-sm" />
                {locale === 'pt-BR' ? 'Preferências' : 'Preferences'}
              </TabsTrigger>
            </TabsList>

            {/* TAB: PROFILE */}
            <TabsContent value="profile" className="space-y-6 outline-none focus:outline-none">
              <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)]/50 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Left: Avatar Upload container */}
                  <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
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
                        className="h-24 w-24 rounded-full object-cover border-2 border-[var(--studio-primary-border)] shadow-[0_0_15px_rgba(var(--studio-primary-rgb),0.2)] transition duration-300 group-hover:opacity-80"
                      />
                    ) : (
                      <div
                        className={cn(
                          'flex h-24 w-24 items-center justify-center rounded-full border-2 border-[color:var(--studio-border)] bg-gradient-to-tr text-3xl font-bold text-white shadow-lg transition duration-300 group-hover:opacity-85',
                          profile.avatarColor || AVATAR_GRADIENTS[0]
                        )}
                      >
                        {getInitials()}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <MaterialIcon name="photo_camera" className="text-white text-xl animate-pulse" />
                    </div>
                  </div>

                  {/* Right: Identity information */}
                  <div className="flex-1 space-y-4 w-full">
                    <div className="space-y-1">
                      <Label htmlFor="profile-name" className="text-xs font-semibold text-[var(--studio-muted)]">
                        {locale === 'pt-BR' ? 'Seu Nome completo' : 'Your Full Name'}
                      </Label>
                      <Input
                        id="profile-name"
                        type="text"
                        placeholder={locale === 'pt-BR' ? 'Ex: Higor' : 'e.g. Higor'}
                        value={profile.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] h-10 text-sm focus:border-[var(--studio-primary)]"
                      />
                      <p className="text-[10px] text-[var(--studio-subtle)] leading-normal">
                        {locale === 'pt-BR' ? 'O nome que será usado para identificar suas falas nas reuniões.' : 'The name used to identify your voice in meetings.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-wider block">
                        {locale === 'pt-BR' ? 'Gradiente do Avatar' : 'Avatar Gradient'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {AVATAR_GRADIENTS.map((grad, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleAvatarColorSelect(grad)}
                            className={cn(
                              'h-7 w-7 rounded-full bg-gradient-to-tr border transition duration-300 hover:scale-110 cursor-pointer shadow-sm',
                              grad,
                              profile.avatarColor === grad && !profile.avatar
                                ? 'border-white scale-105 ring-2 ring-[var(--studio-primary)]'
                                : 'border-[color:var(--studio-border)] hover:border-[var(--studio-muted)]'
                            )}
                          />
                        ))}
                      </div>
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
                  <div className="rounded-lg border border-dashed border-[color:var(--studio-border)] p-6 text-center text-xs text-[var(--studio-muted)] bg-[var(--studio-panel)]/20">
                    <MaterialIcon name="business" className="text-lg text-[var(--studio-subtle)] mb-2 block mx-auto" />
                    {locale === 'pt-BR'
                      ? 'Adicione empresas na aba "Empresas" para configurar seus cargos.'
                      : 'Add companies under the "Companies" tab to configure your roles.'}
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {profile.companies.map((company) => (
                      <div
                        key={company}
                        className="flex items-center gap-4 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-3 hover:border-[var(--studio-primary-border)]/50 transition duration-200"
                      >
                        <div className="flex items-center gap-2 w-32 shrink-0">
                          <MaterialIcon name="business" className="text-sm text-[var(--studio-subtle)]" />
                          <span className="text-xs font-semibold text-[var(--studio-text)] truncate" title={company}>
                            {company}
                          </span>
                        </div>
                        <div className="flex-1">
                          <Input
                            type="text"
                            placeholder={locale === 'pt-BR' ? 'Ex: Tech Lead, PO, Designer' : 'e.g. Tech Lead, Designer'}
                            value={profile.rolesByCompany[company] || ''}
                            onChange={(e) => handleCompanyRoleChange(company, e.target.value)}
                            className="border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] h-8 text-xs w-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB: COMPANIES */}
            <TabsContent value="companies" className="space-y-4 outline-none focus:outline-none">
              <div className="flex gap-2 bg-[var(--studio-panel)]/30 p-3 rounded-lg border border-[color:var(--studio-border)]">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder={locale === 'pt-BR' ? 'Nova Empresa / Workspace (Ex: Google)' : 'New Company / Workspace (e.g. Google)'}
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCompany()}
                    className="border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] h-10 text-xs pl-8"
                  />
                  <MaterialIcon name="add_business" className="absolute left-2.5 top-3 text-xs text-[var(--studio-subtle)]" />
                </div>
                <Button
                  onClick={handleAddCompany}
                  size="sm"
                  className="bg-[var(--studio-primary)] text-[#061021] font-semibold hover:opacity-90 h-10 px-4 gap-1.5 shrink-0"
                >
                  <MaterialIcon name="add" className="text-sm" />
                  {locale === 'pt-BR' ? 'Adicionar' : 'Add'}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 max-h-[300px] overflow-y-auto pr-1">
                {profile.companies.length === 0 ? (
                  <div className="col-span-2 rounded-lg border border-dashed border-[color:var(--studio-border)] p-8 text-center text-xs text-[var(--studio-muted)] bg-[var(--studio-panel)]/20">
                    <MaterialIcon name="domain_disabled" className="text-xl text-[var(--studio-subtle)] mb-2 block mx-auto" />
                    {locale === 'pt-BR'
                      ? 'Nenhum workspace cadastrado.'
                      : 'No workspaces configured.'}
                  </div>
                ) : (
                  profile.companies.map((comp) => {
                    const isDefault = profile.defaultCompany === comp
                    const collabCount = profile.collaborators.filter((c) => c.company === comp).length
                    const userRole = profile.rolesByCompany[comp] || (locale === 'pt-BR' ? 'Sem Cargo definido' : 'No Role defined')

                    return (
                      <div
                        key={comp}
                        className={cn(
                          'flex flex-col justify-between rounded-xl border p-4 transition-all duration-300',
                          isDefault
                            ? 'border-[var(--studio-primary-border)] bg-[var(--studio-primary-soft)]/10 shadow-[0_0_12px_rgba(var(--studio-primary-rgb),0.05)]'
                            : 'border-[color:var(--studio-border)] bg-[var(--studio-panel)] hover:border-[var(--studio-muted)]'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <MaterialIcon
                              name="business"
                              className={cn('text-base shrink-0', isDefault ? 'text-[var(--studio-primary)] animate-pulse' : 'text-[var(--studio-subtle)]')}
                            />
                            <span className="text-xs font-bold text-[var(--studio-text)] truncate" title={comp}>{comp}</span>
                          </div>
                          {isDefault && (
                            <Badge className="bg-[var(--studio-primary-soft)] border-[var(--studio-primary-border)] text-[8px] font-bold text-[var(--studio-primary)] uppercase tracking-wider h-4 px-1">
                              {locale === 'pt-BR' ? 'Padrão' : 'Default'}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1.5 mb-4 text-[10px] text-[var(--studio-muted)]">
                          <div className="flex items-center gap-1.5 truncate">
                            <MaterialIcon name="person" className="text-[11px] text-[var(--studio-subtle)]" />
                            <span>{locale === 'pt-BR' ? `Seu Cargo: ${userRole}` : `Your Role: ${userRole}`}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MaterialIcon name="groups" className="text-[11px] text-[var(--studio-subtle)]" />
                            <span>{locale === 'pt-BR' ? `${collabCount} colaboradores` : `${collabCount} collaborators`}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[color:var(--studio-border)]/40 pt-2">
                          {isDefault ? (
                            <span className="text-[9px] text-[var(--studio-primary)] font-semibold flex items-center gap-1">
                              <MaterialIcon name="star" className="text-[10px]" filled />
                              {locale === 'pt-BR' ? 'Workspace Padrão' : 'Default Workspace'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultCompany(comp)}
                              className="text-[9px] font-semibold text-[var(--studio-subtle)] hover:text-[var(--studio-text)] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <MaterialIcon name="star_border" className="text-[10px]" />
                              {locale === 'pt-BR' ? 'Tornar Padrão' : 'Make Default'}
                            </button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCompany(comp)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer rounded-full"
                            title={locale === 'pt-BR' ? 'Excluir Empresa' : 'Delete Company'}
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
              <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)]/40 p-4 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="person_add" className="text-base text-[var(--studio-secondary)]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--studio-secondary)]">
                    {locale === 'pt-BR' ? 'Novo Colaborador Frequente' : 'New Frequent Collaborator'}
                  </h4>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="collab-name" className="text-[10px] text-[var(--studio-muted)] font-semibold">Nome</Label>
                    <Input
                      id="collab-name"
                      type="text"
                      placeholder="Ex: Ana Silva"
                      value={newCollabName}
                      onChange={(e) => setNewCollabName(e.target.value)}
                      className="border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="collab-role" className="text-[10px] text-[var(--studio-muted)] font-semibold">Cargo</Label>
                    <Input
                      id="collab-role"
                      type="text"
                      placeholder="Ex: PO, Senior Developer"
                      value={newCollabRole}
                      onChange={(e) => setNewCollabRole(e.target.value)}
                      className="border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--studio-muted)] font-semibold">Empresa</Label>
                    <select
                      className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] px-2.5 h-9 focus:outline-none focus:border-[var(--studio-primary)] cursor-pointer"
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
                <div className="flex justify-end pt-1 border-t border-[color:var(--studio-border)]/40">
                  <Button
                    onClick={handleAddCollaborator}
                    disabled={!newCollabName.trim()}
                    size="sm"
                    className="bg-[var(--studio-secondary)] text-[#061021] font-semibold hover:opacity-90 h-8 px-3 gap-1.5"
                  >
                    <MaterialIcon name="save" className="text-sm" />
                    {locale === 'pt-BR' ? 'Salvar Colaborador' : 'Save Collaborator'}
                  </Button>
                </div>
              </div>

              {/* Collab list grouped by company */}
              <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                {profile.collaborators.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[color:var(--studio-border)] p-6 text-center text-xs text-[var(--studio-muted)] bg-[var(--studio-panel)]/20">
                    <MaterialIcon name="group_add" className="text-xl text-[var(--studio-subtle)] mb-2 block mx-auto" />
                    {locale === 'pt-BR'
                      ? 'Nenhum colaborador frequente cadastrado.'
                      : 'No frequent collaborators configured.'}
                  </div>
                ) : (
                  (() => {
                    // Group collaborators
                    const grouped: Record<string, Collaborator[]> = {}
                    profile.companies.forEach((c) => { grouped[c] = [] })
                    grouped['outros'] = []

                    profile.collaborators.forEach((c) => {
                      const compKey = c.company || 'outros'
                      if (!grouped[compKey]) {
                        grouped[compKey] = []
                      }
                      grouped[compKey].push(c)
                    })

                    return Object.entries(grouped)
                      .filter(([_, collabs]) => collabs.length > 0)
                      .map(([comp, collabs]) => (
                        <div key={comp} className="space-y-2">
                          <div className="flex items-center gap-2 border-b border-[color:var(--studio-border)]/40 pb-1 shrink-0">
                            <MaterialIcon name="business" className="text-[11px] text-[var(--studio-secondary)]" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--studio-text)]">
                              {comp === 'outros' ? (locale === 'pt-BR' ? 'Outros (Sem Empresa)' : 'Others (No Company)') : comp}
                            </span>
                            <Badge className="h-4 text-[9px] px-1 bg-[var(--studio-panel-strong)] border-[color:var(--studio-border)] text-[var(--studio-muted)]">
                              {collabs.length}
                            </Badge>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            {collabs.map((collab) => {
                              const isEditing = editingCollabId === collab.id

                              return (
                                <div
                                  key={collab.id}
                                  className={cn(
                                    "flex items-center justify-between rounded-lg border p-2.5 transition duration-200",
                                    isEditing
                                      ? "border-[var(--studio-secondary-border)] bg-[var(--studio-panel-strong)]/30 w-full"
                                      : "border-[color:var(--studio-border)] bg-[var(--studio-panel)] hover:border-[var(--studio-secondary-border)]/50"
                                  )}
                                >
                                  {isEditing ? (
                                    <div className="flex flex-col gap-2 w-full">
                                      <div className="flex gap-2">
                                        <div className="flex-1 space-y-1">
                                          <Label className="text-[9px] text-[var(--studio-muted)] font-semibold">
                                            {locale === 'pt-BR' ? 'Nome' : 'Name'}
                                          </Label>
                                          <Input
                                            type="text"
                                            placeholder={locale === 'pt-BR' ? 'Ex: Ana Silva' : 'e.g. Ana Silva'}
                                            value={editingCollabName}
                                            onChange={(e) => setEditingCollabName(e.target.value)}
                                            className="h-8 text-xs border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] w-full font-medium"
                                          />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                          <Label className="text-[9px] text-[var(--studio-muted)] font-semibold">
                                            {locale === 'pt-BR' ? 'Cargo' : 'Role'}
                                          </Label>
                                          <Input
                                            type="text"
                                            placeholder={locale === 'pt-BR' ? 'Ex: PO' : 'e.g. PO'}
                                            value={editingCollabRole}
                                            onChange={(e) => setEditingCollabRole(e.target.value)}
                                            className="h-8 text-xs border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] w-full font-medium"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 space-y-1">
                                          <Label className="text-[9px] text-[var(--studio-muted)] font-semibold">
                                            {locale === 'pt-BR' ? 'Empresa' : 'Company'}
                                          </Label>
                                          <select
                                            className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] px-2 h-8 focus:outline-none focus:border-[var(--studio-primary)] cursor-pointer font-medium"
                                            value={editingCollabCompany}
                                            onChange={(e) => setEditingCollabCompany(e.target.value)}
                                          >
                                            {profile.companies.map((c) => (
                                              <option key={c} value={c}>{c}</option>
                                            ))}
                                            <option value="outros">
                                              {locale === 'pt-BR' ? 'Outros (Sem Empresa)' : 'Others (No Company)'}
                                            </option>
                                          </select>
                                        </div>
                                        <div className="flex items-end gap-1 h-full pt-4">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleSaveCollaboratorEdit}
                                            disabled={!editingCollabName.trim()}
                                            className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-full cursor-pointer"
                                            title={locale === 'pt-BR' ? 'Salvar' : 'Save'}
                                          >
                                            <MaterialIcon name="check" className="text-sm" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingCollabId(null)}
                                            className="h-8 w-8 p-0 text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-panel-strong)] rounded-full cursor-pointer"
                                            title={locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
                                          >
                                            <MaterialIcon name="close" className="text-sm" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--studio-secondary-soft)] text-[var(--studio-secondary)] shrink-0 font-bold text-[10px] uppercase">
                                          {collab.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-[var(--studio-text)] truncate">{collab.name}</p>
                                          <p className="text-[9px] text-[var(--studio-muted)] truncate">
                                            {collab.role || (locale === 'pt-BR' ? 'Sem Cargo' : 'No Role')}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleStartEditCollab(collab)}
                                          className="h-6 w-6 p-0 text-[var(--studio-subtle)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-panel-strong)] cursor-pointer rounded-full"
                                          title={locale === 'pt-BR' ? 'Editar Colaborador' : 'Edit Collaborator'}
                                        >
                                          <MaterialIcon name="edit" className="text-xs" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteCollaborator(collab.id)}
                                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer rounded-full shrink-0"
                                          title={locale === 'pt-BR' ? 'Excluir Colaborador' : 'Delete Collaborator'}
                                        >
                                          <MaterialIcon name="delete" className="text-xs" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))
                  })()
                )}
              </div>
            </TabsContent>

            {/* TAB: PREFERENCES */}
            <TabsContent value="preferences" className="space-y-6 outline-none focus:outline-none">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <MaterialIcon name="business" className="text-sm text-[var(--studio-primary)]" />
                    <Label className="text-xs font-bold text-[var(--studio-text)] uppercase tracking-wider">
                      {locale === 'pt-BR' ? 'Workspace Padrão' : 'Default Workspace'}
                    </Label>
                  </div>
                  <select
                    className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] px-3 h-10 focus:outline-none focus:border-[var(--studio-primary)] cursor-pointer"
                    value={profile.defaultCompany || ''}
                    onChange={(e) => handleSave({ ...profile, defaultCompany: e.target.value })}
                  >
                    {profile.companies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="">{locale === 'pt-BR' ? 'Nenhuma (Selecionar Manual)' : 'None (Manual Selection)'}</option>
                  </select>
                  <p className="text-[10px] text-[var(--studio-muted)] leading-relaxed">
                    {locale === 'pt-BR'
                      ? 'Workspace padrão pré-selecionado na tela de gravação.'
                      : 'Default workspace selected in the recording panel.'}
                  </p>
                </div>

                <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <MaterialIcon name="description" className="text-sm text-[var(--studio-primary)]" />
                    <Label className="text-xs font-bold text-[var(--studio-text)] uppercase tracking-wider">
                      {locale === 'pt-BR' ? 'Template de Reunião' : 'Meeting Template'}
                    </Label>
                  </div>
                  <select
                    className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] px-3 h-10 focus:outline-none focus:border-[var(--studio-primary)] cursor-pointer"
                    value={profile.defaultTemplate || 'default'}
                    onChange={(e) => handleSave({ ...profile, defaultTemplate: e.target.value as 'default' | 'daily' | 'oneOnOne' })}
                  >
                    <option value="default">{locale === 'pt-BR' ? 'Padrão (Reunião Geral)' : 'Default (General Meeting)'}</option>
                    <option value="daily">{locale === 'pt-BR' ? 'Daily Scrum (Acompanhamento)' : 'Daily Scrum (Status Tracker)'}</option>
                    <option value="oneOnOne">{locale === 'pt-BR' ? '1:1 Feedback (Individual)' : '1:1 Feedback (Individual)'}</option>
                  </select>
                  <p className="text-[10px] text-[var(--studio-muted)] leading-relaxed">
                    {locale === 'pt-BR'
                      ? 'Modelo de relatório padrão pré-selecionado para processar áudios.'
                      : 'Default report template pre-selected to process audio.'}
                  </p>
                </div>
              </div>

              {/* Sync explanation box */}
              <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)]/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-[var(--studio-primary-soft)] p-2 text-[var(--studio-primary)] shrink-0">
                    <MaterialIcon name="psychology" className="text-base" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[var(--studio-text)] uppercase tracking-wider">
                      {locale === 'pt-BR' ? 'Sincronização com IA Inteligente' : 'Smart AI Sync'}
                    </h5>
                    <p className="mt-1.5 text-[11px] text-[var(--studio-muted)] leading-relaxed">
                      {locale === 'pt-BR'
                        ? 'Todas as informações cadastradas neste painel (seu cargo e os colaboradores do respectivo projeto) são enviadas no payload de processamento do áudio. Isso possibilita que os algoritmos de transcrição façam a correlação exata de cargos e nomes, minimizando oradores genéricos.'
                        : 'All info configured here (your role and collaborators of the active workspace) is automatically synced in the audio processing payload, enabling accurate name/role correlation.'}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[color:var(--studio-border)]/40 pt-2 flex items-center justify-between text-[10px] text-[var(--studio-muted)]">
                  <span>{locale === 'pt-BR' ? 'Status do Time:' : 'Team Status:'}</span>
                  <span className="font-semibold text-[var(--studio-primary)]">
                    {locale === 'pt-BR'
                      ? `${profile.companies.length} workspaces e ${profile.collaborators.length} colaboradores integrados`
                      : `${profile.companies.length} workspaces and ${profile.collaborators.length} collaborators integrated`}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="border-t border-[color:var(--studio-border)] bg-[var(--studio-panel)] px-6 py-4 shrink-0">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-[var(--studio-primary)] text-[#061021] font-semibold hover:opacity-90 cursor-pointer h-9 px-4 text-xs"
          >
            {locale === 'pt-BR' ? 'Concluir' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
