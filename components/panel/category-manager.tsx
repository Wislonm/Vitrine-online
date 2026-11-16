'use client'

import { useState, useTransition } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { createCategoryAction, deleteCategoryAction, renameCategoryAction } from '@/app/actions/categories'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type CategoryItem = { id: string; name: string; productCount: number }

export function CategoryManager({ categories }: { categories: CategoryItem[] }) {
  const [pending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState<CategoryItem | null>(null)

  function create(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await createCategoryAction({ name: newName })
      if (result.ok) {
        setNewName('')
        toast.success(result.message ?? 'Categoria criada')
      } else toast.error(result.error)
    })
  }

  function rename(id: string) {
    startTransition(async () => {
      const result = await renameCategoryAction(id, { name: editName })
      if (result.ok) {
        setEditingId(null)
        toast.success(result.message ?? 'Categoria atualizada')
      } else toast.error(result.error)
    })
  }

  function confirmDelete() {
    if (!deleting) return
    const target = deleting
    startTransition(async () => {
      const result = await deleteCategoryAction(target.id)
      if (result.ok) toast.success(result.message ?? 'Categoria excluída')
      else toast.error(result.error)
      setDeleting(null)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome da nova categoria"
          aria-label="Nome da nova categoria"
          maxLength={60}
        />
        <Button type="submit" size="lg" disabled={pending || newName.trim().length < 2} className="sm:shrink-0">
          <Plus aria-hidden="true" />
          Adicionar
        </Button>
      </form>

      {categories.length === 0 ? (
        <p className="rounded-[2rem] bg-muted px-6 py-12 text-center text-sm text-muted-foreground">
          Você ainda não criou categorias. Elas ajudam o cliente a filtrar os produtos na vitrine.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-3 rounded-full bg-muted py-2 pr-2 pl-6">
              {editingId === category.id ? (
                <>
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Novo nome da categoria"
                    className="h-10 bg-background"
                    maxLength={60}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') rename(category.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                  <Button type="button" size="icon-sm" onClick={() => rename(category.id)} disabled={pending} aria-label="Salvar">
                    <Check aria-hidden="true" />
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => setEditingId(null)} aria-label="Cancelar">
                    <X aria-hidden="true" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.productCount} {category.productCount === 1 ? 'produto' : 'produtos'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label={`Renomear ${category.name}`}
                    onClick={() => {
                      setEditingId(category.id)
                      setEditName(category.name)
                    }}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label={`Excluir ${category.name}`}
                    onClick={() => setDeleting(category)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os {deleting?.productCount ?? 0} produtos dessa categoria não serão excluídos, apenas ficarão sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={pending} onClick={confirmDelete}>
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
