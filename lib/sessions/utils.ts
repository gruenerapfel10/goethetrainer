export function sanitizeForFirestore<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    const cleanedArray = value
      .map(item => sanitizeForFirestore(item))
      .filter(item => item !== undefined);
    return cleanedArray as unknown as T;
  }

  if (typeof value === 'object') {
    if (
      typeof (value as any).seconds === 'number' &&
      typeof (value as any).nanoseconds === 'number'
    ) {
      const seconds = Number((value as any).seconds);
      const nanos = Number((value as any).nanoseconds);
      if (Number.isFinite(seconds) && Number.isFinite(nanos)) {
        return new Date(seconds * 1000 + nanos / 1e6) as unknown as T;
      }
      return undefined as unknown as T;
    }

    if (typeof (value as any).toDate === 'function') {
      try {
        return (value as any).toDate() as unknown as T;
      } catch {
        return undefined as unknown as T;
      }
    }

    const clone: Record<string, any> = {};
    Object.entries(value as Record<string, any>).forEach(([key, entryValue]) => {
      const cleanValue = sanitizeForFirestore(entryValue);
      if (cleanValue === undefined) {
        return;
      }
      if (typeof cleanValue === 'object' && cleanValue !== null) {
        const hasSeconds = Object.prototype.hasOwnProperty.call(cleanValue, 'seconds');
        const hasNanos = Object.prototype.hasOwnProperty.call(cleanValue, 'nanoseconds');
        if (hasSeconds && hasNanos) {
          return;
        }
        if (Object.keys(cleanValue).length === 0) {
          return;
        }
      }
      clone[key] = cleanValue;
    });

    if (!Object.keys(clone).length) {
      return undefined as unknown as T;
    }

    return clone as T;
  }

  return value;
}
