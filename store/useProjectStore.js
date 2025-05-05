import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useProjectStore = create(
  persist(
    set => ({
      projectId: null,

      // Set the project ID globally
      setProjectId: projectId => set({ projectId }),

      // Clear the project ID (optional)
      clearProjectId: () => set({ projectId: null }),
    }),
    {
      name: 'project-storage', // Persist data across app sessions
    }
  )
)

export default useProjectStore
