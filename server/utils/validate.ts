export interface ValidationError {
  field: string;
  message: string;
}

export function validateString(
  value: unknown,
  field: string,
  { required = true, maxLength = 500 }: { required?: boolean; maxLength?: number } = {}
): ValidationError | null {
  if (value === undefined || value === null || value === '') {
    if (required) return { field, message: `${field} is required` };
    return null;
  }
  if (typeof value !== 'string') return { field, message: `${field} must be a string` };
  if (value.trim().length === 0 && required) return { field, message: `${field} cannot be blank` };
  if (value.length > maxLength) return { field, message: `${field} must be ${maxLength} characters or fewer` };
  return null;
}

export function validateAmount(value: unknown, field = 'amount'): ValidationError | null {
  if (value === undefined || value === null) return { field, message: `${field} is required` };
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || !isFinite(num)) return { field, message: `${field} must be a valid number` };
  if (num < 0) return { field, message: `${field} cannot be negative` };
  return null;
}

export function validateDate(value: unknown, field = 'date'): ValidationError | null {
  if (!value) return { field, message: `${field} is required` };
  const d = new Date(value as string);
  if (isNaN(d.getTime())) return { field, message: `${field} must be a valid date` };
  return null;
}

export function validateEnum(
  value: unknown,
  field: string,
  allowed: string[]
): ValidationError | null {
  if (!value) return { field, message: `${field} is required` };
  if (!allowed.includes(value as string)) {
    return { field, message: `${field} must be one of: ${allowed.join(', ')}` };
  }
  return null;
}

export function validateId(value: unknown, field = 'id'): ValidationError | null {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return { field, message: `${field} is required` };
  }
  return null;
}

export function collectErrors(...errors: (ValidationError | null)[]): ValidationError[] {
  return errors.filter((e): e is ValidationError => e !== null);
}
