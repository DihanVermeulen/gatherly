import apiClient from "./client";

export interface User {
  id: number;
  email: string;
  name: string;
  role: "organizer" | "participant";
}

export interface AuthResponse {
  accessToken: string;
  user: User;
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

  async refresh(refreshToken?: string): Promise<AuthResponse> {
    console.log("Refreshing token...");
    console.log(process.env.EXPO_PUBLIC_API_URL);
    const response = await apiClient.post<AuthResponse>(
      "/api/auth/refresh",
      refreshToken ? { refreshToken } : undefined,
    );
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/auth/logout");
  },
};
