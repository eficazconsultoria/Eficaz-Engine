"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Search,
  Building2,
  Filter,
  MoreVertical,
  Globe,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import type { Client, ClientSegment, ClientType, ClientFocus } from "@/lib/types"
import { createNewClient, updateExistingClient, toggleClientStatus, removeClient } from "./actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ClientManagementProps {
  clients: Client[]
}

const SEGMENTS: { value: ClientSegment; label: string }[] = [
  { value: "imobiliario", label: "Imobiliario" },
  { value: "moda", label: "Moda" },
  { value: "automotivo", label: "Automotivo" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "saude", label: "Saude" },
  { value: "educacao", label: "Educacao" },
  { value: "alimentacao", label: "Alimentacao" },
  { value: "servicos", label: "Servicos" },
  { value: "varejo", label: "Varejo" },
  { value: "industria", label: "Industria" },
  { value: "financeiro", label: "Financeiro" },
  { value: "turismo", label: "Turismo" },
  { value: "beleza", label: "Beleza" },
  { value: "esportes", label: "Esportes" },
  { value: "pets", label: "Pets" },
  { value: "outro", label: "Outro" },
]

const TYPES: { value: ClientType; label: string }[] = [
  { value: "ecommerce", label: "E-commerce (Vendas)" },
  { value: "lead_generation", label: "Coleta de Leads" },
]

const FOCUS_OPTIONS: { value: ClientFocus; label: string }[] = [
  { value: "autoridade", label: "Autoridade" },
  { value: "venda", label: "Venda" },
  { value: "coleta_leads", label: "Coleta de Leads" },
  { value: "branding", label: "Branding" },
  { value: "engajamento", label: "Engajamento" },
  { value: "trafego", label: "Trafego" },
]

const SEGMENT_COLORS: Record<ClientSegment, string> = {
  imobiliario: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  moda: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  automotivo: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  tecnologia: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  saude: "bg-green-500/10 text-green-500 border-green-500/20",
  educacao: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  alimentacao: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  servicos: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  varejo: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  industria: "bg-stone-500/10 text-stone-500 border-stone-500/20",
  financeiro: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  turismo: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  beleza: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  esportes: "bg-lime-500/10 text-lime-500 border-lime-500/20",
  pets: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  outro: "bg-muted text-muted-foreground border-muted",
}

const TYPE_COLORS: Record<ClientType, string> = {
  ecommerce: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  lead_generation: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
}

const FOCUS_COLORS: Record<ClientFocus, string> = {
  autoridade: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  venda: "bg-green-500/10 text-green-500 border-green-500/20",
  coleta_leads: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  branding: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  engajamento: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  trafego: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
}

