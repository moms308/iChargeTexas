import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ServiceRequest, Message, AppError, ArchivedRequest, JobAcceptanceLog } from "./types";
import { Platform, Alert } from "react-native";
import { roadsideServices, calculateServicePrice, isAfterHours } from "./serviceData";

const STORAGE_KEY = "@ev_service_requests";
const ARCHIVE_STORAGE_KEY = "@ev_archived_requests";
const NOTIFICATION_PERMISSION_KEY = "@notification_permission_shown";
const ERROR_STORAGE_KEY = "@app_errors";
const LAST_ERROR_RESET_KEY = "@last_error_reset";



export const [ServiceContext, useService] = createContextHook(() => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [archivedRequests, setArchivedRequests] = useState<ArchivedRequest[]>([]);
  const [hasShownNotificationPrompt, setHasShownNotificationPrompt] = useState<boolean>(false);
  const [errors, setErrors] = useState<AppError[]>([]);
  const [lastErrorReset, setLastErrorReset] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadNotificationPermissionState();
    loadErrors();
    loadLastErrorReset();
    checkAndResetErrors();
  }, []);

  const loadNotificationPermissionState = async () => {
    try {
      const shown = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
      setHasShownNotificationPrompt(shown === 'true');
    } catch (error) {
      console.error('Error loading notification permission state:', error);
    }
  };

  const markNotificationPromptShown = async () => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
      setHasShownNotificationPrompt(true);
    } catch (error) {
      console.error('Error saving notification permission state:', error);
    }
  };

  const loadErrors = async () => {
    try {
      const stored = await AsyncStorage.getItem(ERROR_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setErrors(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error loading errors:', error);
    }
  };

  const loadLastErrorReset = async () => {
    try {
      const stored = await AsyncStorage.getItem(LAST_ERROR_RESET_KEY);
      setLastErrorReset(stored);
    } catch (error) {
      console.error('Error loading last error reset:', error);
    }
  };

  const checkAndResetErrors = async () => {
    try {
      const lastResetStr = await AsyncStorage.getItem(LAST_ERROR_RESET_KEY);
      const now = new Date();
      
      if (!lastResetStr) {
        await AsyncStorage.setItem(LAST_ERROR_RESET_KEY, now.toISOString());
        setLastErrorReset(now.toISOString());
        return;
      }

      const lastReset = new Date(lastResetStr);
      const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

      if (hoursSinceReset >= 24) {
        console.log('[ServiceContext] 24 hours elapsed, resetting errors automatically');
        await AsyncStorage.removeItem(ERROR_STORAGE_KEY);
        await AsyncStorage.setItem(LAST_ERROR_RESET_KEY, now.toISOString());
        setErrors([]);
        setLastErrorReset(now.toISOString());
      }
    } catch (error) {
      console.error('Error checking/resetting errors:', error);
    }
  };

  const trackError = useCallback(async (errorMessage: string) => {
    try {
      const stored = await AsyncStorage.getItem(ERROR_STORAGE_KEY);
      let currentErrors: AppError[] = [];
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          currentErrors = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error('Error parsing stored errors:', e);
        }
      }

      const existingError = currentErrors.find(err => err.message === errorMessage);
      
      if (existingError) {
        existingError.count += 1;
        existingError.lastOccurrence = new Date().toISOString();
      } else {
        const newError: AppError = {
          id: Date.now().toString(),
          message: errorMessage,
          timestamp: new Date().toISOString(),
          count: 1,
          lastOccurrence: new Date().toISOString(),
        };
        currentErrors.push(newError);
      }

      await AsyncStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(currentErrors));
      setErrors(currentErrors);
    } catch (error) {
      console.error('Error tracking error:', error);
    }
  }, []);

  const resetErrors = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ERROR_STORAGE_KEY);
      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_ERROR_RESET_KEY, now);
      setErrors([]);
      setLastErrorReset(now);
      console.log('[ServiceContext] Errors reset manually');
    } catch (error) {
      console.error('Error resetting errors:', error);
    }
  }, []);

  const archivedRequestsQuery = useQuery({
    queryKey: ["archivedRequests"],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(ARCHIVE_STORAGE_KEY);
        console.log('[ServiceContext] Raw archived data:', stored ? stored.substring(0, 100) : 'null');
        
        if (!stored || stored === 'null' || stored === 'undefined') {
          console.log('[ServiceContext] No archived data found');
          return [];
        }
        
        let parsed;
        try {
          parsed = JSON.parse(stored);
        } catch (parseError) {
          console.error('[ServiceContext] Archive JSON parse failed:', parseError);
          await AsyncStorage.removeItem(ARCHIVE_STORAGE_KEY);
          return [];
        }
        
        if (!Array.isArray(parsed)) {
          console.warn('[ServiceContext] Invalid archive format (not array), clearing storage');
          await AsyncStorage.removeItem(ARCHIVE_STORAGE_KEY);
          return [];
        }
        
        console.log('[ServiceContext] Successfully loaded', parsed.length, 'archived requests');
        return parsed;
      } catch (error) {
        console.error('[ServiceContext] Error in archivedRequestsQuery:', error);
        try {
          await AsyncStorage.removeItem(ARCHIVE_STORAGE_KEY);
        } catch (removeError) {
          console.error('[ServiceContext] Failed to remove corrupted archive:', removeError);
        }
        return [];
      }
    },
  });

  const requestsQuery = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        console.log('[ServiceContext] Raw stored data:', stored ? stored.substring(0, 100) : 'null');
        
        if (!stored || stored === 'null' || stored === 'undefined') {
          console.log('[ServiceContext] No valid stored data found');
          return [];
        }
        
        if (stored.includes('[object') || stored.includes('Object object') || stored.includes('undefined') || stored === '{}' || stored === 'null') {
          console.error('[ServiceContext] Detected corrupted data string, clearing...', stored.substring(0, 50));
          await AsyncStorage.removeItem(STORAGE_KEY);
          await trackError('Storage corrupted: Invalid string detected');
          return [];
        }
        
        if (typeof stored !== 'string') {
          console.warn('[ServiceContext] Stored data is not a string, clearing...');
          await AsyncStorage.removeItem(STORAGE_KEY);
          await trackError('Storage corrupted: Non-string data type');
          return [];
        }
        
        let parsed;
        try {
          parsed = JSON.parse(stored);
        } catch (parseError) {
          console.error('[ServiceContext] JSON parse failed:', parseError);
          console.log('[ServiceContext] Invalid JSON data:', stored.substring(0, 200));
          await AsyncStorage.removeItem(STORAGE_KEY);
          await trackError(`JSON parse failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          return [];
        }
        
        if (!Array.isArray(parsed)) {
          console.warn('[ServiceContext] Invalid data format (not array), clearing storage');
          console.log('[ServiceContext] Data type:', typeof parsed);
          await AsyncStorage.removeItem(STORAGE_KEY);
          await trackError('Storage corrupted: Not an array');
          return [];
        }
        
        console.log('[ServiceContext] Successfully loaded', parsed.length, 'requests');
        return parsed;
      } catch (error) {
        console.error('[ServiceContext] Error in requestsQuery:', error);
        console.log('[ServiceContext] Clearing all data due to error');
        await trackError(`Request query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        try {
          await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (removeError) {
          console.error('[ServiceContext] Failed to remove corrupted data:', removeError);
        }
        return [];
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newRequests: ServiceRequest[]) => {
      try {
        if (!Array.isArray(newRequests)) {
          console.error('[ServiceContext] Attempted to save non-array data:', typeof newRequests);
          throw new Error('Invalid data format: Expected array');
        }
        const jsonString = JSON.stringify(newRequests);
        console.log('[ServiceContext] Saving data, size:', jsonString.length, 'requests:', newRequests.map(r => ({ id: r.id, status: r.status })));
        await AsyncStorage.setItem(STORAGE_KEY, jsonString);
        console.log('[ServiceContext] Save to AsyncStorage completed successfully');
        return newRequests;
      } catch (error) {
        console.error('[ServiceContext] Error in saveMutation:', error);
        await trackError(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[ServiceContext] Save mutation successful, updating query cache with:', data.map(r => ({ id: r.id, status: r.status })));
      queryClient.setQueryData(["serviceRequests"], data);
    },
    onError: (error) => {
      console.error('[ServiceContext] Save mutation failed:', error);
    },
  });

  const { mutate: saveMutate, isPending: isSaving } = saveMutation;

  useEffect(() => {
    if (requestsQuery.data) {
      setRequests(requestsQuery.data);
    }
  }, [requestsQuery.data]);

  useEffect(() => {
    if (archivedRequestsQuery.data) {
      setArchivedRequests(archivedRequestsQuery.data);
    }
  }, [archivedRequestsQuery.data]);

  const saveArchivedMutation = useMutation({
    mutationFn: async (newArchived: ArchivedRequest[]) => {
      try {
        if (!Array.isArray(newArchived)) {
          console.error('[ServiceContext] Attempted to save non-array archive:', typeof newArchived);
          throw new Error('Invalid data format: Expected array');
        }
        const jsonString = JSON.stringify(newArchived);
        console.log('[ServiceContext] Saving archive, size:', jsonString.length);
        await AsyncStorage.setItem(ARCHIVE_STORAGE_KEY, jsonString);
        return newArchived;
      } catch (error) {
        console.error('[ServiceContext] Error in saveArchivedMutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["archivedRequests"], data);
    },
    onError: (error) => {
      console.error('[ServiceContext] Archive save mutation failed:', error);
    },
  });

  const { mutate: saveArchivedMutate } = saveArchivedMutation;

  const archiveRequest = useCallback((request: ServiceRequest) => {
    const archived: ArchivedRequest = {
      ...request,
      archivedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
    
    const existingIndex = archivedRequests.findIndex(r => r.id === request.id);
    let updated: ArchivedRequest[];
    
    if (existingIndex >= 0) {
      updated = [...archivedRequests];
      updated[existingIndex] = { ...archived, archivedAt: archivedRequests[existingIndex].archivedAt };
      console.log('[ServiceContext] Updated archived request:', request.id);
    } else {
      updated = [archived, ...archivedRequests];
      console.log('[ServiceContext] Archived new request:', request.id);
    }
    
    setArchivedRequests(updated);
    saveArchivedMutate(updated);
  }, [archivedRequests, saveArchivedMutate]);

  const deleteArchivedRequest = useCallback((id: string) => {
    const updated = archivedRequests.filter((req) => req.id !== id);
    setArchivedRequests(updated);
    saveArchivedMutate(updated);
    console.log('[ServiceContext] Permanently deleted archived request:', id);
  }, [archivedRequests, saveArchivedMutate]);

  const addRequest = useCallback((request: Omit<ServiceRequest, "id" | "createdAt">) => {
    const newRequest: ServiceRequest = {
      ...request,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newRequest, ...requests];
    setRequests(updated);
    saveMutate(updated);
    
    archiveRequest(newRequest);
    
    return newRequest;
  }, [requests, saveMutate, archiveRequest]);

  const updateRequestStatus = useCallback((
    id: string,
    status: ServiceRequest["status"]
  ) => {
    console.log('[ServiceContext] Updating status for request:', id, 'to:', status);
    const updated = requests.map((req) => {
      if (req.id === id) {
        console.log('[ServiceContext] Found request, old status:', req.status, 'new status:', status);
        return { ...req, status };
      }
      return req;
    });
    console.log('[ServiceContext] Updated requests array:', updated.map(r => ({ id: r.id, status: r.status })));
    setRequests(updated);
    saveMutate(updated);
    
    const updatedRequest = updated.find(r => r.id === id);
    if (updatedRequest) {
      console.log('[ServiceContext] Archiving updated request with status:', updatedRequest.status);
      archiveRequest(updatedRequest);
    }
  }, [requests, saveMutate, archiveRequest]);

  const updateRequestReason = useCallback(async (
    id: string,
    reasonType: 'cancel' | 'delete',
    reason: string
  ) => {
    const updated = requests.map((req) =>
      req.id === id
        ? {
            ...req,
            [reasonType === 'cancel' ? 'cancelReason' : 'deleteReason']: reason,
          }
        : req
    );
    setRequests(updated);
    saveMutate(updated);
    
    const updatedRequest = updated.find(r => r.id === id);
    if (updatedRequest) {
      archiveRequest(updatedRequest);
    }
  }, [requests, saveMutate, archiveRequest]);

  const updateRequestNote = useCallback(async (
    id: string,
    note: string
  ) => {
    const updated = requests.map((req) =>
      req.id === id ? { ...req, adminNote: note } : req
    );
    setRequests(updated);
    saveMutate(updated);
    
    const updatedRequest = updated.find(r => r.id === id);
    if (updatedRequest) {
      archiveRequest(updatedRequest);
    }


  }, [requests, saveMutate, archiveRequest]);

  const deleteRequest = useCallback((id: string) => {
    const updated = requests.filter((req) => req.id !== id);
    setRequests(updated);
    saveMutate(updated);
  }, [requests, saveMutate]);

  const clearPastRequests = useCallback(() => {
    const updated = requests.filter((req) => req.status !== "completed" && req.status !== "canceled");
    setRequests(updated);
    saveMutate(updated);
    console.log('[ServiceContext] Cleared completed and canceled requests');
  }, [requests, saveMutate]);

  const updateRequestAddress = useCallback(async (
    id: string,
    address: string
  ) => {
    const updated = requests.map((req) =>
      req.id === id 
        ? { 
            ...req, 
            location: {
              ...req.location,
              address: address.trim() || undefined
            }
          } 
        : req
    );
    setRequests(updated);
    saveMutate(updated);
    
    const updatedRequest = updated.find(r => r.id === id);
    if (updatedRequest) {
      archiveRequest(updatedRequest);
    }
  }, [requests, saveMutate, archiveRequest]);

  const updateRequestAssignedStaff = useCallback(async (
    id: string,
    staffIds: string[]
  ) => {
    const updated = requests.map((req) =>
      req.id === id 
        ? { ...req, assignedStaff: staffIds } 
        : req
    );
    setRequests(updated);
    saveMutate(updated);
    
    const updatedRequest = updated.find(r => r.id === id);
    if (updatedRequest) {
      archiveRequest(updatedRequest);
    }
  }, [requests, saveMutate, archiveRequest]);

  const addAcceptanceLog = useCallback(async (
    requestId: string,
    log: JobAcceptanceLog
  ) => {
    const updated = requests.map((req) =>
      req.id === requestId
        ? { ...req, acceptanceLogs: [log, ...(req.acceptanceLogs || [])] }
        : req
    );
    setRequests(updated);
    saveMutate(updated);

    const updatedRequest = updated.find(r => r.id === requestId);
    if (updatedRequest) {
      archiveRequest(updatedRequest);
    }
  }, [requests, saveMutate, archiveRequest]);

  const addPhoto = useCallback(async (
    requestId: string,
    photoUri: string
  ) => {
    const updated = requests.map((req) => {
      if (req.id === requestId) {
        const photos = req.photos || [];
        return { ...req, photos: [...photos, photoUri] };
      }
      return req;
    });
    
    setRequests(updated);
    saveMutate(updated);
    
    const updatedRequest = updated.find(r => r.id === requestId);
    if (updatedRequest) {
      archiveRequest(updatedRequest);
    }
  }, [requests, saveMutate, archiveRequest]);

  const removePhoto = useCallback(async (
    requestId: string,
    photoUri: string
  ) => {
    const updated = requests.map((req) => {
      if (req.id === requestId) {
        const photos = (req.photos || []).filter(p => p !== photoUri);
        return { ...req, photos };
      }
      return req;
    });
    
    setRequests(updated);
    saveMutate(updated);
    
    const updatedRequest = updated.find(r => r.id === requestId);
    if (updatedRequest) {
      archiveRequest(updatedRequest);
    }
  }, [requests, saveMutate, archiveRequest]);

  const addMessage = useCallback(async (
    requestId: string,
    messageText: string,
    sender: "admin" | "user"
  ) => {
    const message: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender,
      timestamp: new Date().toISOString(),
    };

    const updated = requests.map((req) => {
      if (req.id === requestId) {
        const messages = req.messages || [];
        return { ...req, messages: [...messages, message] };
      }
      return req;
    });
    
    setRequests(updated);
    saveMutate(updated);
    
    const updatedRequest = updated.find(r => r.id === requestId);
    if (updatedRequest) {
      archiveRequest(updatedRequest);
    }


  }, [requests, saveMutate, hasShownNotificationPrompt, archiveRequest]);

  const createTestInvoice = useCallback(() => {
    const numServices = Math.floor(Math.random() * 3) + 1;
    const shuffled = [...roadsideServices].sort(() => Math.random() - 0.5);
    const selectedServices = shuffled.slice(0, numServices);
    
    const testDate = new Date();
    const afterHours = isAfterHours(testDate);
    
    const servicesWithPricing = selectedServices.map(service => ({
      serviceId: service.id,
      serviceName: service.name,
      price: calculateServicePrice(service, testDate),
      isAfterHours: afterHours,
    }));
    
    const totalAmount = servicesWithPricing.reduce((sum, service) => sum + service.price, 0);
    const taxRate = 0.0825;
    const totalWithTax = totalAmount * (1 + taxRate);
    
    const serviceNames = selectedServices.map(s => s.name).join(", ");
    
    const testRequest: Omit<ServiceRequest, "id" | "createdAt"> = {
      type: "roadside",
      name: "John Doe",
      phone: "+1 (555) 123-4567",
      email: "test@example.com",
      title: `Test Invoice - ${serviceNames}`,
      description: `Customer needs: ${serviceNames}. ${afterHours ? "After-hours service" : "Regular hours service"}. Tax (8.25%): ${(totalAmount * taxRate).toFixed(2)}. Total with tax: ${totalWithTax.toFixed(2)}`,
      location: {
        latitude: 29.7604,
        longitude: -95.3698,
        address: "123 Test Street, Houston, TX 77002",
      },
      vehicleInfo: "2020 Tesla Model 3 - White",
      preferredDate: new Date().toLocaleDateString(),
      preferredTime: "ASAP",
      hasSpareTire: false,
      selectedServices: servicesWithPricing,
      totalAmount: totalWithTax,
      status: "pending",
    };
    
    return addRequest(testRequest);
  }, [addRequest]);

  return useMemo(() => ({
    requests,
    archivedRequests,
    addRequest,
    updateRequestStatus,
    updateRequestNote,
    updateRequestReason,
    deleteRequest,
    clearPastRequests,
    addMessage,
    updateRequestAddress,
    updateRequestAssignedStaff,
    archiveRequest,
    deleteArchivedRequest,
    createTestInvoice,
    isLoading: requestsQuery.isLoading || archivedRequestsQuery.isLoading,
    isSaving,
    errors,
    trackError,
    resetErrors,
    lastErrorReset,
    addPhoto,
    removePhoto,
    addAcceptanceLog,
  }), [requests, archivedRequests, addRequest, updateRequestStatus, updateRequestNote, updateRequestReason, deleteRequest, clearPastRequests, addMessage, updateRequestAddress, updateRequestAssignedStaff, archiveRequest, deleteArchivedRequest, createTestInvoice, requestsQuery.isLoading, archivedRequestsQuery.isLoading, isSaving, errors, trackError, resetErrors, lastErrorReset, addPhoto, removePhoto, addAcceptanceLog]);
});
