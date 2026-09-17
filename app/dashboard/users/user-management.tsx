"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  AlertCircle,
  Search,
  Users,
  Shield,
  Clock,
  Filter,
  MoreVertical,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  History,
  ChevronRight,
} from "lucide-react"
import type { Profile, AuditLog, UserRole } from "@/lib/types"
import { ROLE_LABELS } from "@/lib/rbac"
import { createNewUser, updateExistingUser, toggleUserStatus, removeUser } from "./actions"
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

interface UserManagementProps {
  users: Profile[]
  auditLogs: AuditLog[]
  currentUserId: string
}

const ALL_ROLES: UserRole[] = [
  "admin",
  "performance",
  "marketing",
  "projetos",
  "sucesso",
  "redacao",
  "comercial",
  "design",
  "seo",
]

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  performance: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  marketing: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  projetos: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  sucesso: "bg-green-500/10 text-green-500 border-green-500/20",
  redacao: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  comercial: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  design: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  seo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
}

const ROLE_AVATAR_COLORS: Record<UserRole, string> = {
  admin: "bg-gradient-to-br from-red-500 to-red-600",
  performance: "bg-gradient-to-br from-blue-500 to-blue-600",
  marketing: "bg-gradient-to-br from-purple-500 to-purple-600",
  projetos: "bg-gradient-to-br from-amber-500 to-amber-600",
  sucesso: "bg-gradient-to-br from-green-500 to-green-600",
  redacao: "bg-gradient-to-br from-pink-500 to-pink-600",
  comercial: "bg-gradient-to-br from-cyan-500 to-cyan-600",
  design: "bg-gradient-to-br from-orange-500 to-orange-600",
  seo: "bg-gradient-to-br from-indigo-500 to-indigo-600",
}

const AUDIT_ACTIONS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  user_created: { label: "Usuario criado", color: "text-green-500", icon: <UserCheck className="h-4 w-4" /> },
  user_updated: { label: "Usuario atualizado", color: "text-blue-500", icon: <Pencil className="h-4 w-4" /> },
  user_deleted: { label: "Usuario removido", color: "text-red-500", icon: <Trash2 className="h-4 w-4" /> },
  user_deactivated: { label: "Usuario desativado", color: "text-amber-500", icon: <UserX className="h-4 w-4" /> },
  user_reactivated: { label: "Usuario reativado", color: "text-green-500", icon: <UserCheck className="h-4 w-4" /> },
}

