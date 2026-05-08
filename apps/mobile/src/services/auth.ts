import api, { saveToken, saveRefreshToken, clearTokens } from './api';
import type { AuthResponse } from '../types';

export async function signup(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/signup', {
    email,
    password,
    name,
  });
  await saveToken(data.accessToken);
  await saveRefreshToken(data.refreshToken);
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  await saveToken(data.accessToken);
  await saveRefreshToken(data.refreshToken);
  return data;
}

export async function logout() {
  await clearTokens();
}
