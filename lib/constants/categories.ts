import { Priority } from "@prisma/client";

export interface CategoryDefinition {
  name: string;
  defaultPriority: Priority;
  safetyEscalation: boolean;
}

export const CAMPUS_CATEGORIES: CategoryDefinition[] = [
  {
    name: "Electrical",
    defaultPriority: Priority.MEDIUM,
    safetyEscalation: true, // Escalate to CRITICAL if safety hazard
  },
  {
    name: "Plumbing and water",
    defaultPriority: Priority.HIGH,
    safetyEscalation: false,
  },
  {
    name: "Air conditioning and ventilation",
    defaultPriority: Priority.MEDIUM,
    safetyEscalation: false,
  },
  {
    name: "Furniture and fixtures",
    defaultPriority: Priority.LOW,
    safetyEscalation: false,
  },
  {
    name: "Building and civil",
    defaultPriority: Priority.MEDIUM,
    safetyEscalation: false,
  },
  {
    name: "Cleanliness and sanitation",
    defaultPriority: Priority.MEDIUM,
    safetyEscalation: false,
  },
  {
    name: "Grounds and outdoor",
    defaultPriority: Priority.LOW,
    safetyEscalation: false,
  },
  {
    name: "Safety equipment",
    defaultPriority: Priority.HIGH,
    safetyEscalation: true, // Escalate to CRITICAL if safety hazard
  },
  {
    name: "Other",
    defaultPriority: Priority.LOW,
    safetyEscalation: false,
  },
];
