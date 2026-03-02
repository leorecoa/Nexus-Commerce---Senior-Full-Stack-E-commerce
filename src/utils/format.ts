interface FormatPriceOptions {
  locale?: string
  currency?: string
}

export const formatPrice = (
  price: number,
  options: FormatPriceOptions = {}
): string => {
  const locale = options.locale ?? 'pt-BR'
  const currency = options.currency ?? 'BRL'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(price)
}

export const formatDate = (date: string, locale = 'pt-BR'): string => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
