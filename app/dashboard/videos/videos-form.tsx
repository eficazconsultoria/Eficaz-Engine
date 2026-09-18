"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AgentEditor } from "@/components/dashboard/agent-editor"
import type { Profile, AgentPrompt, GenerationLog } from "@/lib/types"
import { generateVideos, saveAgentPrompt } from "./actions"
import {
  Video,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Loader2,
  Upload,
  X,
  FileText,
  ImageIcon,
  Clock,
  Smartphone,
  Monitor,
  Square,
  Play,
  Download,
  Copy,
  RotateCcw,
  Wand2,
  Film,
  Clapperboard,
  Music,
  Zap,
  Palette,
} from "lucide-react"

interface VideosFormProps {
  profile: Profile
  agent: AgentPrompt | null
  history?: GenerationLog[]
}

const DURATIONS = [
  { value: "6s", label: "6 segundos", icon: Zap, description: "Ideal para Stories e Reels rápidos" },
  { value: "15s", label: "15 segundos", icon: Play, description: "Perfeito para anúncios e teasers" },
  { value: "30s", label: "30 segundos", icon: Film, description: "Bom para explicações curtas" },
  { value: "60s", label: "60 segundos", icon: Clapperboard, description: "Ideal para conteúdo detalhado" },
]

const FORMATS = [
  {
    value: "vertical",
    label: "Vertical",
    ratio: "9:16",
    icon: Smartphone,
    description: "Stories, Reels, TikTok",
    preview: "h-24 w-14",
  },
  {
    value: "square",
    label: "Quadrado",
    ratio: "1:1",
    icon: Square,
    description: "Feed Instagram, Facebook",
    preview: "h-20 w-20",
  },
  {
    value: "horizontal",
    label: "Horizontal",
    ratio: "16:9",
    icon: Monitor,
    description: "YouTube, Sites, TV",
    preview: "h-14 w-24",
  },
]

const STYLES = [
  { value: "modern", label: "Moderno", emoji: "✨", description: "Clean e contemporâneo" },
  { value: "minimal", label: "Minimalista", emoji: "◻️", description: "Simples e elegante" },
  { value: "dynamic", label: "Dinâmico", emoji: "⚡", description: "Movimento e energia" },
  { value: "cinematic", label: "Cinematográfico", emoji: "🎬", description: "Épico e dramático" },
  { value: "playful", label: "Divertido", emoji: "🎉", description: "Colorido e animado" },
  { value: "corporate", label: "Corporativo", emoji: "💼", description: "Profissional e sério" },
]

