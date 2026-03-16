import apiClient from "./client";

export interface User {
  id: number;
  email: string;
  name: string;
  participantId?: number;
  eventId?: number;
  eventName?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

interface MagicLinkUser {
  participantId: number;
  eventId: number;
  participantName: string;
  eventName: string;
}

interface MagicLinkResponse {
  accessToken: string;
  user: MagicLinkUser;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/api/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/api/auth/register", {
      email,
      password,
      name,
    });
    return response.data;
  },

  async refresh(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/api/auth/refresh");
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/auth/logout");
  },

  async redeemMagicLink(token: string): Promise<AuthResponse> {
    const response = await apiClient.post<MagicLinkResponse>(
      "/api/auth/magic-link/redeem",
      { token },
    );
    const { accessToken, user } = response.data;
    return {
      accessToken,
      user: {
        id: user.participantId,
        name: user.participantName,
        email: "",
        participantId: user.participantId,
        eventId: user.eventId,
        eventName: user.eventName,
      },
    };
  },
};
