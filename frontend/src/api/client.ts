import axios from 'axios';
const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor to switch to localhost if "localBackendActive" is found in localStorage
api.interceptors.request.use((config) => {
  const isLocal = localStorage.getItem('cortex-local-backend') === 'true';
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
  contradiction_with?: string[];
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  details: Record<string, unknown>;
}

export const chatApi = {
  send: (data: ChatRequest) => api.post<ChatResponse>('/chat', data),
  stream: (data: ChatRequest, onToken: (token: string) => void, onDone: (metadata: any) => void) => {
    const isLocal = localStorage.getItem('cortex-local-backend') === 'true';
    const baseUrl = isLocal ? 'http://127.0.0.1:8000/api' : ((import.meta as any).env.VITE_API_URL || '/api');
    
    return fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.token) onToken(payload.token);
              if (payload.done) onDone(payload);
              if (payload.error) console.error('Streaming error:', payload.error);
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }
    });
  },
  export: async (sessionId: string, userId = 'default') => {
    const isLocal = localStorage.getItem('cortex-local-backend') === 'true';
    const baseUrl = isLocal ? 'http://127.0.0.1:8000/api' : ((import.meta as any).env.VITE_API_URL || '/api');
    const url = `${baseUrl}/chat/export?session_id=${sessionId}&user_id=${userId}`;
    window.open(url, '_blank');
  }
};

export const memoriesApi = {
  list: (userId = 'default', sessionId?: string) => {
    const params = new URLSearchParams({ user_id: userId });
    if (sessionId) params.append('session_id', sessionId);
    return api.get<MemoryData[]>(`/memories?${params.toString()}`);
  },
  get: (id: string) => api.get<MemoryData>(`/memories/${id}`),
  update: (id: string, data: MemoryUpdate) => api.patch<MemoryData>(`/memories/${id}`, data),
  delete: (id: string) => api.delete(`/memories/${id}`),
  merge: (memoryIdA: string, memoryIdB: string, userId = 'default') => 
    api.post<MemoryData>('/memories/merge', { memory_id_a: memoryIdA, memory_id_b: memoryIdB, user_id: userId }),
};

export const modelsApi = {
  list: () => api.get<{ models: OllamaModel[] }>('/models'),
};

export interface UserContext {
  user_id: string;
  user_profile: string;
  updated_at: string | null;
}

export interface ConfigData {
  context_memories: number;
  decay_lambda: number;
  dedup_threshold: number;
  merge_threshold: number;
  deletion_threshold: number;
  retrieval_candidates: number;
  importance_threshold: number;
}

export const contextApi = {
  get: (userId = 'default') =>
    api.get<UserContext>(`/context?user_id=${userId}`),
  save: (userId: string, userProfile: string) =>
    api.post<UserContext>('/context', { user_id: userId, user_profile: userProfile }),
  getHealth: () => api.get('/health'),
  getConfig: () => api.get<ConfigData>('/config'),
  updateConfig: (data: Partial<ConfigData>) => api.patch<ConfigData>('/config', data),
};

export default api;
