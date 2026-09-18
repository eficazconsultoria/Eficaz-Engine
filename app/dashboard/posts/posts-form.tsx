"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Users,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Download,
  RefreshCw,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  BookOpen,
  Target,
  MessageSquare,
  Lightbulb,
  Upload,
  X,
  FileIcon,
  Hash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AgentEditor } from "@/components/dashboard/agent-editor"
import type { Profile, AgentPrompt, GenerationLog } from "@/lib/types"
import { generatePostText, saveAgentPrompt } from "./actions"
import { cn } from "@/lib/utils"

interface PostsFormProps {
  profile: Profile
  agent: AgentPrompt | null
  history: GenerationLog[]
}

const steps = [
  { id: 1, title: "Plataforma", icon: FileText },
  { id: 2, title: "Público", icon: Users },
  { id: 3, title: "Conteúdo", icon: MessageSquare },
  { id: 4, title: "Resultado", icon: Sparkles },
]

const contentTypes = [
  {
    id: "blog",
    label: "Blog Post",
    icon: BookOpen,
    description: "Artigo completo com título, subtítulos e CTA",
    color: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    description: "Legenda engajante com emojis e hashtags",
    color: "from-pink-500/20 to-purple-600/20 border-pink-500/30",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    description: "Texto profissional e inspirador",
    color: "from-blue-600/20 to-blue-700/20 border-blue-600/30",
  },
  {
    id: "twitter",
    label: "Twitter/X",
    icon: Twitter,
    description: "Thread ou post curto e impactante",
    color: "from-sky-500/20 to-sky-600/20 border-sky-500/30",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    description: "Post para engajamento e compartilhamento",
    color: "from-blue-500/20 to-indigo-600/20 border-blue-500/30",
  },
]

const tones = [
  { id: "professional", label: "Profissional", emoji: "💼" },
  { id: "casual", label: "Casual", emoji: "😊" },
  { id: "friendly", label: "Amigável", emoji: "🤝" },
  { id: "authoritative", label: "Autoritativo", emoji: "📚" },
  { id: "inspirational", label: "Inspiracional", emoji: "✨" },
  { id: "humorous", label: "Bem-humorado", emoji: "😄" },
]

const objectives = [
  { id: "educate", label: "Educar", icon: Lightbulb, description: "Ensinar algo novo ao público" },
  { id: "convert", label: "Converter", icon: Target, description: "Gerar leads ou vendas" },
  { id: "authority", label: "Autoridade", icon: BookOpen, description: "Posicionar como especialista" },
  { id: "engage", label: "Engajar", icon: MessageSquare, description: "Gerar interação e comentários" },
]

