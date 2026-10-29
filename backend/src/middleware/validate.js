import { AppError } from './errorHandler.js';

export const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const VALID_STATUSES = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved'];
export const VALID_ENTRY_TYPES = ['reply', 'note'];

export function parsePositiveInt(val, fieldName = 'id') {
  const num = Number(val);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(`Invalid ${fieldName}: must be a positive integer`, 400);
  }
  return num;
}
