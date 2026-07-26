import { MiniSiteRepositoryContext } from './repositoryContext.js'

export function MiniSiteRepositoryProvider({ repository, children }) {
  return (
    <MiniSiteRepositoryContext.Provider value={repository}>
      {children}
    </MiniSiteRepositoryContext.Provider>
  )
}