export function PostsForm({ profile, agent }: PostsFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [contentType, setContentType] = useState("")
  const [topic, setTopic] = useState("")
  const [persona, setPersona] = useState("")
  const [tone, setTone] = useState("")
  const [objective, setObjective] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState("")
  const [references, setReferences] = useState<File[]>([])

  const [generatedText, setGeneratedText] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const canProceedStep1 = contentType !== ""
  const canProceedStep2 = persona !== "" && tone !== "" && objective !== ""
  const canProceedStep3 = topic !== ""

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setCurrentStep(4)

    const formData = new FormData()
    formData.append("type", contentType)
    formData.append("topic", topic)
    formData.append("tone", tone)
    formData.append("persona", persona)
    formData.append("objective", objective)
    formData.append("additionalInfo", additionalInfo)
    formData.append("hashtags", hashtags.join(", "))

    const result = await generatePostText(formData)
    if (result.success && result.text) {
      setGeneratedText(result.text)
    } else {
      setError(result.error || "Erro ao gerar texto")
    }
    setIsGenerating(false)
  }

  const handleSaveAgent = async (content: string) => {
    const result = await saveAgentPrompt(content)
    if (!result.success) throw new Error(result.error)
  }

  const handleCopy = async () => {
    if (generatedText) {
      await navigator.clipboard.writeText(generatedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (generatedText) {
      const blob = new Blob([generatedText], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `post-${contentType}-${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleNewGeneration = () => {
    setCurrentStep(1)
    setGeneratedText(null)
    setContentType("")
    setTopic("")
    setPersona("")
    setTone("")
    setObjective("")
    setAdditionalInfo("")
    setHashtags([])
  }

  const handleAddHashtag = () => {
    if (hashtagInput.trim() && !hashtags.includes(hashtagInput.trim())) {
      const tag = hashtagInput.trim().startsWith("#") ? hashtagInput.trim() : `#${hashtagInput.trim()}`
      setHashtags([...hashtags, tag])
      setHashtagInput("")
    }
  }

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter((h) => h !== tag))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const validFiles = Array.from(files).filter((f) => f.type === "application/pdf" || f.type === "text/plain")
      setReferences((prev) => [...prev, ...validFiles])
    }
  }

  const selectedType = contentTypes.find((t) => t.id === contentType)

  return (
    <div className="space-y-6">
      {profile.role === "admin" && agent && <AgentEditor prompt={agent} onSave={handleSaveAgent} />}

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <div key={step.id} className="flex items-center">
              <motion.button
                onClick={() => {
                  if (
                    step.id < currentStep ||
                    (step.id === 2 && canProceedStep1) ||
                    (step.id === 3 && canProceedStep2) ||
                    step.id === 1
                  ) {
                    setCurrentStep(step.id)
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
                  isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                  isCompleted && "bg-primary/20 text-primary",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground",
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </motion.button>
              {index < steps.length - 1 && (
                <div className={cn("w-8 h-0.5 mx-1", currentStep > step.id ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Platform Selection */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Escolha a Plataforma</h2>
              <p className="text-muted-foreground">Onde você vai publicar esse conteúdo?</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contentTypes.map((type) => {
                const Icon = type.icon
                const isSelected = contentType === type.id

                return (
                  <motion.button
                    key={type.id}
                    onClick={() => setContentType(type.id)}
                    className={cn(
                      "relative p-6 rounded-xl border-2 text-left transition-all duration-300",
                      "bg-gradient-to-br",
                      isSelected ? type.color : "border-border hover:border-primary/50",
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", "bg-background/50")}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{type.label}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>

                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </motion.div>
                    )}
                  </motion.button>
                )
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext} disabled={!canProceedStep1} size="lg" className="gap-2">
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Audience */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Defina o Público</h2>
              <p className="text-muted-foreground">Para quem você está escrevendo?</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-8">
              {/* Persona */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Persona do Público
                </Label>
                <Input
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  placeholder="Ex: Empreendedores iniciantes, 25-40 anos, buscando crescer no digital"
                  className="h-12 text-base"
                />
                <div className="flex flex-wrap gap-2">
                  {["Empreendedores", "Profissionais de marketing", "Gestores", "Estudantes", "MEIs"].map(
                    (suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => setPersona(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ),
                  )}
                </div>
              </div>

              {/* Tone */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Tom de Voz</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {tones.map((t) => (
                    <motion.button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-center transition-all",
                        tone === t.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-2xl mb-2 block">{t.emoji}</span>
                      <span className="text-sm font-medium">{t.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Objective */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Objetivo do Post</Label>
                <div className="grid grid-cols-2 gap-3">
                  {objectives.map((obj) => {
                    const Icon = obj.icon
                    return (
                      <motion.button
                        key={obj.id}
                        onClick={() => setObjective(obj.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3",
                          objective === obj.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50",
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium block">{obj.label}</span>
                          <span className="text-xs text-muted-foreground">{obj.description}</span>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} size="lg" className="gap-2 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={handleNext} disabled={!canProceedStep2} size="lg" className="gap-2">
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Content */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Sobre o Conteúdo</h2>
              <p className="text-muted-foreground">O que você quer comunicar?</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Topic */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Tema / Assunto Principal
                </Label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Descreva o tema principal do seu post. Quanto mais detalhes, melhor o resultado!"
                  className="min-h-[100px] text-base resize-none"
                />
              </div>

              {/* Hashtags (for social media) */}
              {contentType !== "blog" && (
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    Hashtags (opcional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      placeholder="Digite uma hashtag"
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddHashtag())}
                    />
                    <Button type="button" variant="secondary" onClick={handleAddHashtag}>
                      Adicionar
                    </Button>
                  </div>
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                          {tag}
                          <button
                            onClick={() => handleRemoveHashtag(tag)}
                            className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* References */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Referências (opcional)
                </Label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="reference-upload"
                  />
                  <label htmlFor="reference-upload" className="cursor-pointer">
                    <FileIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Arraste arquivos PDF ou TXT aqui ou <span className="text-primary">clique para selecionar</span>
                    </p>
                  </label>
                </div>
                {references.length > 0 && (
                  <div className="space-y-2">
                    {references.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-4 w-4 text-primary" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReferences(references.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Informações Adicionais (opcional)</Label>
                <Textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Pontos específicos a abordar, links de referência, palavras-chave importantes..."
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Resumo do Post
                </h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plataforma:</span>
                    <span className="font-medium">{selectedType?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tom:</span>
                    <span className="font-medium">{tones.find((t) => t.id === tone)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Objetivo:</span>
                    <span className="font-medium">{objectives.find((o) => o.id === objective)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Público:</span>
                    <span className="font-medium truncate max-w-[200px]">{persona}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} size="lg" className="gap-2 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!canProceedStep3}
                size="lg"
                className="gap-2 bg-gradient-to-r from-primary to-primary/80"
              >
                <Sparkles className="h-4 w-4" />
                Gerar Texto
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Result */}
        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">
                {isGenerating ? "Gerando..." : error ? "Erro" : "Texto Pronto!"}
              </h2>
              <p className="text-muted-foreground">
                {isGenerating
                  ? "Nossa IA está criando seu texto..."
                  : error
                    ? "Algo deu errado"
                    : "Seu texto foi gerado com sucesso"}
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="mt-6 text-muted-foreground animate-pulse">
                    Criando seu texto para {selectedType?.label}...
                  </p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <X className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-destructive mb-4">{error}</p>
                  <Button onClick={() => setCurrentStep(3)} variant="outline">
                    Tentar Novamente
                  </Button>
                </div>
              ) : generatedText ? (
                <div className="space-y-4">
                  {/* Platform Badge */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {selectedType && (
                      <Badge variant="secondary" className="gap-2 px-4 py-2">
                        <selectedType.icon className="h-4 w-4" />
                        {selectedType.label}
                      </Badge>
                    )}
                    <Badge variant="outline" className="px-4 py-2">
                      {generatedText.split(/\s+/).length} palavras
                    </Badge>
                  </div>

                  {/* Generated Text */}
                  <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="whitespace-pre-wrap text-base leading-relaxed">{generatedText}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap justify-center gap-3 pt-4">
                    <Button onClick={handleCopy} variant="outline" size="lg" className="gap-2 bg-transparent">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copiado!" : "Copiar Texto"}
                    </Button>
                    <Button onClick={handleDownload} variant="outline" size="lg" className="gap-2 bg-transparent">
                      <Download className="h-4 w-4" />
                      Baixar TXT
                    </Button>
                    <Button onClick={handleNewGeneration} size="lg" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Criar Novo
                    </Button>
                  </div>

                  {/* Tips */}
                  <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Dicas de Uso
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Revise e personalize o texto antes de publicar</li>
                      <li>• Adicione suas próprias experiências e exemplos</li>
                      {contentType !== "blog" && <li>• Ajuste as hashtags conforme seu nicho</li>}
                      <li>• Inclua um CTA claro se o objetivo for conversão</li>
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
