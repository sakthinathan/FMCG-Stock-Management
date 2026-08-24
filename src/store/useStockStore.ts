import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StockStore {
  activeUploadId: string | null;
  uploadedAt: string | null;
  filename: string | null;
  
  // Actions
  setActiveUpload: (uploadId: string, filename: string, uploadedAt: string) => void;
  clearActiveUpload: () => void;
}

export const useStockStore = create<StockStore>()(
  persist(
    (set) => ({
      activeUploadId: null,
      uploadedAt: null,
      filename: null,
      
      setActiveUpload: (uploadId, filename, uploadedAt) => set({
        activeUploadId: uploadId,
        filename,
        uploadedAt,
      }),

      clearActiveUpload: () => set({ 
        activeUploadId: null, 
        uploadedAt: null, 
        filename: null 
      }),
    }),
    {
      name: 'fmcg-stock-storage-v2',
    }
  )
);