export function VideosForm({ profile, agent, history }: VideosFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [duration, setDuration] = useState("15s")
  const [format, setFormat] = useState("vertical")
  const [style, setStyle] = useState("modern")
  const [briefing, setBriefing] = useState("")
  const [script, setScript] = useState("")
  const [music, setMusic] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])

  // Result state
  const [generatedScript, setGeneratedScript] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const steps = [
    { number: 1, title: "Formato", icon: Monitor },
    { number: 2, title: "Estilo", icon: Palette },
    { number: 3, title: "Conteúdo", icon: FileText },
    { number: 4, title: "Resultado", icon: Video },
  ]

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setReferenceFiles((prev) => [...prev, ...files].slice(0, 5))
  }

  const removeFile = (index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    const formData = new FormData()
    formData.append("briefing", briefing)
    formData.append("duration", duration)
    formData.append("format", format)
    formData.append("style", style)
    formData.append("script", script)
    formData.append("music", music)
    formData.append("additionalInfo", additionalInfo)
    referenceFiles.forEach((file) => formData.append("references", file))

    const result = await generateVideos(formData)

    if (result.success) {
      setGeneratedScript(result.script || null)
      setVideoUrl(result.videoUrl || null)
      setCurrentStep(4)
    } else {
      setError(result.error || "Erro ao gerar vídeo")
    }

    setIsGenerating(false)
  }

  const handleSaveAgent = async (content: string) => {
    const result = await saveAgentPrompt(content)
    if (!result.success) throw new Error(result.error)
  }

  const resetForm = () => {
    setCurrentStep(1)
    setDuration("15s")
    setFormat("vertical")
    setStyle("modern")
    setBriefing("")
    setScript("")
    setMusic("")
    setAdditionalInfo("")
    setReferenceFiles([])
    setGeneratedScript(null)
    setVideoUrl(null)
    setError(null)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return duration && format
      case 2:
        return style
      case 3:
        return briefing.trim().length > 0
      default:
        return true
    }
  }

  const selectedDuration = DURATIONS.find((d) => d.value === duration)
  const selectedFormat = FORMATS.find((f) => f.value === format)
  const selectedStyle = STYLES.find((s) => s.value === style)

  return (
    <div className="space-y-6">
      {profile.role === "admin" && agent && <AgentEditor prompt={agent} onSave={handleSaveAgent} />}

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <button
              onClick={() => step.number < currentStep && setCurrentStep(step.number)}
              disabled={step.number > currentStep}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                currentStep === step.number
                  ? "bg-primary text-primary-foreground shadow-lg scale-105"
                  : step.number < currentStep
                    ? "bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step.number < currentStep ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
              <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
            </button>
            {index < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm min-h-[500px]">
        {/* Step 1: Format Selection */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Formato do Vídeo</h2>
              <p className="text-muted-foreground mt-2">Escolha a duração e orientação do vídeo</p>
            </div>

            {/* Duration */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duração do Vídeo
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      duration === d.value
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <d.icon
                      className={`h-6 w-6 mb-2 ${duration === d.value ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <p className="font-semibold">{d.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Orientação
              </Label>
              <div className="grid grid-cols-3 gap-4">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 flex flex-col items-center text-center ${
                      format === f.value
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`${f.preview} bg-gradient-to-br from-primary/40 to-primary/20 rounded-lg mb-3 flex items-center justify-center`}
                    >
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-semibold">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.ratio}</p>
                    <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Style Selection */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Estilo Visual</h2>
              <p className="text-muted-foreground mt-2">Defina a estética do seu vídeo</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 text-center ${
                    style === s.value
                      ? "border-primary bg-primary/10 shadow-md scale-105"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-4xl block mb-3">{s.emoji}</span>
                  <p className="font-semibold">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                </button>
              ))}
            </div>

            {/* Music preference */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Music className="h-4 w-4" />
                Trilha Sonora (opcional)
              </Label>
              <Input
                value={music}
                onChange={(e) => setMusic(e.target.value)}
                placeholder="Ex: Música alegre e energética, instrumental calmo, etc."
                className="h-12"
              />
            </div>
          </div>
        )}

        {/* Step 3: Content */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Conteúdo do Vídeo</h2>
              <p className="text-muted-foreground mt-2">Descreva o que você quer mostrar</p>
            </div>

            {/* Briefing */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Briefing da Campanha *</Label>
              <Textarea
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                placeholder="Descreva o objetivo do vídeo, produto/serviço, público-alvo, mensagem principal..."
                rows={4}
                className="resize-none text-base"
              />
            </div>

            {/* Script */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Roteiro (opcional)</Label>
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Se você já tem um roteiro definido, cole aqui. Caso contrário, a IA irá criar um."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Reference Upload */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Referências Visuais</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Arraste imagens ou vídeos de referência ou{" "}
                  <span className="text-primary">clique para selecionar</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, MP4 (max. 5 arquivos)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              {referenceFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {referenceFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
                      {file.type.startsWith("image/") ? (
                        <ImageIcon className="h-4 w-4 text-primary" />
                      ) : file.type.startsWith("video/") ? (
                        <Video className="h-4 w-4 text-primary" />
                      ) : (
                        <FileText className="h-4 w-4 text-primary" />
                      )}
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Informações Adicionais</Label>
              <Textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Cores da marca, elementos obrigatórios, restrições, tom de voz..."
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <h4 className="font-medium text-sm">Resumo do Vídeo</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Duração:</span>
                  <p className="font-medium">{selectedDuration?.label}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Formato:</span>
                  <p className="font-medium">
                    {selectedFormat?.label} ({selectedFormat?.ratio})
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estilo:</span>
                  <p className="font-medium">
                    {selectedStyle?.emoji} {selectedStyle?.label}
                  </p>
                </div>
              </div>
            </div>

            {error && <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>}
          </div>
        )}

        {/* Step 4: Result */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Seu Vídeo</h2>
              <p className="text-muted-foreground mt-2">Roteiro e conceito gerados pela IA</p>
            </div>

            {/* Video Preview */}
            <div className="max-w-2xl mx-auto">
              <div
                className={`relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl overflow-hidden flex items-center justify-center ${
                  format === "vertical"
                    ? "aspect-[9/16] max-h-[500px] mx-auto w-auto"
                    : format === "square"
                      ? "aspect-square"
                      : "aspect-video"
                }`}
              >
                {videoUrl ? (
                  <>
                    <img
                      src={videoUrl || "/placeholder.svg"}
                      alt="Video preview"
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                        <Play className="h-12 w-12 text-white fill-white" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <Video className="h-16 w-16 mx-auto text-primary/50 mb-4" />
                    <p className="text-muted-foreground">Preview do vídeo</p>
                  </div>
                )}

                {/* Duration badge */}
                <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {selectedDuration?.label}
                </div>

                {/* Format badge */}
                <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {selectedFormat?.ratio}
                </div>
              </div>
            </div>

            {/* Generated Script */}
            {generatedScript && (
              <div className="bg-muted/50 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Roteiro Gerado
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(generatedScript)}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-background rounded-lg p-4 overflow-auto max-h-[300px]">
                    {generatedScript}
                  </pre>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={resetForm}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Criar Novo
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Baixar Roteiro
              </Button>
              {videoUrl && (
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Vídeo
                </Button>
              )}
            </div>

            {/* Tips */}
            <div className="bg-primary/5 rounded-xl p-4 text-sm">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Dicas de Uso
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Revise o roteiro e ajuste conforme necessário antes de produzir</li>
                <li>• Use as referências visuais para guiar a direção de arte</li>
                <li>• Considere adicionar legendas para maior alcance</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {currentStep < 4 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => prev - 1)}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          {currentStep < 3 ? (
            <Button onClick={() => setCurrentStep((prev) => prev + 1)} disabled={!canProceed()} className="gap-2">
              Continuar
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={!canProceed() || isGenerating} className="gap-2 min-w-[160px]">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Gerar Vídeo
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
