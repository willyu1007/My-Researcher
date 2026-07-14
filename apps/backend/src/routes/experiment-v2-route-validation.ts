export function findForbiddenNestedField(
  value: unknown,
  forbiddenFields: ReadonlySet<string>,
): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const field = findForbiddenNestedField(item, forbiddenFields);
      if (field) return field;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  for (const [key, nestedValue] of Object.entries(value)) {
    if (forbiddenFields.has(key)) return key;
    const field = findForbiddenNestedField(nestedValue, forbiddenFields);
    if (field) return field;
  }
  return null;
}
