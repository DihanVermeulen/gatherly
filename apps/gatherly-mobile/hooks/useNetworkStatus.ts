import { useState, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Hook for monitoring network connectivity using NetInfo.
 * Returns `true` when connected, `false` when offline, `null` while initializing.
 */
export function useNetworkStatus(): boolean | null {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    return unsubscribe;
  }, []);

  return isConnected;
}
