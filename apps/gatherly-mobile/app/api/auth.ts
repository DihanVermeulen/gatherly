import apiClient from "./client";

export interface User {
  id: number;
  email: string;
  name: string;
  // Participant-only fields (present when signed in via magic link)
  participantId?: number;
  eventId?: number;
  eventName?: string;
  // Full-account-only field (absent for magic-link participants)
  onboardingComplete?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface MagicLinkPreview {
  eventId: number;
  eventName: string;
  inviteCode: string;
  organizerName: string | null;
  participantCount: number;
  eventDate: string | null;
  inviteEmail: string | null;
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
    const response = await apiClient.post<AuthResponse>(
      "/api/auth/refresh",
      refreshToken ? { refreshToken } : undefined,
    );
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/auth/logout");
  },

  async lookupMagicLink(token: string): Promise<MagicLinkPreview> {
    const response = await apiClient.post<MagicLinkPreview>(
      "/api/auth/magic-link/lookup",
      { token },
    );
    return response.data;
  },

  async joinEventViaMagicLink(
    token: string,
  ): Promise<{
    eventId: number;
    eventName: string;
    participantId: number;
    alreadyJoined?: boolean;
  }> {
    const response = await apiClient.post("/api/auth/magic-link/join", {
      token,
    });
    return response.data;
  },

  async redeemMagicLink(
    token: string,
    email?: string,
    participantName?: string,
  ): Promise<AuthResponse> {
    const response = await apiClient.post<{
      accessToken: string;
      user:
        | {
            // User-scoped response (existing account linked to invite)
            id: number;
            email: string;
            name: string;
            eventId: number;
            eventName: string;
            onboardingComplete?: boolean;
          }
        | {
            // Participant-scoped response (no account, magic-link only)
            participantId: number;
            eventId: number;
            participantName: string;
            eventName: string;
          };
    }>("/api/auth/magic-link/redeem", {
      token,
      ...(email ? { email } : {}),
      ...(participantName ? { participantName } : {}),
    });

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
          eventId: userData.eventId,
          eventName: userData.eventName,
          ...(userData.onboardingComplete !== undefined
            ? { onboardingComplete: userData.onboardingComplete }
            : {}),
        },
      };
    }

    // Participant-scoped response (existing behavior)
    const {
      participantId,
      participantName: storedParticipantName,
      eventId,
      eventName,
    } = userData as {
      participantId: number;
      eventId: number;
      participantName: string;
      eventName: string;
    };
    return {
      accessToken,
      user: {
        id: participantId,
        email: "",
        name: participantName ?? storedParticipantName,
        participantId,
        eventId,
        eventName,
      },
    };
  },
};
