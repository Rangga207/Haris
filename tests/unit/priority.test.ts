import { Priority } from "@prisma/client";
import {
  calculateSuggestedPriority,
  calculateSuggestedTargetDate,
  SLA_TARGETS,
} from "@/lib/priority";

describe("Priority & SLA Calculation Logic", () => {
  describe("calculateSuggestedPriority", () => {
    it("returns default priority for standard categories", () => {
      expect(calculateSuggestedPriority("Electrical", false)).toBe(Priority.MEDIUM);
      expect(calculateSuggestedPriority("Plumbing and water", false)).toBe(Priority.HIGH);
      expect(calculateSuggestedPriority("Air conditioning and ventilation", false)).toBe(Priority.MEDIUM);
      expect(calculateSuggestedPriority("Furniture and fixtures", false)).toBe(Priority.LOW);
      expect(calculateSuggestedPriority("Building and civil", false)).toBe(Priority.MEDIUM);
      expect(calculateSuggestedPriority("Cleanliness and sanitation", false)).toBe(Priority.MEDIUM);
      expect(calculateSuggestedPriority("Grounds and outdoor", false)).toBe(Priority.LOW);
      expect(calculateSuggestedPriority("Safety equipment", false)).toBe(Priority.HIGH);
      expect(calculateSuggestedPriority("Other", false)).toBe(Priority.LOW);
    });

    it("escalates priority to CRITICAL when safety hazard is marked", () => {
      expect(calculateSuggestedPriority("Electrical", true)).toBe(Priority.CRITICAL);
      expect(calculateSuggestedPriority("Furniture and fixtures", true)).toBe(Priority.CRITICAL);
      expect(calculateSuggestedPriority("Plumbing and water", true)).toBe(Priority.CRITICAL);
      expect(calculateSuggestedPriority("Other", true)).toBe(Priority.CRITICAL);
    });

    it("defaults to LOW for unknown categories", () => {
      expect(calculateSuggestedPriority("NonExistentCategory", false)).toBe(Priority.LOW);
    });
  });

  describe("SLA Target Definitions", () => {
    it("defines correct working hour SLA targets", () => {
      expect(SLA_TARGETS[Priority.CRITICAL].resolutionWorkingDays).toBe(1);
      expect(SLA_TARGETS[Priority.HIGH].resolutionWorkingDays).toBe(2);
      expect(SLA_TARGETS[Priority.MEDIUM].resolutionWorkingDays).toBe(5);
      expect(SLA_TARGETS[Priority.LOW].resolutionWorkingDays).toBe(15);
    });
  });

  describe("calculateSuggestedTargetDate", () => {
    it("skips weekends when computing target completion date", () => {
      // Friday Nov 20, 2026
      const friday = new Date("2026-11-20T10:00:00Z");
      // 1 working day for CRITICAL -> should be Monday Nov 23
      const target = calculateSuggestedTargetDate(Priority.CRITICAL, friday);
      expect(target.getDay()).not.toBe(0); // Not Sunday
      expect(target.getDay()).not.toBe(6); // Not Saturday
      expect(target.getHours()).toBe(16); // 16:00 end of working day
    });
  });
});
