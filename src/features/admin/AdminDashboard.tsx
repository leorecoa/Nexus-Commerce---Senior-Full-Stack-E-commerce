import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/services/supabase/productService'
import { categoryService } from '@/services/supabase/categoryService'
import { organizationService } from '@/services/supabase/organizationService'
import { useTenantStore } from '@/stores/tenantStore'
import { useToastStore } from '@/stores/toastStore'
import { Category, Product } from '@/types'
import { Save, Trash2, Edit, Plus, Upload, Search } from 'lucide-react'
import { formatPrice } from '@/utils/format'
import { SceneBuilderSection } from './SceneBuilderSection'
import { BrandingSection } from './BrandingSection'
import { OperationsSection } from './OperationsSection'

interface CategoryFormState {
  name: string
  slug: string
  description: string
}

interface ProductFormState {
  name: string
  description: string
  price: string
  volume: string
  type: string
  image_url: string
  category_id: string
  stock_quantity: string
  is_active: boolean
}

interface ConfirmDeleteState {
  entity: 'product' | 'category'
  id: string
  name: string
}

const emptyCategoryForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
}

const emptyProductForm: ProductFormState = {
  name: '',
  description: '',
  price: '',
  volume: '',
  type: '',
  image_url: '',
  category_id: '',
  stock_quantity: '0',
  is_active: true,
}

