import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'hasOnboarded';

/**
 * Module-level cache so that, after the first read, every consumer resolves the
 * onboarding state synchronously — avoids a redirect flash between the root
 * layout's gate and the home screen.
 */
let cached: boolean | undefined;

/** Read once and memoize. */
export async function loadOnboardingState(): Promise<boolean> {
  if (cached !== undefined) return cached;
  cached = (await AsyncStorage.getItem(KEY)) === 'true';
  return cached;
}

export interface UseOnboardingResult {
  /** Whether the user has finished onboarding. */
  hasOnboarded: boolean;
  /** True until the persisted flag has been read. */
  isLoading: boolean;
  /** Persist completion and flip the flag. */
  complete: () => Promise<void>;
  /** Clear the persisted flag — for testing the onboarding flow again. */
  reset: () => Promise<void>;
}

export function useOnboarding(): UseOnboardingResult {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | undefined>(cached);

  useEffect(() => {
    if (hasOnboarded !== undefined) return;
    let active = true;
    loadOnboardingState().then((value) => {
      if (active) setHasOnboarded(value);
    });
    return () => {
      active = false;
    };
  }, [hasOnboarded]);

  const complete = useCallback(async () => {
    cached = true;
    setHasOnboarded(true);
    await AsyncStorage.setItem(KEY, 'true');
  }, []);

  const reset = useCallback(async () => {
    cached = false;
    setHasOnboarded(false);
    await AsyncStorage.removeItem(KEY);
  }, []);

  return {
    hasOnboarded: hasOnboarded ?? false,
    isLoading: hasOnboarded === undefined,
    complete,
    reset,
  };
}
