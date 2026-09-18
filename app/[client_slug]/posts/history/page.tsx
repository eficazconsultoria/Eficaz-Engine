"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { HtmlEditor } from "@/components/dashboard/html-editor"
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
  MoreVertical,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  RotateCcw,
  Lightbulb,
  Instagram,
  Linkedin,
  Facebook,
  Twitter,
  BookOpen,
  MessageCircle,
  AlignLeft,
  RefreshCw,
  ImageIcon,
} from "lucide-react"
import { generateBlogSummary, saveBlogSummary, generateBlogCoverImage } from "../actions"
import type { ClientContentHistory } from "@/lib/types"

// Platform icons mapping
const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  blog: <BookOpen className="h-4 w-4" />,
}

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  twitter: "Twitter/X",
  blog: "Blog",
}

export default function PostsHistoryPage() {
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
  
  // Blog summary states
  const [blogSummary, setBlogSummary] = useState<string | null>(null)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)
  
  // Blog cover image states
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [isGeneratingCoverImage, setIsGeneratingCoverImage] = useState(false)
  
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
            item.content.toLowerCase().includes(query) ||
            (item.platform && item.platform.toLowerCase().includes(query))
        )
      )
    }
  }, [searchQuery, history])

  async function fetchHistory() {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/clients/${clientSlug}/posts/history`)
      
      if (response.status === 403) {
        router.push(`/${clientSlug}/prompts`)
        return
      }
      
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar historico")
      }

      setHistory(data.history)
      setFilteredHistory(data.history)
      setClientName(data.clientName || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar historico")
    } finally {
      setIsLoading(false)
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function getPreview(content: string, maxLength = 150): string {
    const plainText = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
    return plainText.length > maxLength ? plainText.slice(0, maxLength) + "..." : plainText
  }

  function getTopicFromTitle(title: string): string {
    // Title format: "Platform: Topic..."
    const parts = title.split(": ")
    return parts.length > 1 ? parts.slice(1).join(": ") : title
  }

  function getPlatformFromTitle(title: string): string {
    const parts = title.split(": ")
    return parts[0].toLowerCase()
  }

  function getCharCount(content: string): number {
    return content.replace(/<[^>]*>/g, "").length
  }

  function openEditor(item: ClientContentHistory) {
    setSelectedItem(item)
    setEditableContent(item.content)
    setBlogSummary(item.summary || null) // Load saved summary if exists
    setCoverImageUrl(item.cover_image_url || null) // Load saved cover image if exists
  }

  function closeEditor() {
    setSelectedItem(null)
    setEditableContent("")
    setBlogSummary(null)
    setCoverImageUrl(null)
  }

  async function handleGenerateSummary() {
    if (!editableContent || !selectedItem) return
    
    setIsGeneratingSummary(true)
    // Pass the content history ID to save the summary automatically
    const result = await generateBlogSummary(editableContent, selectedItem.id)
    
    if (result.success && result.summary) {
      setBlogSummary(result.summary)
      // Update the item in the local state
      setHistory(prev => prev.map(item => 
        item.id === selectedItem.id ? { ...item, summary: result.summary! } : item
      ))
    }
    setIsGeneratingSummary(false)
  }

  async function handleCopySummary() {
    if (blogSummary) {
      await navigator.clipboard.writeText(blogSummary)
      setCopiedSummary(true)
      setTimeout(() => setCopiedSummary(false), 2000)
    }
  }

  async function handleGenerateCoverImage() {
    if (!editableContent || !selectedItem) return
    
    // Extract topic from title
    const topic = selectedItem.title.replace(/^(Blog|Instagram|LinkedIn|Twitter|Facebook):\s*/i, "")
    
    setIsGeneratingCoverImage(true)
    const result = await generateBlogCoverImage(editableContent, topic, selectedItem.id)
    
    if (result.success && result.imageUrl) {
      setCoverImageUrl(result.imageUrl)
      // Update the item in the local state
      setHistory(prev => prev.map(item => 
        item.id === selectedItem.id ? { ...item, cover_image_url: result.imageUrl! } : item
      ))
    }
    setIsGeneratingCoverImage(false)
  }
  
  function resetContent() {
    if (selectedItem) {
      setEditableContent(selectedItem.content)
    }
  }

  async function handleCopy(item: ClientContentHistory) {
    await navigator.clipboard.writeText(item.content)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleCopyEditable() {
    await navigator.clipboard.writeText(editableContent)
    setCopiedId(selectedItem?.id || null)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleDownload(item: ClientContentHistory) {
    const blob = new Blob([item.content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${item.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadEditable() {
    const blob = new Blob([editableContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${selectedItem?.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() || "post"}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando historico...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" onClick={fetchHistory}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${clientSlug}/posts`}>
            <Button variant="ghost" size="icon" className="rounded-full shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Historico de Posts</h1>
            <p className="text-muted-foreground text-sm">
              {clientName && <span className="font-medium">{clientName}</span>}
              {clientName && " • "}
              {history.length} {history.length === 1 ? "post gerado" : "posts gerados"}
            </p>
          </div>
        </div>

        {/* Search */}
        {history.length > 0 && (
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tema ou plataforma..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </div>

      {/* Empty State */}
      {history.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum post gerado ainda</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Comece gerando seu primeiro post social para este cliente.
            </p>
            <Link href={`/${clientSlug}/posts`}>
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                Gerar Primeiro Post
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {history.length > 0 && filteredHistory.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-center">
              Tente buscar por outro termo ou plataforma.
            </p>
          </CardContent>
        </Card>
      )}

      {/* History Grid */}
      {filteredHistory.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredHistory.map((item) => {
            const platform = item.platform || getPlatformFromTitle(item.title)
            return (
              <Card
                key={item.id}
                className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/30"
                onClick={() => openEditor(item)}
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {platformIcons[platform] || <MessageCircle className="h-4 w-4" />}
                      </div>
                      <Badge variant="secondary" className="text-xs font-medium">
                        {platformLabels[platform] || platform}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditor(item) }}>
                          <FileText className="h-4 w-4 mr-2" />
                          Visualizar / Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopy(item) }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Texto
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(item) }}>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar .txt
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Topic */}
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                    {getTopicFromTitle(item.title)}
                  </h3>

                  {/* Preview */}
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {getPreview(item.content)}
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
                        {getCharCount(item.content)} chars
                      </span>
                      {/* Summary indicator for blog posts */}
                      {platform === "blog" && item.summary && (
                        <span className="flex items-center gap-1 text-primary">
                          <AlignLeft className="h-3.5 w-3.5" />
                          Resumo
                        </span>
                      )}
                      {/* Cover image indicator for blog posts */}
                      {platform === "blog" && item.cover_image_url && (
                        <span className="flex items-center gap-1 text-indigo-500">
                          <ImageIcon className="h-3.5 w-3.5" />
                          Capa
                        </span>
                      )}
                    </div>
                    {copiedId === item.id && (
                      <span className="text-primary flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Copiado
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">
                      {getTopicFromTitle(selectedItem.title)}
                    </h2>
                    <Badge variant="secondary" className="gap-1.5">
                      {platformIcons[selectedItem.platform || getPlatformFromTitle(selectedItem.title)]}
                      {platformLabels[selectedItem.platform || getPlatformFromTitle(selectedItem.title)] || selectedItem.platform}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(selectedItem.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(selectedItem.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {getCharCount(editableContent)} caracteres
                    </span>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadEditable}
                  className="gap-2 bg-transparent"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Baixar</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Editor Area */}
          <div className="h-[calc(100vh-80px)] overflow-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {/* HTML Editor */}
              <HtmlEditor 
                value={editableContent}
                onChange={setEditableContent}
              />

              {/* Blog Summary Section - Only for blog posts */}
              {(selectedItem.platform === "blog" || getPlatformFromTitle(selectedItem.title) === "blog") && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlignLeft className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">Resumo para &quot;Leia Mais&quot;</h3>
                    </div>
                    {blogSummary && selectedItem.summary && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Check className="h-3 w-3" />
                        Salvo
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {blogSummary 
                      ? "Resumo salvo automaticamente. Voce pode regenerar ou copiar." 
                      : "Gere um resumo curto do artigo para usar em listagens e previews"}
                  </p>
                  
                  {blogSummary ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-background border text-sm leading-relaxed">
                        {blogSummary}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {blogSummary.length} caracteres
                        </span>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleCopySummary}
                            className="gap-1.5 bg-transparent"
                          >
                            {copiedSummary ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedSummary ? "Copiado" : "Copiar"}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleGenerateSummary}
                            disabled={isGeneratingSummary}
                            className="gap-1.5 bg-transparent"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingSummary ? "animate-spin" : ""}`} />
                            Regenerar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary}
                      variant="secondary"
                      className="w-full gap-2"
                    >
                      {isGeneratingSummary ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando resumo...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Gerar Resumo do Artigo
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Blog Cover Image Section - Only for blog posts */}
              {(selectedItem.platform === "blog" || getPlatformFromTitle(selectedItem.title) === "blog") && (
                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-indigo-500" />
                      <h3 className="font-medium">Imagem de Capa do Blog</h3>
                    </div>
                    {coverImageUrl && selectedItem.cover_image_url && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Check className="h-3 w-3" />
                        Salva
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {coverImageUrl 
                      ? "Imagem salva automaticamente. Voce pode regenerar ou baixar." 
                      : "Gere uma imagem de capa baseada no conteudo do artigo"}
                  </p>
                  
                  {coverImageUrl ? (
                    <div className="space-y-3">
                      <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                        <Image
                          src={coverImageUrl}
                          alt="Imagem de capa do blog"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.open(coverImageUrl, "_blank")}
                          className="gap-1.5 bg-transparent"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Baixar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleGenerateCoverImage}
                          disabled={isGeneratingCoverImage}
                          className="gap-1.5 bg-transparent"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingCoverImage ? "animate-spin" : ""}`} />
                          Regenerar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleGenerateCoverImage}
                      disabled={isGeneratingCoverImage}
                      variant="secondary"
                      className="w-full gap-2"
                    >
                      {isGeneratingCoverImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando imagem de capa...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4" />
                          Gerar Imagem de Capa
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
              
              {/* Tips */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Dicas de Uso
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Use o modo Visual para editar o texto e o modo HTML para ajustes finos</li>
                  <li>Use o botao Copiar para copiar o texto e colar na rede social</li>
                  <li>O arquivo .txt pode ser usado como backup ou para compartilhar</li>
                  <li>Adapte as hashtags conforme a rede social utilizada</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
