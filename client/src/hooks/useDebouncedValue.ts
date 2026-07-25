/**
 * Returns a copy of `value` that only updates after it has stayed unchanged
 * for `delayMs`. Used to keep the leads search from firing an API request on
 * every keystroke - the fetch effect depends on the debounced value instead.
 */
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
