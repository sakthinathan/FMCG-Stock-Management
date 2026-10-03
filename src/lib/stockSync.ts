import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStockStore } from '@/store/useStockStore';

export interface SyncMessage {
  type: 'STOCK_CHECK_CLOSED' | 'STOCK_CHECK_ACTIVATED' | 'BRAND_UPDATED';
  uploadId?: string;
  agencyId?: string;
  fileName?: string;
  uploadedAt?: string;
  brand?: string;
  closedBy?: string;
}

// ── Broadcast Helper Functions ──

/**
 * Broadcast to all connected devices in this agency that the stock check has been closed.
 */
export async function broadcastStockCheckClosed(agencyId: string, uploadId: string) {
  try {
    const channel = supabase.channel(`agency_sync_${agencyId}`);
    await channel.send({
      type: 'broadcast',
      event: 'STOCK_CHECK_CLOSED',
      payload: { agencyId, uploadId, timestamp: Date.now() },
    });
  } catch (e) {
    console.warn('Failed to broadcast stock check closed event:', e);
  }
}

/**
 * Broadcast to all connected devices in this agency that a new or switched stock check is now active.
 */
export async function broadcastStockCheckActivated(
  agencyId: string,
  uploadId: string,
  fileName: string,
  uploadedAt: string
) {
  try {
    const channel = supabase.channel(`agency_sync_${agencyId}`);
    await channel.send({
      type: 'broadcast',
      event: 'STOCK_CHECK_ACTIVATED',
      payload: { agencyId, uploadId, fileName, uploadedAt, timestamp: Date.now() },
    });
  } catch (e) {
    console.warn('Failed to broadcast stock check activated event:', e);
  }
}

/**
 * Broadcast when brand counts or sessions are updated.
 */
export async function broadcastBrandUpdated(agencyId: string, brand: string, sessionId?: string) {
  try {
    const channel = supabase.channel(`agency_sync_${agencyId}`);
    await channel.send({
      type: 'broadcast',
      event: 'BRAND_UPDATED',
      payload: { agencyId, brand, sessionId, timestamp: Date.now() },
    });
  } catch (e) {
    console.warn('Failed to broadcast brand updated event:', e);
  }
}

// ── Hook for Centralized Agency Realtime Synchronization ──

export function useStockRealtimeSync(
  agencyId: string | undefined,
  options?: {
    onStockCheckClosed?: (uploadId: string) => void;
    onStockCheckActivated?: (uploadId: string, fileName: string, uploadedAt: string) => void;
  }
) {
  const { activeUploadId, setActiveUpload, clearActiveUpload } = useStockStore();
  const [isSyncConnected, setIsSyncConnected] = useState(false);
  const activeUploadIdRef = useRef(activeUploadId);
  activeUploadIdRef.current = activeUploadId;

  // Verify status in DB directly
  const verifyActiveUploadStatus = useCallback(async () => {
    const currentId = activeUploadIdRef.current;
    if (!currentId || !agencyId) return;

    try {
      const { data, error } = await supabase
        .from('stock_uploads')
        .select('id, status, file_name, uploaded_at')
        .eq('id', currentId)
        .eq('agency_id', agencyId)
        .maybeSingle();

      if (error) return;

      if (!data || data.status === 'closed') {
        // Stock check was closed on another device, belongs to another agency, or removed!
        clearActiveUpload();
        if (options?.onStockCheckClosed) {
          options.onStockCheckClosed(currentId);
        }
      }
    } catch (e) {
      console.error('Error verifying active upload status:', e);
    }
  }, [agencyId, clearActiveUpload, options]);

  useEffect(() => {
    if (!agencyId) return;

    // Ensure store is scoped to this agency immediately
    useStockStore.getState().ensureAgency(agencyId);

    const channelName = `agency_sync_${agencyId}`;
    const channel = supabase.channel(channelName);

    // 1. Listen for broadcast events across mobile & desktop devices (with strict agencyId verification)
    channel
      .on('broadcast', { event: 'STOCK_CHECK_CLOSED' }, (payload: any) => {
        if (payload.payload?.agencyId && payload.payload.agencyId !== agencyId) return;
        const closedUploadId = payload.payload?.uploadId;
        if (!closedUploadId || closedUploadId === activeUploadIdRef.current) {
          clearActiveUpload();
          if (options?.onStockCheckClosed) {
            options.onStockCheckClosed(closedUploadId || activeUploadIdRef.current || '');
          }
        }
      })
      .on('broadcast', { event: 'STOCK_CHECK_ACTIVATED' }, (payload: any) => {
        if (payload.payload?.agencyId && payload.payload.agencyId !== agencyId) return;
        const { uploadId, fileName, uploadedAt } = payload.payload || {};
        if (uploadId && uploadId !== activeUploadIdRef.current) {
          setActiveUpload(uploadId, fileName, uploadedAt, agencyId);
          if (options?.onStockCheckActivated) {
            options.onStockCheckActivated(uploadId, fileName, uploadedAt);
          }
        }
      });

    // 2. Listen for Postgres changes on stock_uploads for this agency
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'stock_uploads',
        filter: `agency_id=eq.${agencyId}`,
      },
      (payload: any) => {
        const updatedRow = payload.new;
        if (updatedRow) {
          if (updatedRow.status === 'closed' && updatedRow.id === activeUploadIdRef.current) {
            clearActiveUpload();
            if (options?.onStockCheckClosed) {
              options.onStockCheckClosed(updatedRow.id);
            }
          } else if (updatedRow.status === 'active' && updatedRow.id !== activeUploadIdRef.current) {
            setActiveUpload(updatedRow.id, updatedRow.file_name, updatedRow.uploaded_at);
            if (options?.onStockCheckActivated) {
              options.onStockCheckActivated(updatedRow.id, updatedRow.file_name, updatedRow.uploaded_at);
            }
          }
        }
      }
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      setIsSyncConnected(status === 'SUBSCRIBED');
    });

    // 3. Tab Visibility & Focus listener for Mobile Sleep / Wake-up
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifyActiveUploadStatus();
      }
    };
    const handleFocus = () => {
      verifyActiveUploadStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 4. Heartbeat interval: re-verify every 25 seconds as backup
    const heartbeat = setInterval(() => {
      verifyActiveUploadStatus();
    }, 25000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [agencyId, clearActiveUpload, setActiveUpload, options, verifyActiveUploadStatus]);

  return {
    isSyncConnected,
    verifyActiveUploadStatus,
  };
}