export function ClientManagement({ clients: initialClients }: ClientManagementProps) {
  const [clients, setClients] = useState(initialClients)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [segmentFilter, setSegmentFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    site: "",
    segment: "tecnologia" as ClientSegment,
    type: "ecommerce" as ClientType,
    focus: "venda" as ClientFocus,
    target_audience: "",
  })

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSegment = segmentFilter === "all" || client.segment === segmentFilter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && client.active) ||
      (statusFilter === "inactive" && !client.active)
    return matchesSearch && matchesSegment && matchesStatus
  })

  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.active).length,
    inactive: clients.filter((c) => !c.active).length,
    ecommerce: clients.filter((c) => c.type === "ecommerce").length,
  }

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      site: "",
      segment: "tecnologia",
      type: "ecommerce",
      focus: "venda",
      target_audience: "",
    })
    setError(null)
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }))
  }

  const handleCreate = async () => {
    setIsLoading(true)
    setError(null)

    const data = new FormData()
    data.set("name", formData.name)
    data.set("slug", formData.slug)
    data.set("site", formData.site)
    data.set("segment", formData.segment)
    data.set("type", formData.type)
    data.set("focus", formData.focus)
    data.set("target_audience", formData.target_audience)

    const result = await createNewClient(data)

    if (result.success && result.client) {
      setClients([result.client, ...clients])
      setShowCreateDialog(false)
      resetForm()
    } else {
      setError(result.error || "Erro ao criar cliente")
    }

    setIsLoading(false)
  }

  const handleUpdate = async () => {
    if (!editingClient) return

    setIsLoading(true)
    setError(null)

    const data = new FormData()
    data.set("name", formData.name)
    data.set("slug", formData.slug)
    data.set("site", formData.site)
    data.set("segment", formData.segment)
    data.set("type", formData.type)
    data.set("focus", formData.focus)
    data.set("target_audience", formData.target_audience)

    const result = await updateExistingClient(editingClient.id, data)

    if (result.success && result.client) {
      setClients(clients.map((c) => (c.id === editingClient.id ? result.client! : c)))
      setEditingClient(null)
      resetForm()
    } else {
      setError(result.error || "Erro ao atualizar cliente")
    }

    setIsLoading(false)
  }

  const handleToggleStatus = async (client: Client) => {
    const result = await toggleClientStatus(client.id, !client.active)

    if (result.success) {
      setClients(clients.map((c) => (c.id === client.id ? { ...c, active: !c.active } : c)))
    }
  }

  const handleDelete = async () => {
    if (!deletingClient) return

    setIsLoading(true)
    const result = await removeClient(deletingClient.id)

    if (result.success) {
      setClients(clients.filter((c) => c.id !== deletingClient.id))
      setDeletingClient(null)
    } else {
      setError(result.error || "Erro ao remover cliente")
    }

    setIsLoading(false)
  }

  const openEditDialog = (client: Client) => {
    setFormData({
      name: client.name,
      slug: client.slug,
      site: client.site || "",
      segment: client.segment,
      type: client.type,
      focus: client.focus,
      target_audience: client.target_audience || "",
    })
    setEditingClient(client)
    setError(null)
  }

  const getSegmentLabel = (segment: ClientSegment) => {
    return SEGMENTS.find((s) => s.value === segment)?.label || segment
  }

  const getTypeLabel = (type: ClientType) => {
    return TYPES.find((t) => t.value === type)?.label || type
  }

  const getFocusLabel = (focus: ClientFocus) => {
    return FOCUS_OPTIONS.find((f) => f.value === focus)?.label || focus
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Clientes Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <XCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactive}</p>
                <p className="text-xs text-muted-foreground">Clientes Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <Globe className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.ecommerce}</p>
                <p className="text-xs text-muted-foreground">E-commerces</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card/50 border-border/50"
          />
        </div>

        <div className="flex gap-2">
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-[160px] bg-card/50 border-border/50">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os segmentos</SelectItem>
              {SEGMENTS.map((segment) => (
                <SelectItem key={segment.value} value={segment.value}>
                  {segment.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-card/50 border-border/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Cliente</span>
          </Button>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((client, index) => (
          <Link
            key={client.id}
            href={`/${client.slug}`}
            className="block"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Card className="bg-card/50 border-border/50 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 group overflow-hidden cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{client.name}</h3>
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                        <span className="font-mono">/{client.slug}</span>
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/${client.slug}`} className="cursor-pointer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Acessar Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault()
                          openEditDialog(client)
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault()
                          handleToggleStatus(client)
                        }}
                      >
                        {client.active ? (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-2" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <ToggleRight className="h-4 w-4 mr-2" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault()
                          setDeletingClient(client)
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {client.site && (
                  <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                    <span
                      onClick={(e) => {
                        e.preventDefault()
                        window.open(
                          client.site!.startsWith("http") ? client.site! : `https://${client.site}`,
                          "_blank"
                        )
                      }}
                      className="hover:text-primary truncate cursor-pointer"
                    >
                      {client.site}
                    </span>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`${SEGMENT_COLORS[client.segment]} border`}>
                    {getSegmentLabel(client.segment)}
                  </Badge>
                  <Badge variant="outline" className={`${TYPE_COLORS[client.type]} border`}>
                    {getTypeLabel(client.type)}
                  </Badge>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className={`${FOCUS_COLORS[client.focus]} border text-xs`}>
                    Foco: {getFocusLabel(client.focus)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      client.active
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {client.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Criado em {new Date(client.created_at).toLocaleDateString("pt-BR")}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">Nenhum cliente encontrado</h3>
          <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou criar um novo cliente</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || !!editingClient}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false)
            setEditingClient(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              {editingClient
                ? "Atualize as informacoes do cliente"
                : "Preencha as informacoes para criar um novo cliente"}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Cliente *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Empresa ABC"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                placeholder="ex: empresa-abc"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                O slug sera usado na URL: /{formData.slug || "slug-do-cliente"}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="site">Site (opcional)</Label>
              <Input
                id="site"
                value={formData.site}
                onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                placeholder="https://www.exemplo.com.br"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="segment">Segmento *</Label>
              <Select
                value={formData.segment}
                onValueChange={(value) => setFormData({ ...formData, segment: value as ClientSegment })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((segment) => (
                    <SelectItem key={segment.value} value={segment.value}>
                      {segment.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Tipo de Negocio *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as ClientType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="focus">Foco Principal *</Label>
              <Select
                value={formData.focus}
                onValueChange={(value) => setFormData({ ...formData, focus: value as ClientFocus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o foco" />
                </SelectTrigger>
                <SelectContent>
                  {FOCUS_OPTIONS.map((focus) => (
                    <SelectItem key={focus.value} value={focus.value}>
                      {focus.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="target_audience">Publico-Alvo *</Label>
              <Textarea
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                placeholder="Descreva o publico-alvo do cliente. Ex: Mulheres de 25-45 anos, classe A/B, interessadas em moda sustentavel, que valorizam qualidade e exclusividade..."
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Descreva detalhadamente o publico-alvo. Essa informacao sera usada para gerar prompts de busca de IA personalizados.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingClient(null)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button onClick={editingClient ? handleUpdate : handleCreate} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingClient ? "Salvar Alteracoes" : "Criar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o cliente <strong>{deletingClient?.name}</strong>? Esta acao nao pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
