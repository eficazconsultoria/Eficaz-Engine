"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AgentEditor } from "@/components/dashboard/agent-editor"
import type { Profile, AgentPrompt, GenerationLog } from "@/lib/types"
import { generateProductImages, saveAgentPrompt } from "./actions"
import {
  Upload,
  ImageIcon,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Download,
  Loader2,
  Package,
  Palette,
  Settings2,
  Clock,
  History,
  Layers,
  Plus,
} from "lucide-react"

interface ProductImagesFormProps {
  profile: Profile
  agent: AgentPrompt | null
  history: GenerationLog[]
}

const STYLES = [
  { value: "professional", label: "Profissional", emoji: "📸", description: "Fundo limpo, iluminação de estúdio" },
  { value: "lifestyle", label: "Lifestyle", emoji: "🌟", description: "Produto em uso, contexto real" },
  { value: "minimalist", label: "Minimalista", emoji: "⬜", description: "Clean, sem distrações" },
  { value: "dramatic", label: "Dramático", emoji: "🎭", description: "Contraste alto, sombras fortes" },
  { value: "natural", label: "Natural", emoji: "🌿", description: "Luz natural, orgânico" },
  { value: "luxury", label: "Luxo", emoji: "💎", description: "Sofisticado, premium" },
]

const BACKGROUNDS = [
  { value: "white", label: "Branco", preview: "bg-white" },
  { value: "gradient", label: "Gradiente", preview: "bg-gradient-to-br from-gray-100 to-gray-300" },
  { value: "studio", label: "Estúdio", preview: "bg-gradient-to-b from-gray-200 to-gray-400" },
  { value: "contextual", label: "Contextual", preview: "bg-gradient-to-br from-amber-100 to-orange-200" },
  { value: "dark", label: "Escuro", preview: "bg-gray-900" },
  {
    value: "transparent",
    label: "Transparente",
    preview:
      "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlN2ViIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlNWU3ZWIiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]",
  },
]

const QUANTITIES = [
  { value: 1, label: "1", description: "Teste rápido" },
  { value: 3, label: "3", description: "Recomendado" },
  { value: 5, label: "5", description: "Mais opções" },
  { value: 10, label: "10", description: "Máximo" },
]

interface GeneratedImage {
  url: string
  base64?: string
  mediaType?: string
}

