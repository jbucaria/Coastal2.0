import { create } from 'zustand'

const useEquipmentStore = create(set => ({
  equipment: {
    airMover: 0,
    dehumidifier: 0,
    airScrubber: 0,
    containmentPoles: 0,
    ozone: 0,
  },
  equipmentOnSite: false,
  updateEquipment: newEquipment =>
    set(state => ({
      ...state,
      equipment: { ...state.equipment, ...newEquipment },
    })),
  setEquipmentOnSite: status =>
    set(() => ({
      equipmentOnSite: status,
    })),
}))
export { useEquipmentStore }
