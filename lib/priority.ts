import { Priority } from "@prisma/client";
import { CAMPUS_CATEGORIES } from "./constants/categories";

export interface SlaTarget {
  responseDescription: string;
  resolutionDescription: string;
  responseWorkingHours: number;
  resolutionWorkingDays: number;
}

export const SLA_TARGETS: Record<Priority, SlaTarget> = {
  [Priority.CRITICAL]: {
    responseDescription: "30 minutes",
    resolutionDescription: "1 working day",
    responseWorkingHours: 0.5,
    resolutionWorkingDays: 1,
  },
  [Priority.HIGH]: {
    responseDescription: "4 hours",
    resolutionDescription: "2 working days",
    responseWorkingHours: 4,
    resolutionWorkingDays: 2,
  },
  [Priority.MEDIUM]: {
    responseDescription: "1 working day",
    resolutionDescription: "5 working days",
    responseWorkingHours: 8,
    resolutionWorkingDays: 5,
  },
  [Priority.LOW]: {
    responseDescription: "3 working days",
    resolutionDescription: "15 working days",
    responseWorkingHours: 24,
    resolutionWorkingDays: 15,
  },
};

export function calculateSuggestedPriority(
  categoryName: string,
  isSafetyHazard: boolean
): Priority {
  if (isSafetyHazard) {
    return Priority.CRITICAL;
  }

  const category = CAMPUS_CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase()
  );

  return category ? category.defaultPriority : Priority.LOW;
}

/**
 * Calculates a suggested target completion date based on working hours (Mon-Fri 08:00 - 16:00).
 */
export function calculateSuggestedTargetDate(
  priority: Priority,
  startDate: Date = new Date()
): Date {
  const target = SLA_TARGETS[priority];
  const date = new Date(startDate);
  let daysToAdd = target.resolutionWorkingDays;

  while (daysToAdd > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    // 0 is Sunday, 6 is Saturday
    if (day !== 0 && day !== 6) {
      daysToAdd--;
    }
  }

  // Set default target time to end of working day (16:00)
  date.setHours(16, 0, 0, 0);
  return date;
}
