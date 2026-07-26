import { createContext, useContext } from 'react'
import { miniSiteRepository } from './miniSiteRepository.js'

export const MiniSiteRepositoryContext = createContext(miniSiteRepository)

export function useMiniSiteRepository() {
  return useContext(MiniSiteRepositoryContext)
}
