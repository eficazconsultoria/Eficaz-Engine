"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Search,
  FileText,
  Calendar,
  Clock,
  Copy,
  Check,
  Download,
  Eye,
  MoreVertical,
  Sparkles,
  Tag,
  Loader2,
  FileCode,
  AlertCircle,
  X,
  RotateCcw,
  Lightbulb,
} from "lucide-react"
import { HtmlEditor } from "@/components/dashboard/html-editor"
import type { ClientContentHistory } from "@/lib/types"

export default function SeoHistoryPage() {
  const params = useParams()
  const router = useRouter()
  const clientSlug = params.client_slug as string

  const [history, setHistory] = useState<ClientContentHistory[]>([])
  const [filteredHistory, setFilteredHistory] = useState<ClientContentHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<ClientContentHistory | null>(null)
  const [editableContent, setEditableContent] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [clientName, setClientName] = useState("")

  useEffect(() => {
    fetchHistory()
  }, [clientSlug])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredHistory(history)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredHistory(
        history.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.main_keyword?.toLowerCase().includes(query) ||
            stripHtml(item.content).toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, history])

  async function fetchHistory() {
    try {
      const response = await fetch(`/api/clients/${clientSlug}/seo/history`)
      
      if (response.status === 403) {
        router.push(`/${clientSlug}/prompts`)
        return
      }
      
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar historico")
      }

      setHistory(data.history || [])
      setFilteredHistory(data.history || [])
      setClientName(data.clientName || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar historico")
    } finally {
      setIsLoading(false)
    }
  }

  function stripHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html")
    return doc.body.textContent || ""
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function getRelativeTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Hoje"
    if (diffDays === 1) return "Ontem"
    if (diffDays < 7) return `${diffDays} dias atras`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atras`
    return `${Math.floor(diffDays / 30)} meses atras`
  }

  async function handleCopy(item: ClientContentHistory, e?: React.MouseEvent) {
    e?.stopPropagation()
    const plainText = stripHtml(item.content)
    await navigator.clipboard.writeText(plainText)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleDownloadTxt(item: ClientContentHistory, e?: React.MouseEvent) {
    e?.stopPropagation()
    const plainText = stripHtml(item.content)
    const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${item.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadHtml(item: ClientContentHistory, e?: React.MouseEvent) {
    e?.stopPropagation()
    const blob = new Blob([item.content], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${item.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  function getKeywordFromTitle(title: string): string {
    return title.replace(/^SEO:\s*/i, "")
  }

  function getWordCount(content: string): number {
    return stripHtml(content).split(/\s+/).filter(Boolean).length
  }

  function openEditor(item: ClientContentHistory) {
    setSelectedItem(item)
    setEditableContent(item.content)
  }

  function closeEditor() {
    setSelectedItem(null)
    setEditableContent("")
  }

  function resetContent() {
    if (selectedItem) {
      setEditableContent(selectedItem.content)
    }
  }

  async function handleCopyEditable() {
    const plainText = stripHtml(editableContent)
    await navigator.clipboard.writeText(plainText)
    setCopiedId(selectedItem?.id || null)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleDownloadEditableTxt() {
    const plainText = stripHtml(editableContent)
    const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${selectedItem?.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() || "seo-text"}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadEditableHtml() {
    const blob = new Blob([editableContent], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${selectedItem?.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() || "seo-text"}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando historico...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" onClick={() => fetchHistory()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/${clientSlug}/seo`}>
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Historico de Textos SEO</h1>
            <p className="text-muted-foreground">
              {history.length} {history.length === 1 ? "texto gerado" : "textos gerados"} para {clientName}
            </p>
          </div>
        </div>
        <Link href={`/${clientSlug}/seo`}>
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Gerar Novo Texto
          </Button>
        </Link>
      </div>

      {/* Search */}
      {history.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por palavra-chave ou conteudo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Empty State */}
      {history.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum texto SEO gerado ainda</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Comece gerando seu primeiro texto SEO otimizado para melhorar o posicionamento do seu site.
            </p>
            <Link href={`/${clientSlug}/seo`}>
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                Gerar Primeiro Texto
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {history.length > 0 && filteredHistory.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground">
              Tente buscar por outra palavra-chave ou termo.
            </p>
          </CardContent>
        </Card>
      )}

      {/* History Grid */}
      {filteredHistory.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHistory.map((item) => (
            <Card
              key={item.id}
              className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => openEditor(item)}
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Badge variant="secondary" className="gap-1.5 font-normal">
                    <Tag className="h-3 w-3" />
                    {getKeywordFromTitle(item.title)}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditor(item) }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleCopy(item, e)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar texto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDownloadTxt(item, e)}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar TXT
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDownloadHtml(item, e)}>
                        <FileCode className="h-4 w-4 mr-2" />
                        Baixar HTML
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Preview */}
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[3.75rem]">
                  {stripHtml(item.content).slice(0, 180)}...
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(item.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {getWordCount(item.content)} palavras
                    </span>
                  </div>
                  <span className="text-primary/70">{getRelativeTime(item.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full-screen Editor Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-background">
          {/* Header */}
          <div className="border-b bg-card">
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={closeEditor}
                  className="shrink-0 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold">
                    {getKeywordFromTitle(selectedItem.title)}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(selectedItem.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(selectedItem.created_at)}
                    </span>
                    {selectedItem.platform && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedItem.platform === "category" ? "Categoria" : "Produto"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetContent}
                  className="gap-2 bg-transparent"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Restaurar Original</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEditable}
                  className="gap-2 bg-transparent"
                >
                  {copiedId === selectedItem.id ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="hidden sm:inline">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline">Copiar</span>
                    </>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Baixar</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadEditableTxt}>
                      <FileText className="h-4 w-4 mr-2" />
                      Texto Simples (.txt)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadEditableHtml}>
                      <FileCode className="h-4 w-4 mr-2" />
                      HTML (.html)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Editor Area */}
          <div className="h-[calc(100vh-80px)] overflow-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Keywords info */}
              {(selectedItem.main_keyword || (selectedItem.secondary_keywords && selectedItem.secondary_keywords.length > 0)) && (
                <div className="flex flex-wrap items-center gap-2 pb-4 border-b">
                  {selectedItem.main_keyword && (
                    <Badge className="gap-1.5">
                      <Tag className="h-3 w-3" />
                      {selectedItem.main_keyword}
                    </Badge>
                  )}
                  {selectedItem.secondary_keywords?.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}

              {/* HTML Editor */}
              <HtmlEditor 
                value={editableContent} 
                onChange={setEditableContent} 
              />

              {/* Tips */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Dicas de Uso
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Use o modo Visual para editar o texto diretamente e o modo HTML para ajustar as tags</li>
                  <li>O arquivo .txt contem somente o texto puro, sem formatacao HTML</li>
                  <li>O arquivo .html esta pronto para colar na plataforma de e-commerce</li>
                  <li>Adicione links internos relevantes para melhorar a navegacao</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
