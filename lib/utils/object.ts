export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function deepMerge<T extends Record<string, unknown>, S extends Record<string, unknown>>(
  target: T,
  ...sources: S[]
): T & S {
  sources.forEach(source => {
    if (!isPlainObject(source)) {
      return;
    }

    Object.entries(source).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        (target as any)[key] = Array.isArray((target as any)[key])
          ? [...(target as any)[key], ...value]
          : [...value];
        return;
      }

      if (isPlainObject(value)) {
        const existing = (target as any)[key];
        (target as any)[key] = deepMerge(isPlainObject(existing) ? { ...existing } : {}, value);
        return;
      }

      (target as any)[key] = value;
    });
  });

  return target as T & S;
}

