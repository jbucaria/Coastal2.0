import { create } from 'zustand'

const useSelectedDate = create(set => ({
  selectedDate: new Date(), // Default value
  setSelectedDate: date => set({ selectedDate: date }), // Action to set selectedDate
}))

export { useSelectedDate }