export function ProductImagesForm({ profile, agent, history }: ProductImagesFormProps) {
  const [step, setStep] = useState(1)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Form data
  const [productName, setProductName] = useState("")
  const [description, setDescription] = useState("")
  const [style, setStyle] = useState("professional")
  const [background, setBackground] = useState("white")
  const [quantity, setQuantity] = useState(3)
  const [productImage, setProductImage] = useState<File | null>(null)
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null)
  const [referenceImages, setReferenceImages] = useState<File[]>([])
  const [referenceImagePreviews, setReferenceImagePreviews] = useState<string[]>([])
  const [additionalInfo, setAdditionalInfo] = useState("")

  const productInputRef = useRef<HTMLInputElement>(null)
  const referenceInputRef = useRef<HTMLInputElement>(null)

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProductImage(file)
      const reader = new FileReader()
      reader.onload = (e) => setProductImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleReferenceImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setReferenceImages((prev) => [...prev, ...files])
      files.forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          setReferenceImagePreviews((prev) => [...prev, e.target?.result as string])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeReferenceImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index))
    setReferenceImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setIsGenerating(true)
    setError(null)

    const formData = new FormData()
    formData.append("productName", productName)
    formData.append("description", description)
    formData.append("style", style)
    formData.append("background", background)
    formData.append("quantity", quantity.toString())
    formData.append("additionalInfo", additionalInfo)
    if (productImage) formData.append("productImage", productImage)
    referenceImages.forEach((img, i) => formData.append(`reference_${i}`, img))

    const result = await generateProductImages(formData)

    if (result.success && result.images) {
      // Handle both old string[] format and new object format
      const formattedImages = result.images.map((img: string | GeneratedImage) => 
        typeof img === 'string' ? { url: img } : img
      )
      setImages(formattedImages)
      setStep(4)
    } else {
      setError(result.error || "Erro ao gerar imagens")
    }

    setIsGenerating(false)
  }

  // Download a single image
  const downloadImage = (image: GeneratedImage, index: number) => {
    if (image.base64 && image.mediaType) {
      // Create blob from base64
      const byteCharacters = atob(image.base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: image.mediaType })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const extension = image.mediaType.split('/')[1] || 'png'
      link.download = `${productName.replace(/\s+/g, '-')}-variacao-${index + 1}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      // Fallback for URL-only images
      window.open(image.url, '_blank')
    }
  }

  // Download all images as individual files
  const downloadAllImages = () => {
    images.forEach((image, index) => {
      setTimeout(() => downloadImage(image, index), index * 500) // Stagger downloads
    })
  }

  const resetForm = () => {
    setStep(1)
    setProductName("")
    setDescription("")
    setStyle("professional")
    setBackground("white")
    setQuantity(3)
    setProductImage(null)
    setProductImagePreview(null)
    setReferenceImages([])
    setReferenceImagePreviews([])
    setAdditionalInfo("")
    setImages([])
    setError(null)
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return productName.trim() !== "" && description.trim() !== ""
      case 2:
        return true
      case 3:
        return true
      default:
        return false
    }
  }

  const steps = [
    { number: 1, title: "Produto", icon: Package },
    { number: 2, title: "Estilo", icon: Palette },
    { number: 3, title: "Finalizar", icon: Settings2 },
    { number: 4, title: "Resultado", icon: ImageIcon },
  ]

  return (
    <div className="space-y-6">
      {profile.role === "admin" && agent && <AgentEditor prompt={agent} onSave={saveAgentPrompt} />}

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          {steps.map((s, index) => {
            const Icon = s.icon
            return (
              <div key={s.number} className="flex items-center">
                <button
                  onClick={() => s.number < step && s.number < 4 && setStep(s.number)}
                  disabled={s.number > step || s.number === 4}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${
                      step === s.number
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : step > s.number
                          ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                          : "bg-secondary text-muted-foreground"
                    }
                  `}
                >
                  {step > s.number ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
                {index < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
              </div>
            )
          })}
        </div>

        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="rounded-full">
          <History className="h-4 w-4 mr-2" />
          Histórico
        </Button>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Gerações Anteriores
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {history.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {history.map((log, index) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-border/50 bg-secondary/20 p-4 transition-all hover:bg-secondary/40 cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium text-sm">
                        {(log.input_json as { productName?: string })?.productName || "Sem nome"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {((log.output_json as { images?: string[] })?.images || []).slice(0, 3).map((url, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                        <img
                          src={url || "/placeholder.svg"}
                          alt={`History ${i}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Nenhuma geração anterior encontrada.</div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="rounded-2xl border border-border/50 bg-card/50 p-6 md:p-8 backdrop-blur-sm">
        {/* Step 1: Product Info */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Informações do Produto</h2>
              <p className="text-muted-foreground mt-2">Descreva o produto que deseja gerar variações</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Product Image Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Imagem do Produto (opcional)</Label>
                <div
                  onClick={() => productInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
                    transition-all hover:border-primary/50 hover:bg-primary/5
                    ${productImagePreview ? "border-primary bg-primary/5" : "border-border"}
                  `}
                >
                  <input
                    ref={productInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProductImageUpload}
                    className="hidden"
                  />
                  {productImagePreview ? (
                    <div className="relative">
                      <img
                        src={productImagePreview || "/placeholder.svg"}
                        alt="Product"
                        className="max-h-48 mx-auto rounded-xl object-contain"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setProductImage(null)
                          setProductImagePreview(null)
                        }}
                        className="absolute -top-2 -right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-secondary flex items-center justify-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">Arraste uma imagem ou clique para selecionar</p>
                      <p className="text-xs text-muted-foreground">A IA usará como referência para gerar variações</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="productName" className="text-sm font-medium">
                  Nome do Produto <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ex: Tênis Nike Air Max 90"
                  className="h-12 text-lg rounded-xl border-border/50 bg-secondary/30"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Descrição Detalhada <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o produto em detalhes: cor, material, características principais, tamanho..."
                  rows={4}
                  className="resize-none rounded-xl border-border/50 bg-secondary/30"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Style Selection */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Palette className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Estilo Visual</h2>
              <p className="text-muted-foreground mt-2">Escolha o estilo e fundo das variações</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              {/* Style Selection */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Estilo da Foto</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STYLES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStyle(s.value)}
                      className={`
                        p-4 rounded-xl border-2 text-left transition-all
                        ${
                          style === s.value
                            ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-secondary/50"
                        }
                      `}
                    >
                      <span className="text-2xl mb-2 block">{s.emoji}</span>
                      <p className="font-medium text-sm">{s.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Selection */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Tipo de Fundo</Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.value}
                      onClick={() => setBackground(bg.value)}
                      className={`
                        p-3 rounded-xl border-2 text-center transition-all
                        ${
                          background === bg.value
                            ? "border-primary shadow-lg shadow-primary/10"
                            : "border-border hover:border-primary/50"
                        }
                      `}
                    >
                      <div className={`w-full aspect-square rounded-lg mb-2 ${bg.preview}`} />
                      <p className="text-xs font-medium">{bg.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selection */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Quantidade de Variações</Label>
                <div className="grid grid-cols-4 gap-3">
                  {QUANTITIES.map((q) => (
                    <button
                      key={q.value}
                      onClick={() => setQuantity(q.value)}
                      className={`
                        p-4 rounded-xl border-2 text-center transition-all
                        ${
                          quantity === q.value
                            ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-secondary/50"
                        }
                      `}
                    >
                      <p className="text-2xl font-bold">{q.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{q.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: References & Finalize */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Settings2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Finalizar</h2>
              <p className="text-muted-foreground mt-2">Adicione referências e revise suas escolhas</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-6">
              {/* Reference Images */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Imagens de Referência (opcional)</Label>
                <div
                  onClick={() => referenceInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <input
                    ref={referenceInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleReferenceImagesUpload}
                    className="hidden"
                  />
                  <Plus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para adicionar imagens de referência</p>
                </div>
                {referenceImagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {referenceImagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                        <img
                          src={preview || "/placeholder.svg"}
                          alt={`Reference ${index}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeReferenceImage(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="space-y-2">
                <Label htmlFor="additionalInfo" className="text-sm font-medium">
                  Informações Adicionais (opcional)
                </Label>
                <Textarea
                  id="additionalInfo"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Detalhes extras, preferências de ângulo, elementos específicos que deseja incluir ou evitar..."
                  rows={3}
                  className="resize-none rounded-xl border-border/50 bg-secondary/30"
                />
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-border bg-secondary/20 p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Resumo da Geração
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Produto</p>
                    <p className="font-medium">{productName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estilo</p>
                    <p className="font-medium">{STYLES.find((s) => s.value === style)?.label}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fundo</p>
                    <p className="font-medium">{BACKGROUNDS.find((b) => b.value === background)?.label}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Variações</p>
                    <p className="font-medium">{quantity} imagens</p>
                  </div>
                </div>
                {productImagePreview && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Imagem do produto</p>
                    <img
                      src={productImagePreview || "/placeholder.svg"}
                      alt="Product"
                      className="h-20 rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">Variações Geradas!</h2>
              <p className="text-muted-foreground mt-2">
                {images.length} {images.length === 1 ? "variação criada" : "variações criadas"} para {productName}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {images.map((image, index) => (
                <div
                  key={index}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-border bg-secondary/20 animate-in fade-in zoom-in-95"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <img
                    src={image.url || "/placeholder.svg"}
                    alt={`Variation ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="rounded-full"
                      onClick={() => downloadImage(image, index)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Baixar
                    </Button>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white">
                    {index + 1}/{images.length}
                  </div>
                  {image.base64 && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/80 backdrop-blur-sm rounded-full text-xs text-white">
                      HD
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-3 mt-8">
              <Button onClick={resetForm} variant="outline" className="rounded-full px-6 bg-transparent">
                <Plus className="h-4 w-4 mr-2" />
                Nova Geração
              </Button>
              <Button 
                onClick={downloadAllImages}
                className="rounded-full px-6 bg-primary hover:bg-primary/90"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Todas
              </Button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in">
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="rounded-full px-6"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="rounded-full px-6 bg-primary hover:bg-primary/90"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isGenerating}
                className="rounded-full px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Variações
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
