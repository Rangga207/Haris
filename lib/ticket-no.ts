import { Prisma } from "@prisma/client";

/**
 * Generates an atomic monthly ticket number inside a transaction.
 * Format: CF-YYYYMM-NNNN (e.g. CF-202611-0001)
 */
export async function generateTicketNumber(
  tx: Prisma.TransactionClient,
  date: Date = new Date()
): Promise<string> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const yearMonth = `${year}${month}`;

  const counter = await tx.ticketMonthlySequence.upsert({
    where: { yearMonth },
    update: { sequence: { increment: 1 } },
    create: { yearMonth, sequence: 1 },
  });

  const paddedSequence = String(counter.sequence).padStart(4, "0");
  return `CF-${yearMonth}-${paddedSequence}`;
}

export function formatTicketSequence(yearMonth: string, sequence: number): string {
  const padded = String(sequence).padStart(4, "0");
  return `CF-${yearMonth}-${padded}`;
}
