function normaliseFirestoreTimestamp(value: any): any {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (typeof (value as any).toDate === 'function') {
    try {
      return (value as any).toDate();
    } catch {
      // fall through
    }
  }

  if (
    typeof (value as any).seconds === 'number' &&
    typeof (value as any).nanoseconds === 'number'
  ) {
    const seconds = Number((value as any).seconds);
    const nanoseconds = Number((value as any).nanoseconds);
    if (!Number.isNaN(seconds) && !Number.isNaN(nanoseconds)) {
      return new Date(seconds * 1000 + nanoseconds / 1e6);
    }
  }

  return value;
}

export function sanitizeForFirestore<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeForFirestore(item)) as unknown as T;
  }

  if (typeof value === 'object') {
    if (typeof (value as any).toDate === 'function') {
      try {
        return (value as any).toDate() as unknown as T;
      } catch {
        return undefined as unknown as T;
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(value, 'seconds') ||
      Object.prototype.hasOwnProperty.call(value, 'nanoseconds')
    ) {
      return undefined as unknown as T;
    }

    const clone: Record<string, any> = {};
    Object.entries(value as Record<string, any>).forEach(([key, entryValue]) => {
      if (entryValue === undefined) {
        return;
      }
      const cleanValue = sanitizeForFirestore(entryValue);
      if (cleanValue !== undefined) {
        clone[key] = cleanValue;
      }
    });
    return clone as T;
  }

  return value;
}
