import apiClient from "./client";

export type DecipherResult = {
  person: string;
  receivers: string[];
};

export const decipherApi = {
  // Decipher a secret code
  decipher: async (code: string): Promise<DecipherResult> => {
    const response = await apiClient.post("/api/decipher", { code });
    return response.data;
  },
};

export default decipherApi;