const PAGE_SIZE = 6

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const AdminDashboard = () => {
  const activeOrganizationId = useTenantStore(
    state => state.activeOrganizationId
  )
  const addToast = useToastStore(state => state.addToast)
  const queryClient = useQueryClient()

  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(emptyCategoryForm)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  )
  const [categorySearch, setCategorySearch] = useState('')

  const [productForm, setProductForm] =
    useState<ProductFormState>(emptyProductForm)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all')
  const [currentPage, setCurrentPage] = useState(1)

  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(
    null
  )

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-admin', activeOrganizationId],
    queryFn: () => categoryService.getAll(activeOrganizationId),
    enabled: Boolean(activeOrganizationId),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products-admin', activeOrganizationId],
    queryFn: () =>
      productService.getAll(activeOrganizationId, { includeInactive: true }),
    enabled: Boolean(activeOrganizationId),
  })

  const { data: kpis } = useQuery({
    queryKey: ['org-kpis', activeOrganizationId],
    queryFn: () =>
      organizationService.getOrganizationKpis(activeOrganizationId!),
    enabled: Boolean(activeOrganizationId),
  })

  const { data: planSnapshot } = useQuery({
    queryKey: ['org-plan-snapshot', activeOrganizationId],
    queryFn: () => organizationService.getPlanSnapshot(activeOrganizationId!),
    enabled: Boolean(activeOrganizationId),
  })

  const categoryOptions = useMemo(
    () =>
      (categories as Category[]).map(category => ({
        id: category.id,
        name: category.name,
      })),
    [categories]
  )

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => productService.uploadImage(file),
    onSuccess: url => {
      setProductForm(prev => ({ ...prev, image_url: url }))
      addToast({ title: 'Imagem enviada com sucesso', variant: 'success' })
    },
    onError: error => {
      addToast({
        title: 'Erro ao enviar imagem',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrganizationId) throw new Error('Selecione uma organizacao.')
      return categoryService.create(
        {
          name: categoryForm.name.trim(),
          slug: categoryForm.slug.trim(),
          description: categoryForm.description.trim() || undefined,
        },
        activeOrganizationId
      )
    },
    onSuccess: () => {
      setCategoryForm(emptyCategoryForm)
      queryClient.invalidateQueries({
        queryKey: ['categories-admin', activeOrganizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['categories', activeOrganizationId],
      })
      addToast({ title: 'Categoria criada', variant: 'success' })
    },
    onError: error => {
      addToast({
        title: 'Erro ao criar categoria',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!editingCategoryId) throw new Error('Categoria invalida.')
      return categoryService.update(
        editingCategoryId,
        {
          name: categoryForm.name.trim(),
          slug: categoryForm.slug.trim(),
          description: categoryForm.description.trim() || undefined,
        },
        activeOrganizationId
      )
    },
    onSuccess: () => {
      setCategoryForm(emptyCategoryForm)
      setEditingCategoryId(null)
      queryClient.invalidateQueries({
        queryKey: ['categories-admin', activeOrganizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['categories', activeOrganizationId],
      })
      addToast({ title: 'Categoria atualizada', variant: 'success' })
    },
    onError: error => {
      addToast({
        title: 'Erro ao atualizar categoria',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) =>
      categoryService.delete(categoryId, activeOrganizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categories-admin', activeOrganizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['categories', activeOrganizationId],
      })
      addToast({ title: 'Categoria removida', variant: 'success' })
    },
    onError: error => {
      addToast({
        title: 'Erro ao remover categoria',
        description:
          error instanceof Error
            ? error.message
            : 'Categoria pode estar em uso por produtos.',
        variant: 'error',
      })
    },
  })

  const createProductMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrganizationId) throw new Error('Selecione uma organizacao.')
      return productService.create(
        {
          name: productForm.name.trim(),
          description: productForm.description.trim() || undefined,
          price: Number(productForm.price),
          volume: productForm.volume.trim() || undefined,
          type: productForm.type.trim() || undefined,
          image_url: productForm.image_url.trim() || undefined,
          category_id: productForm.category_id || undefined,
          stock_quantity: Number(productForm.stock_quantity),
          is_active: productForm.is_active,
        },
        activeOrganizationId
      )
    },
    onSuccess: () => {
      setProductForm(emptyProductForm)
      queryClient.invalidateQueries({
        queryKey: ['products-admin', activeOrganizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['products', activeOrganizationId],
      })
      addToast({ title: 'Produto criado', variant: 'success' })
    },
    onError: error => {
      addToast({
        title: 'Erro ao criar produto',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const updateProductMutation = useMutation({
    mutationFn: async () => {
      if (!editingProductId) throw new Error('Produto invalido.')
      return productService.update(
        editingProductId,
        {
          name: productForm.name.trim(),
          description: productForm.description.trim() || undefined,
          price: Number(productForm.price),
          volume: productForm.volume.trim() || undefined,
          type: productForm.type.trim() || undefined,
          image_url: productForm.image_url.trim() || undefined,
          category_id: productForm.category_id || undefined,
          stock_quantity: Number(productForm.stock_quantity),
          is_active: productForm.is_active,
        },
        activeOrganizationId
      )
    },
    onSuccess: () => {
      setProductForm(emptyProductForm)
      setEditingProductId(null)
      queryClient.invalidateQueries({
        queryKey: ['products-admin', activeOrganizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['products', activeOrganizationId],
      })
      addToast({ title: 'Produto atualizado', variant: 'success' })
    },
    onError: error => {
      addToast({
        title: 'Erro ao atualizar produto',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) =>
      productService.delete(productId, activeOrganizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['products-admin', activeOrganizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['products', activeOrganizationId],
      })
      addToast({ title: 'Produto removido', variant: 'success' })
    },
    onError: error => {
      addToast({
        title: 'Erro ao remover produto',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const handleCategorySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!categoryForm.name.trim()) {
      addToast({ title: 'Nome e obrigatorio', variant: 'error' })
      return
    }

    const normalizedSlug = slugify(categoryForm.slug || categoryForm.name)
    if (!normalizedSlug) {
      addToast({ title: 'Slug invalido', variant: 'error' })
      return
    }

    const payload = {
      ...categoryForm,
      slug: normalizedSlug,
    }
    setCategoryForm(payload)

    if (editingCategoryId) {
      updateCategoryMutation.mutate()
      return
    }
    createCategoryMutation.mutate()
  }

  const handleProductSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!productForm.name.trim()) {
      addToast({ title: 'Nome do produto e obrigatorio', variant: 'error' })
      return
    }

    if (!productForm.price || Number(productForm.price) <= 0) {
      addToast({ title: 'Preco deve ser maior que zero', variant: 'error' })
      return
    }

    if (Number(productForm.stock_quantity) < 0) {
      addToast({ title: 'Estoque nao pode ser negativo', variant: 'error' })
      return
    }

    if (editingProductId) {
      updateProductMutation.mutate()
      return
    }
    createProductMutation.mutate()
  }

  const handleImageUpload = (file?: File) => {
    if (!file) return
    uploadImageMutation.mutate(file)
  }

  const requestDeleteCategory = (category: Category) => {
    setConfirmDelete({
      entity: 'category',
      id: category.id,
      name: category.name,
    })
  }

  const requestDeleteProduct = (product: Product) => {
    setConfirmDelete({ entity: 'product', id: product.id, name: product.name })
  }

  const confirmDeleteAction = () => {
    if (!confirmDelete) return

    if (confirmDelete.entity === 'category') {
      deleteCategoryMutation.mutate(confirmDelete.id)
    } else {
      deleteProductMutation.mutate(confirmDelete.id)
    }

    setConfirmDelete(null)
  }

  const startCategoryEdit = (category: Category) => {
    setEditingCategoryId(category.id)
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
    })
  }

  const cancelCategoryEdit = () => {
    setEditingCategoryId(null)
    setCategoryForm(emptyCategoryForm)
  }

  const startProductEdit = (product: Product) => {
    setEditingProductId(product.id)
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      volume: product.volume || '',
      type: product.type || '',
      image_url: product.image_url || '',
      category_id: product.category_id || '',
      stock_quantity: String(product.stock_quantity),
      is_active: Boolean(product.is_active),
    })
  }

  const cancelProductEdit = () => {
    setEditingProductId(null)
    setProductForm(emptyProductForm)
  }

  const filteredCategories = useMemo(() => {
    const normalizedSearch = categorySearch.trim().toLowerCase()
    if (!normalizedSearch) return categories as Category[]

    return (categories as Category[]).filter(category =>
      [category.name, category.slug, category.description || '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [categories, categorySearch])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase()

    return (products as Product[])
      .filter(product => {
        if (statusFilter === 'active') return product.is_active
        if (statusFilter === 'inactive') return !product.is_active
        return true
      })
      .filter(product => {
        if (!normalizedSearch) return true
        return [product.name, product.type || '', product.description || '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      })
  }, [products, productSearch, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const isSavingCategory =
    createCategoryMutation.isPending || updateCategoryMutation.isPending
  const isSavingProduct =
    createProductMutation.isPending || updateProductMutation.isPending

  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-28 text-white">
      <h1 className="mb-8 text-5xl">Admin Dashboard</h1>

      {activeOrganizationId && kpis && planSnapshot && (
        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="glass-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/60">
              Conversion 30d
            </p>
            <p className="mt-2 text-3xl">{kpis.conversion_rate}%</p>
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/60">
              AOV
            </p>
            <p className="mt-2 text-3xl">{formatPrice(Number(kpis.aov))}</p>
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/60">
              Checkout abandonment
            </p>
            <p className="mt-2 text-3xl">{kpis.checkout_abandonment_rate}%</p>
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/60">
              Plan
            </p>
            <p className="mt-2 text-2xl">{planSnapshot.plan_name}</p>
            <p className="mt-1 text-xs text-white/65">{planSnapshot.status}</p>
            <p className="mt-2 text-xs text-white/70">
              stores {planSnapshot.usage.stores}/{planSnapshot.limits.stores} |
              scenes {planSnapshot.usage.scenes}/{planSnapshot.limits.scenes}
            </p>
            <p className="text-xs text-white/70">
              products {planSnapshot.usage.products}/
              {planSnapshot.limits.products} | members{' '}
              {planSnapshot.usage.members}/{planSnapshot.limits.members}
            </p>
          </div>
        </section>
      )}

      {!activeOrganizationId && (
        <div className="glass-panel rounded-2xl p-5 text-white/80">
          Selecione uma organizacao para administrar produtos e categorias.
        </div>
      )}

      {activeOrganizationId && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="glass-panel rounded-3xl p-6">
            <h2 className="text-3xl">
              {editingCategoryId ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
            <form onSubmit={handleCategorySubmit} className="mt-5 space-y-3">
              <input
                value={categoryForm.name}
                onChange={event =>
                  setCategoryForm(prev => ({
                    ...prev,
                    name: event.target.value,
                    slug: prev.slug ? prev.slug : slugify(event.target.value),
                  }))
                }
                placeholder="Nome"
                className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
              />
              <input
                value={categoryForm.slug}
                onChange={event =>
                  setCategoryForm(prev => ({
                    ...prev,
                    slug: slugify(event.target.value),
                  }))
                }
                placeholder="slug"
                className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
              />
              <textarea
                value={categoryForm.description}
                onChange={event =>
                  setCategoryForm(prev => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Descricao"
                rows={3}
                className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-accent)] px-5 py-2 font-semibold text-slate-900 disabled:opacity-60"
                >
                  {editingCategoryId ? <Save size={16} /> : <Plus size={16} />}
                  {editingCategoryId ? 'Salvar Categoria' : 'Criar Categoria'}
                </button>
                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={cancelCategoryEdit}
                    className="rounded-full border border-white/25 px-4 py-2 text-sm text-white/85"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="glass-panel rounded-3xl p-6">
            <h2 className="text-3xl">Categorias</h2>
            <div className="relative mt-4">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
              />
              <input
                value={categorySearch}
                onChange={event => setCategorySearch(event.target.value)}
                placeholder="Buscar categoria"
                className="w-full rounded-xl border border-white/20 bg-slate-900/70 py-2 pl-9 pr-3 text-white"
              />
            </div>
            <div className="mt-5 space-y-3">
              {filteredCategories.length === 0 && (
                <p className="text-white/65">Nenhuma categoria encontrada.</p>
              )}
              {filteredCategories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-2xl border border-white/15 p-3"
                >
                  <div>
                    <h3 className="text-lg">{category.name}</h3>
                    <p className="text-xs uppercase tracking-[0.14em] text-white/55">
                      {category.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startCategoryEdit(category)}
                      className="rounded-xl p-2 text-cyan-200 hover:bg-cyan-300/20"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => requestDeleteCategory(category)}
                      className="rounded-xl p-2 text-red-200 hover:bg-red-300/20"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeOrganizationId && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="glass-panel rounded-3xl p-6">
            <h2 className="text-3xl">
              {editingProductId ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <form onSubmit={handleProductSubmit} className="mt-5 grid gap-3">
              <input
                value={productForm.name}
                onChange={event =>
                  setProductForm(prev => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Nome"
                className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
              />
              <textarea
                value={productForm.description}
                onChange={event =>
                  setProductForm(prev => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Descricao"
                rows={3}
                className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={event =>
                    setProductForm(prev => ({
                      ...prev,
                      price: event.target.value,
                    }))
                  }
                  placeholder="Preco"
                  className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
                />
                <input
                  type="number"
                  min="0"
                  value={productForm.stock_quantity}
                  onChange={event =>
                    setProductForm(prev => ({
                      ...prev,
                      stock_quantity: event.target.value,
                    }))
                  }
                  placeholder="Estoque"
                  className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={productForm.type}
                  onChange={event =>
                    setProductForm(prev => ({
                      ...prev,
                      type: event.target.value,
                    }))
                  }
                  placeholder="Tipo"
                  className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
                />
                <input
                  value={productForm.volume}
                  onChange={event =>
                    setProductForm(prev => ({
                      ...prev,
                      volume: event.target.value,
                    }))
                  }
                  placeholder="Volume"
                  className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={productForm.image_url}
                  onChange={event =>
                    setProductForm(prev => ({
                      ...prev,
                      image_url: event.target.value,
                    }))
                  }
                  placeholder="URL da imagem"
                  className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
                />
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white/90">
                  <Upload size={14} />
                  {uploadImageMutation.isPending
                    ? 'Enviando...'
                    : 'Upload imagem'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={event =>
                      handleImageUpload(event.target.files?.[0])
                    }
                    disabled={uploadImageMutation.isPending}
                  />
                </label>
              </div>
              <select
                value={productForm.category_id}
                onChange={event =>
                  setProductForm(prev => ({
                    ...prev,
                    category_id: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
              >
                <option value="" className="bg-slate-900">
                  Sem categoria
                </option>
                {categoryOptions.map(category => (
                  <option
                    key={category.id}
                    value={category.id}
                    className="bg-slate-900"
                  >
                    {category.name}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-sm text-white/85">
                <input
                  type="checkbox"
                  checked={productForm.is_active}
                  onChange={event =>
                    setProductForm(prev => ({
                      ...prev,
                      is_active: event.target.checked,
                    }))
                  }
                />
                Produto ativo
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-accent)] px-5 py-2 font-semibold text-slate-900 disabled:opacity-60"
                >
                  {editingProductId ? <Save size={16} /> : <Plus size={16} />}
                  {editingProductId ? 'Salvar Produto' : 'Criar Produto'}
                </button>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={cancelProductEdit}
                    className="rounded-full border border-white/25 px-4 py-2 text-sm text-white/85"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="glass-panel rounded-3xl p-6">
            <h2 className="text-3xl">Produtos</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
                />
                <input
                  value={productSearch}
                  onChange={event => {
                    setProductSearch(event.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Buscar produto"
                  className="w-full rounded-xl border border-white/20 bg-slate-900/70 py-2 pl-9 pr-3 text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={event => {
                  setStatusFilter(
                    event.target.value as 'all' | 'active' | 'inactive'
                  )
                  setCurrentPage(1)
                }}
                className="rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
              >
                <option value="all" className="bg-slate-900">
                  Todos
                </option>
                <option value="active" className="bg-slate-900">
                  Ativos
                </option>
                <option value="inactive" className="bg-slate-900">
                  Inativos
                </option>
              </select>
            </div>

            <div className="mt-5 space-y-3">
              {paginatedProducts.length === 0 && (
                <p className="text-white/65">Nenhum produto encontrado.</p>
              )}
              {paginatedProducts.map(product => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 rounded-2xl border border-white/15 p-3"
                >
                  <img
                    src={
                      product.image_url ||
                      'https://images.unsplash.com/photo-1563170351-be82bc888aa4?q=80&w=300&auto=format&fit=crop'
                    }
                    alt={product.name}
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg">{product.name}</h3>
                    <p className="text-sm text-white/70">
                      {formatPrice(Number(product.price))} | estoque{' '}
                      {product.stock_quantity} |{' '}
                      {product.is_active ? 'ativo' : 'inativo'}
                    </p>
                  </div>
                  <button
                    onClick={() => startProductEdit(product)}
                    className="rounded-xl p-2 text-cyan-200 hover:bg-cyan-300/20"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => requestDeleteProduct(product)}
                    className="rounded-xl p-2 text-red-200 hover:bg-red-300/20"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            {filteredProducts.length > PAGE_SIZE && (
              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                  Pagina {safePage} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage(prev => Math.max(1, prev - 1))
                    }
                    disabled={safePage === 1}
                    className="rounded-full border border-white/25 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/85 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(prev => Math.min(totalPages, prev + 1))
                    }
                    disabled={safePage === totalPages}
                    className="rounded-full border border-white/25 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/85 disabled:opacity-40"
                  >
                    Proxima
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {activeOrganizationId && (
        <BrandingSection organizationId={activeOrganizationId} />
      )}

      {activeOrganizationId && (
        <OperationsSection organizationId={activeOrganizationId} />
      )}

      <SceneBuilderSection
        organizationId={activeOrganizationId}
        products={products as Product[]}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 px-4">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-white/20 p-6">
            <h3 className="text-2xl text-white">Confirmar exclusao</h3>
            <p className="mt-2 text-sm text-white/70">
              Deseja excluir{' '}
              {confirmDelete.entity === 'product' ? 'o produto' : 'a categoria'}{' '}
              <strong>{confirmDelete.name}</strong>?
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-full border border-white/25 px-4 py-2 text-sm text-white/85"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteAction}
                className="rounded-full border border-red-300/50 bg-red-500/20 px-4 py-2 text-sm text-red-100"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
