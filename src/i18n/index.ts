import { createContext, useContext } from 'react'
import { en, type Dict } from './en'
import { pt } from './pt'

export type Language = 'en' | 'pt'

export const dictionaries: Record<Language, Dict> = { en, pt }

/** Idioma padrão: inglês. O produto é para o mercado americano. */
export const DEFAULT_LANGUAGE: Language = 'en'

export const I18nContext = createContext<Dict>(en)

export const useT = (): Dict => useContext(I18nContext)

/** Código de idioma para o atributo lang do documento e para formatações. */
export const localeTag: Record<Language, string> = { en: 'en-US', pt: 'pt-BR' }

export type { Dict }