export function UserManagement({ users: initialUsers, auditLogs, currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState(initialUsers)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users")

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "marketing" as UserRole,
    password: "",
  })

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.active) ||
      (statusFilter === "inactive" && !user.active)
    return matchesSearch && matchesRole && matchesStatus
  })

  const stats = {
    total: users.length,
    active: users.filter((u) => u.active).length,
    inactive: users.filter((u) => !u.active).length,
    admins: users.filter((u) => u.role === "admin").length,
  }

  const resetForm = () => {
    setFormData({ email: "", name: "", role: "marketing", password: "" })
    setError(null)
  }

  const handleCreate = async () => {
    setIsLoading(true)
    setError(null)

    const data = new FormData()
    data.set("email", formData.email)
    data.set("name", formData.name)
    data.set("role", formData.role)
    data.set("password", formData.password)

    const result = await createNewUser(data)

    if (result.success && result.user) {
      setUsers([result.user, ...users])
      setShowCreateDialog(false)
      resetForm()
    } else {
      setError(result.error || "Erro ao criar usuario")
    }

    setIsLoading(false)
  }

  const handleUpdate = async () => {
    if (!editingUser) return

    setIsLoading(true)
    setError(null)

    const data = new FormData()
    data.set("email", formData.email)
    data.set("name", formData.name)
    data.set("role", formData.role)
    if (formData.password) data.set("password", formData.password)

    const result = await updateExistingUser(editingUser.id, data)

    if (result.success) {
      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? { ...u, email: formData.email, name: formData.name, role: formData.role as UserRole }
            : u,
        ),
      )
      setEditingUser(null)
      resetForm()
    } else {
      setError(result.error || "Erro ao atualizar usuario")
    }

    setIsLoading(false)
  }

  const handleToggleStatus = async (user: Profile) => {
    const result = await toggleUserStatus(user.id, !user.active)

    if (result.success) {
      setUsers(users.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u)))
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return

    setIsLoading(true)
    const result = await removeUser(deletingUser.id)

    if (result.success) {
      setUsers(users.filter((u) => u.id !== deletingUser.id))
      setDeletingUser(null)
    } else {
      setError(result.error || "Erro ao remover usuario")
    }

    setIsLoading(false)
  }

  const openEditDialog = (user: Profile) => {
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      password: "",
    })
    setEditingUser(user)
    setError(null)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Usuarios</p>
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
                <p className="text-xs text-muted-foreground">Usuarios Ativos</p>
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
                <p className="text-xs text-muted-foreground">Usuarios Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10">
                <Shield className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.admins}</p>
                <p className="text-xs text-muted-foreground">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-4">
        <Button
          variant={activeTab === "users" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("users")}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Usuarios
          <Badge variant="secondary" className="ml-1">
            {users.length}
          </Badge>
        </Button>
        <Button
          variant={activeTab === "audit" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("audit")}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          Auditoria
          <Badge variant="secondary" className="ml-1">
            {auditLogs.length}
          </Badge>
        </Button>
      </div>

      {activeTab === "users" && (
        <>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/50 border-border/50"
              />
            </div>

            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[160px] bg-card/50 border-border/50">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cargos</SelectItem>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
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
                <span className="hidden sm:inline">Novo Usuario</span>
              </Button>
            </div>
          </div>

          {/* Users Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user, index) => (
              <Card
                key={user.id}
                className="bg-card/50 border-border/50 hover:bg-card/80 transition-all duration-300 group overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className={`h-12 w-12 ${ROLE_AVATAR_COLORS[user.role]} text-white shadow-lg`}>
                        <AvatarFallback className="bg-transparent text-white font-semibold">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate flex items-center gap-2">
                          {user.name}
                          {user.id === currentUserId && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Voce
                            </Badge>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {user.id !== currentUserId && (
                          <>
                            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                              {user.active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            {user.role !== "admin" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeletingUser(user)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover
                                </DropdownMenuItem>
                              </>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Badge variant="outline" className={`${ROLE_COLORS[user.role]} border`}>
                      {ROLE_LABELS[user.role]}
                    </Badge>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          user.active
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {user.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Criado em {new Date(user.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhum usuario encontrado</h3>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou criar um novo usuario</p>
            </div>
          )}
        </>
      )}

      {activeTab === "audit" && (
        <div className="space-y-3">
          {auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhum registro de auditoria</h3>
              <p className="text-sm text-muted-foreground">
                As acoes de gerenciamento de usuarios serao registradas aqui
              </p>
            </div>
          ) : (
            auditLogs.map((log, index) => {
              const actionInfo = AUDIT_ACTIONS[log.action] || {
                label: log.action,
                color: "text-muted-foreground",
                icon: <Clock className="h-4 w-4" />,
              }

              return (
                <Card
                  key={log.id}
                  className="bg-card/50 border-border/50 hover:bg-card/80 transition-all duration-300"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg bg-muted/50 ${actionInfo.color}`}>{actionInfo.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{actionInfo.label}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground truncate">
                            {typeof log.details === "object"
                              ? (log.details as { name?: string; email?: string })?.name ||
                                (log.details as { email?: string })?.email ||
                                JSON.stringify(log.details)
                              : log.details}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              Criar Novo Usuario
            </DialogTitle>
            <DialogDescription>Adicione um novo usuario ao sistema</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Nome completo</Label>
              <Input
                id="create-name"
                placeholder="Digite o nome do usuario"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="usuario@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-muted/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-role">Cargo</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="create-role" className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ROLE_AVATAR_COLORS[role]}`} />
                        {ROLE_LABELS[role]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-password">Senha temporaria</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Minimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-muted/50"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Pencil className="h-4 w-4 text-blue-500" />
              </div>
              Editar Usuario
            </DialogTitle>
            <DialogDescription>Atualize as informacoes do usuario</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome completo</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-muted/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-role">Cargo</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="edit-role" className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ROLE_AVATAR_COLORS[role]}`} />
                        {ROLE_LABELS[role]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-password">Nova senha (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Deixe em branco para manter a atual"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-muted/50"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setEditingUser(null)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Salvar Alteracoes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Remover Usuario
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuario <strong>{deletingUser?.name}</strong>? Esta acao nao pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Remover Usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
