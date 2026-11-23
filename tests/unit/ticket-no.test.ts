import { formatTicketSequence, generateTicketNumber } from "@/lib/ticket-no";

describe("Ticket Number Generation & Formatting", () => {
  it("formats ticket sequence to CF-YYYYMM-NNNN", () => {
    expect(formatTicketSequence("202611", 1)).toBe("CF-202611-0001");
    expect(formatTicketSequence("202611", 42)).toBe("CF-202611-0042");
    expect(formatTicketSequence("202611", 999)).toBe("CF-202611-0999");
    expect(formatTicketSequence("202611", 1234)).toBe("CF-202611-1234");
  });

  it("handles new month prefix reset cleanly", () => {
    expect(formatTicketSequence("202612", 1)).toBe("CF-202612-0001");
  });

  it("atomically generates ticket number via mock transaction client", async () => {
    const mockTx = {
      ticketMonthlySequence: {
        upsert: jest.fn().mockResolvedValue({
          yearMonth: "202611",
          sequence: 7,
        }),
      },
    };

    const date = new Date("2026-11-23T10:00:00Z");
    const result = await generateTicketNumber(mockTx as any, date);

    expect(result).toBe("CF-202611-0007");
    expect(mockTx.ticketMonthlySequence.upsert).toHaveBeenCalledWith({
      where: { yearMonth: "202611" },
      update: { sequence: { increment: 1 } },
      create: { yearMonth: "202611", sequence: 1 },
    });
  });
});
