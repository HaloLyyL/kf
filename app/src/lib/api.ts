const host = window.location.hostname;
const BASE_URL = `http://${host}:3003`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export interface RegisterPayload {
  username: string;
  displayName: string;
  password: string;
  role: 'user' | 'agent';
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    username: string;
    displayName: string;
    role: string;
    avatar?: string | null;
  };
  error?: string;
}

export interface ProfilePayload {
  username: string;
  displayName?: string;
  avatar?: string | null;
}

export interface AgentInfo {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
  currentSessions: number;
}

export const api = {
  getVisitorToken: (turnstileToken?: string) =>
    request<{ success: boolean; token: string; expiresAt: number }>('/api/visitor/token', {
      method: 'POST',
      body: JSON.stringify({ turnstileToken }),
    }),

  register: (payload: RegisterPayload) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAgents: () => request<AgentInfo[]>('/api/agents'),

  updateProfile: (payload: ProfilePayload) =>
    request<AuthResponse>('/api/agents/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
