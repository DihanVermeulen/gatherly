import apiClient from "./client";

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  eventsOrganized: number;
  bio: string | null;
  interests: string[];
  avatarUrl: string | null;
  onboardingComplete: boolean;
}

export const usersApi = {
  getMe: async (): Promise<UserProfile> => {
    const response = await apiClient.get("/api/users/me");
    return response.data;
  },

  updateMe: async (patch: {
    name?: string;
    bio?: string | null;
    interests?: string[];
    avatarUrl?: string | null;
    onboardingComplete?: true;
  }): Promise<UserProfile> => {
    const response = await apiClient.put("/api/users/me", patch);
    return response.data;
  },
};

export default usersApi;
