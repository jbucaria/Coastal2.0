// src/stores/useUserStore.js
import { create } from 'zustand'

const useUserStore = create(set => ({
  user: null, // This can store both Firebase Auth and extra profile info from Firestore
  setUser: userData => set({ user: userData }),
  clearUser: () => set({ user: null }),
  // You could add additional actions (updateProfile, etc.) as needed
}))

export { useUserStore }
