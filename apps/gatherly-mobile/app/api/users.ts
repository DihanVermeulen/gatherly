import apiClient from "./client";

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  eventsOrganized: number;
}

export const usersApi = {
  getMe: async (): Promise<UserProfile> => {
    const response = await apiClient.get("/api/users/me");
    return response.data;
  },

  updateMe: async (name: string): Promise<{ id: number; email: string; name: string; role: string }> => {
    const response = await apiClient.put("/api/users/me", { name });
    return response.data;
  },
};

export default usersApi;
