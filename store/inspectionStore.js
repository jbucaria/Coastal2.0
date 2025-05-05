// store/inspectionStore.js

import { create } from 'zustand'

const useInspectionStore = create(set => ({
  reports: [],

  addReport: report => set(state => ({ reports: [...state.reports, report] })),

  removeReport: reportId =>
    set(state => ({ reports: state.reports.filter(r => r.id !== reportId) })),

  updateReport: (reportId, updatedData) =>
    set(state => ({
      reports: state.reports.map(r =>
        r.id === reportId ? { ...r, ...updatedData } : r
      ),
    })),
  reports: [],

  setReports: reports => set({ reports }),
  toggleRemediationRequired: reportId =>
    set(state => ({
      reports: state.reports.map(report =>
        report.id === reportId
          ? { ...report, remediationRequired: !report.remediationRequired }
          : report
      ),
    })),

  setEquipmentOnSite: (reportId, value) =>
    set(state => ({
      reports: state.reports.map(report =>
        report.id === reportId ? { ...report, equipmentOnSite: value } : report
      ),
    })),

  toggleSiteComplete: reportId =>
    set(state => ({
      reports: state.reports.map(report =>
        report.id === reportId
          ? { ...report, siteComplete: !report.siteComplete }
          : report
      ),
    })),

  updateReportStatus: (reportId, statusUpdate) =>
    set(state => ({
      reports: state.reports.map(report =>
        report.id === reportId ? { ...report, ...statusUpdate } : report
      ),
    })),
}))

export { useInspectionStore }
