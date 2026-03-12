import apiClient from "./client";

export interface User {
  id: number;
  email: string;
  name: string;
  role: "organizer" | "participant";
  // Participant-only fields (present when signed in via magic link)
  participantId?: number;
  eventId?: number;
  eventName?: string;
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

  async redeemMagicLink(token: string): Promise<AuthResponse> {
    const response = await apiClient.post<{
      accessToken: string;
      user:
        | {
            // User-scoped response (existing account linked to invite)
            id: number;
            email: string;
            name: string;
            role: "organizer" | "participant";
            eventId: number;
            eventName: string;
          }
        | {
            // Participant-scoped response (no account, magic-link only)
            participantId: number;
            eventId: number;
            participantName: string;
            eventName: string;
            role: "participant";
          };
    }>("/api/auth/magic-link/redeem", { token });

    const { accessToken } = response.data;
    const userData = response.data.user;

    // Detect user-scoped response: has id but no participantId
    if ("id" in userData && !("participantId" in userData)) {
      return {
        accessToken,
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          eventId: userData.eventId,
          eventName: userData.eventName,
        },
      };
    }

    // Participant-scoped response (existing behavior)
    const { participantId, participantName, eventId, eventName, role } =
      userData as {
        participantId: number;
        eventId: number;
        participantName: string;
        eventName: string;
        role: "participant";
      };
    return {
      accessToken,
      user: {
        id: participantId,
        email: "",
        name: participantName,
        role,
        participantId,
        eventId,
        eventName,
      },
    };
  },
};
