"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Save, Loader2, Bot, Code, AlertCircle, Copy, Check } from "lucide-react"
import type { AgentPrompt } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface PlaceholderVariable {
  key: string
  label: string
  description?: string
  category: "client" | "form" | "other"
}

interface AgentEditorProps {
  prompt: AgentPrompt
  onSave: (content: string) => Promise<void>
  title?: string
  variables?: PlaceholderVariable[]
}

export function AgentEditor({ prompt, onSave, title = "Editor do Agente", variables = [] }: AgentEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [content, setContent] = useState(prompt.content_md)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [copiedVar, setCopiedVar] = useState<string | null>(null)

  const handleCopyVariable = async (key: string) => {
    const placeholder = `{{${key}}}`
    await navigator.clipboard.writeText(placeholder)
    setCopiedVar(key)
    setTimeout(() => setCopiedVar(null), 1500)
  }

  // Group variables by category
  const clientVars = variables.filter(v => v.category === "client")
  const formVars = variables.filter(v => v.category === "form")
  const otherVars = variables.filter(v => v.category === "other")

  const handleContentChange = (value: string) => {
    setContent(value)
    setHasChanges(value !== prompt.content_md)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(content)
      setHasChanges(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-all duration-300",
        isExpanded ? "border-primary/30 bg-card shadow-lg" : "border-dashed border-border/50 bg-secondary/20",
      )}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-secondary/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
              isExpanded ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{title}</span>
              {hasChanges && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                  <AlertCircle className="h-3 w-3" />
                  Não salvo
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">Versão {prompt.version} • Apenas administradores</span>
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50 transition-transform">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      <div
        className={cn(
          "grid transition-all duration-300",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
          <div className="overflow-hidden">
            <div className="space-y-4 border-t border-border/50 p-5">
              {variables.length > 0 ? (
                <div className="space-y-3 rounded-lg bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Code className="h-4 w-4 shrink-0 text-primary" />
                    <span>Variaveis Dinamicas Disponiveis</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clique em uma variavel para copiar. Use no formato {"{{variavel}}"} no prompt.
                  </p>
                  
                  {clientVars.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contexto do Cliente</span>
                      <div className="flex flex-wrap gap-1.5">
                        {clientVars.map((v) => (
                          <Badge 
                            key={v.key} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors font-mono text-xs gap-1"
                            onClick={() => handleCopyVariable(v.key)}
                            title={v.description || v.label}
                          >
                            {copiedVar === v.key ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            {`{{${v.key}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {formVars.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campos do Formulario</span>
                      <div className="flex flex-wrap gap-1.5">
                        {formVars.map((v) => (
                          <Badge 
                            key={v.key} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors font-mono text-xs gap-1"
                            onClick={() => handleCopyVariable(v.key)}
                            title={v.description || v.label}
                          >
                            {copiedVar === v.key ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            {`{{${v.key}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {otherVars.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outros</span>
                      <div className="flex flex-wrap gap-1.5">
                        {otherVars.map((v) => (
                          <Badge 
                            key={v.key} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors font-mono text-xs gap-1"
                            onClick={() => handleCopyVariable(v.key)}
                            title={v.description || v.label}
                          >
                            {copiedVar === v.key ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            {`{{${v.key}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                  <Code className="h-4 w-4 shrink-0" />
                  <span>Use Markdown para formatar o prompt.</span>
                </div>
              )}

              <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="min-h-[300px] resize-none rounded-xl border-border/50 bg-secondary/30 font-mono text-sm transition-all focus:border-primary focus:bg-background"
              placeholder="# Prompt do Agente..."
            />

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl bg-transparent"
                onClick={() => {
                  setContent(prompt.content_md)
                  setHasChanges(false)
                }}
                disabled={!hasChanges}
              >
                Descartar
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges || isSaving} size="sm" className="rounded-xl">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Prompt
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
