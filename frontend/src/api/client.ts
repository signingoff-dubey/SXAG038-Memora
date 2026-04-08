import axios from 'axios';
const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor to switch to localhost if "localBackendActive" is found in localStorage
api.interceptors.request.use((config) => {
  const isLocal = localStorage.getItem('memora-local-backend') === 'true';
  const prodUrl = (import.meta as any).env.VITE_API_URL || '/api';
  
  if (isLocal) {
    config.baseURL = 'http://127.0.0.1:8000/api';
  } else {
    config.baseURL = prodUrl;
  }
  return config;
});

export interface ChatRequest {
  message: string;
  session_id?: string;
  user_id?: string;
  model?: string;
  custom_base_url?: string;
  custom_api_key?: string;
  images?: string[];   // raw base64 strings (no data URL prefix)
}

export interface ChatResponse {
  response: string;
  memories_used: string[];
  session_id: string;
  model_used?: string;
}

export interface MemoryData {
  id: string;
  user_id: string;
  session_id: string | null;
  content: string;
  importance: number;
  decay_score: number;
  lambda_rate: number;
  is_pinned: boolean;
  is_flagged_unimportant: boolean;
  is_session_only: boolean;
  contradiction_with: string[];
  access_count: number;
  created_at: string | null;
  last_accessed_at: string | null;
  updated_at: string | null;
}

export interface MemoryUpdate {
  is_pinned?: boolean;
  is_flagged_unimportant?: boolean;
  is_session_only?: boolean;
  content?: string;
  importance?: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  details: Record<string, unknown>;
}

export const chatApi = {
  send: (data: ChatRequest) => api.post<ChatResponse>('/chat', data),
};

export const memoriesApi = {
  list: (userId = 'default') => api.get<MemoryData[]>(`/memories?user_id=${userId}`),
  get: (id: string) => api.get<MemoryData>(`/memories/${id}`),
  update: (id: string, data: MemoryUpdate) => api.patch<MemoryData>(`/memories/${id}`, data),
  delete: (id: string) => api.delete(`/memories/${id}`),
};

export const modelsApi = {
  list: () => api.get<{ models: OllamaModel[] }>('/models'),
};

export interface UserContext {
  user_id: string;
  user_profile: string;
  updated_at: string | null;
}

export const contextApi = {
  get: (userId = 'default') =>
    api.get<UserContext>(`/context?user_id=${userId}`),
  save: (userId: string, userProfile: string) =>
    api.post<UserContext>('/context', { user_id: userId, user_profile: userProfile }),
  getHealth: () => api.get('/health'),
};

export default api;
