"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface LeadFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function LeadFormDialog({ open, onOpenChange, onSuccess }: LeadFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    site: "",
    segmento: "",
    endereco_cidade: "",
    endereco_estado: "",
  })

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14)
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 12)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }

  const handleChange = (field: string, value: string) => {
    if (field === "cnpj") {
      value = formatCNPJ(value)
    }
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateCNPJ = (cnpj: string): boolean => {
    const cleaned = cnpj.replace(/\D/g, "")
    return cleaned.length === 14
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateCNPJ(formData.cnpj)) {
      toast.error("CNPJ inválido. Deve conter 14 dígitos.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          cnpj: formData.cnpj.replace(/\D/g, ""),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erro ao criar lead")
      }

      toast.success("Lead criado com sucesso!")
      onSuccess()
      handleClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar lead")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      cnpj: "",
      razao_social: "",
      nome_fantasia: "",
      site: "",
      segmento: "",
      endereco_cidade: "",
      endereco_estado: "",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Adicione um novo lead manualmente. Apenas o CNPJ é obrigatório.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cnpj">
              CNPJ <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cnpj"
              placeholder="00.000.000/0000-00"
              value={formData.cnpj}
              onChange={(e) => handleChange("cnpj", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razao_social">Razão Social</Label>
              <Input
                id="razao_social"
                placeholder="Empresa Ltda"
                value={formData.razao_social}
                onChange={(e) => handleChange("razao_social", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
              <Input
                id="nome_fantasia"
                placeholder="Nome da Marca"
                value={formData.nome_fantasia}
                onChange={(e) => handleChange("nome_fantasia", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Input
                id="site"
                type="url"
                placeholder="https://exemplo.com.br"
                value={formData.site}
                onChange={(e) => handleChange("site", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segmento">Segmento</Label>
              <Input
                id="segmento"
                placeholder="E-commerce, Indústria..."
                value={formData.segmento}
                onChange={(e) => handleChange("segmento", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endereco_cidade">Cidade</Label>
              <Input
                id="endereco_cidade"
                placeholder="São Paulo"
                value={formData.endereco_cidade}
                onChange={(e) => handleChange("endereco_cidade", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco_estado">Estado</Label>
              <Input
                id="endereco_estado"
                placeholder="SP"
                maxLength={2}
                value={formData.endereco_estado}
                onChange={(e) => handleChange("endereco_estado", e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
