"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Users,
  Plus,
  Globe,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  ExternalLink,
  HelpCircle,
  Target,
  Search,
} from "lucide-react"
import type { ClientCompetitor } from "@/lib/types"

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

// Helper component for tooltips
function InfoTooltip({ whatIs, purpose, howItWorks }: { 
  whatIs: string
  purpose: string
  howItWorks: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm p-4 bg-popover text-popover-foreground">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-xs text-primary mb-0.5">O que e?</p>
              <p className="text-xs text-popover-foreground">{whatIs}</p>
            </div>
            <div>
              <p className="font-semibold text-xs text-primary mb-0.5">Para que serve?</p>
              <p className="text-xs text-popover-foreground">{purpose}</p>
            </div>
            <div>
              <p className="font-semibold text-xs text-primary mb-0.5">Como funciona?</p>
              <p className="text-xs text-popover-foreground">{howItWorks}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function ConcorrentesPage() {
  const params = useParams()
  const router = useRouter()
  const clientSlug = params.client_slug as string

  const [competitors, setCompetitors] = useState<ClientCompetitor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCompetitor, setEditingCompetitor] = useState<ClientCompetitor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formWebsite, setFormWebsite] = useState("")
  const [formNotes, setFormNotes] = useState("")

  async function fetchCompetitors() {
    try {
      const response = await fetch(`/api/clients/${clientSlug}/competitors`)
      const data = await response.json()

      // Redirect client users who don't have access
      if (response.status === 403) {
        router.push(`/${clientSlug}/prompts`)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar concorrentes")
      }

      setCompetitors(data.competitors)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar concorrentes")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCompetitors()
  }, [clientSlug])

  function resetForm() {
    setFormName("")
    setFormWebsite("")
    setFormNotes("")
    setEditingCompetitor(null)
  }

  function openEditDialog(competitor: ClientCompetitor) {
    setEditingCompetitor(competitor)
    setFormName(competitor.name)
    setFormWebsite(competitor.website || "")
    setFormNotes(competitor.notes || "")
    setIsAddDialogOpen(true)
  }

  async function handleSubmit() {
    if (!formName.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const url = editingCompetitor
        ? `/api/clients/${clientSlug}/competitors/${editingCompetitor.id}`
        : `/api/clients/${clientSlug}/competitors`

      const response = await fetch(url, {
        method: editingCompetitor ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          website: formWebsite.trim() || null,
          notes: formNotes.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar concorrente")
      }

      await fetchCompetitors()
      setIsAddDialogOpen(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar concorrente")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleTracking(competitor: ClientCompetitor) {
    try {
      const response = await fetch(`/api/clients/${clientSlug}/competitors/${competitor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !competitor.is_active }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erro ao alterar status")
      }

      setCompetitors((prev) =>
        prev.map((c) => (c.id === competitor.id ? { ...c, is_active: !c.is_active } : c))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar status")
    }
  }

  async function handleDelete(competitorId: string) {
    try {
      const response = await fetch(`/api/clients/${clientSlug}/competitors/${competitorId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erro ao excluir concorrente")
      }

      setCompetitors((prev) => prev.filter((c) => c.id !== competitorId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir concorrente")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const trackedCount = competitors.filter((c) => c.is_active).length

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Concorrentes</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie os concorrentes para monitorar nos testes de IA
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Counter Badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {trackedCount} <span className="text-muted-foreground">monitorando</span>
            </span>
          </div>

          <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {editingCompetitor ? "Editar Concorrente" : "Novo Concorrente"}
                </DialogTitle>
                <DialogDescription>
                  {editingCompetitor
                    ? "Atualize as informacoes do concorrente."
                    : "Adicione um concorrente para monitorar nos testes de IA."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-1">
                    Nome da Empresa
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ex: Empresa Concorrente"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    Site
                    <InfoTooltip
                      whatIs="URL do site oficial do concorrente."
                      purpose="Permite identificar a empresa com mais precisao nos testes de IA."
                      howItWorks="A URL e usada para extrair o dominio e facilitar a identificacao nas respostas."
                    />
                  </Label>
                  <Input
                    id="website"
                    placeholder="Ex: https://concorrente.com.br"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observacoes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notas sobre este concorrente (diferenciais, pontos fortes, etc)..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!formName.trim() || isSubmitting}>
                  {isSubmitting ? "Salvando..." : editingCompetitor ? "Salvar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-dashed bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
              <Search className="h-5 w-5 text-blue-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                Como funciona o monitoramento?
                <InfoTooltip
                  whatIs="Sistema que acompanha a presenca dos seus concorrentes nas respostas de IA."
                  purpose="Permite comparar sua visibilidade com a dos concorrentes e identificar oportunidades."
                  howItWorks="Os concorrentes ativos sao rastreados em cada teste de prompt, detectando quando sao mencionados pela IA."
                />
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Adicione os concorrentes que deseja acompanhar. Quando um teste de prompt for executado, 
                o sistema detecta automaticamente se eles foram mencionados pela IA, permitindo comparar 
                sua presenca com a deles. Ative ou desative o monitoramento a qualquer momento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error alert */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => setError(null)}
            >
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      {competitors.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-background to-muted/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{competitors.length}</p>
                  <p className="text-xs text-muted-foreground">Total cadastrados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-background to-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Eye className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{trackedCount}</p>
                  <p className="text-xs text-muted-foreground">Sendo monitorados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-background to-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <EyeOff className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{competitors.length - trackedCount}</p>
                  <p className="text-xs text-muted-foreground">Pausados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Competitors list */}
      {competitors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Nenhum concorrente cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Adicione concorrentes para acompanhar como eles aparecem nas respostas de IA em
              comparacao com o seu cliente.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Concorrente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitors.map((competitor) => (
            <Card
              key={competitor.id}
              className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md ${
                competitor.is_active
                  ? "border-emerald-500/30 bg-gradient-to-br from-background to-emerald-500/5"
                  : "border-border/50 opacity-70 hover:opacity-100"
              }`}
            >
              {/* Status indicator bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                competitor.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
              }`} />
              
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${
                        competitor.is_active ? "bg-emerald-500/10" : "bg-muted"
                      }`}>
                        <Building2 className={`h-4 w-4 ${
                          competitor.is_active ? "text-emerald-500" : "text-muted-foreground"
                        }`} />
                      </div>
                      <CardTitle className="text-base truncate">
                        {competitor.name}
                      </CardTitle>
                    </div>
                    
                    {competitor.website && getHostname(competitor.website) && (
                      <a
                        href={competitor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group/link"
                      >
                        <Globe className="h-3 w-3" />
                        <span className="truncate">{getHostname(competitor.website)}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center">
                            <Switch
                              checked={competitor.is_active}
                              onCheckedChange={() => handleToggleTracking(competitor)}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {competitor.is_active ? "Clique para pausar monitoramento" : "Clique para ativar monitoramento"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {competitor.notes && (
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2 bg-muted/30 rounded-md p-2">
                    {competitor.notes}
                  </p>
                )}
                
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      competitor.is_active 
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {competitor.is_active ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Monitorando
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Pausado
                      </>
                    )}
                  </Badge>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 flex-1"
                    onClick={() => openEditDialog(competitor)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Trash2 className="h-5 w-5 text-destructive" />
                          Excluir Concorrente
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir <strong>{competitor.name}</strong>? 
                          Esta acao nao pode ser desfeita e todos os dados de monitoramento serao perdidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(competitor.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Add Card */}
          <Card 
            className="border-dashed cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center min-h-[200px]"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Adicionar Concorrente
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
