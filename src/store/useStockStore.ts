import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StockStore {
  activeUploadId: string | null;
  uploadedAt: string | null;
  filename: string | null;
  agencyId: string | null;
  
  // Actions
  setActiveUpload: (uploadId: string, filename: string, uploadedAt: string, agencyId?: string | null) => void;
  ensureAgency: (currentAgencyId: string | null) => void;
  clearActiveUpload: () => void;
}

export const useStockStore = create<StockStore>()(
  persist(
    (set, get) => ({
      activeUploadId: null,
      uploadedAt: null,
      filename: null,
      agencyId: null,
      
      setActiveUpload: (uploadId, filename, uploadedAt, agencyId = null) => set({
        activeUploadId: uploadId,
        filename,
        uploadedAt,
        agencyId: agencyId ?? get().agencyId,
      }),

      // Ensures the stored upload strictly belongs to the current active agency.
      // If agency mismatch or no agency, clears store immediately to prevent cross-tenant contamination.
      ensureAgency: (currentAgencyId) => {
        const stored = get();
        if (!currentAgencyId || (stored.agencyId && stored.agencyId !== currentAgencyId)) {
          set({
            activeUploadId: null,
            uploadedAt: null,
            filename: null,
            agencyId: currentAgencyId || null,
          });
        } else if (!stored.agencyId && currentAgencyId) {
          set({ agencyId: currentAgencyId });
        }
      },

      clearActiveUpload: () => set({ 
        activeUploadId: null, 
        uploadedAt: null, 
        filename: null,
        agencyId: null,
      }),
    }),
    {
      name: 'fmcg-stock-storage-v2',
    }
  )
);
