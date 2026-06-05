import { create } from 'zustand'

/**
 * Literature store state and actions interface.
 * Manages search, filtering, sorting, and sidebar UI state
 * for the literature library view.
 */
interface LiteratureStore {
  // State
  searchQuery: string
  selectedCategory: string | null
  selectedTag: string | null
  sortBy: 'date' | 'title' | 'createdAt'
  sortOrder: 'asc' | 'desc'
  sidebarOpen: boolean

  // Actions
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string | null) => void
  setSelectedTag: (tag: string | null) => void
  setSortBy: (sort: 'date' | 'title' | 'createdAt') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  resetFilters: () => void
}

/** Default state values for the literature store */
const initialState = {
  searchQuery: '',
  selectedCategory: null as string | null,
  selectedTag: null as string | null,
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,
  sidebarOpen: true,
}

/**
 * Zustand store for literature library state management.
 * Handles search queries, category filtering, sort options,
 * and sidebar visibility toggle.
 */
export const useLiteratureStore = create<LiteratureStore>((set) => ({
  ...initialState,

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  setSelectedTag: (tag) => set({ selectedTag: tag }),

  setSortBy: (sort) => set({ sortBy: sort }),

  setSortOrder: (order) => set({ sortOrder: order }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  /** Reset all filters back to their initial values */
  resetFilters: () =>
    set({
      searchQuery: initialState.searchQuery,
      selectedCategory: initialState.selectedCategory,
      selectedTag: initialState.selectedTag,
      sortBy: initialState.sortBy,
      sortOrder: initialState.sortOrder,
    }),
}))
