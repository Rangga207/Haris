import { generateTicketsCsv, ExportTicketRow } from "@/lib/csv-export";

describe("CSV Export Generator", () => {
  it("formats ticket records into standard CSV with headers", () => {
    const rows: ExportTicketRow[] = [
      {
        ticketNo: "CF-202611-0001",
        status: "RESOLVED",
        priority: "HIGH",
        category: "Electrical",
        building: "ENG-A - Engineering Tower",
        room: "Lab 101",
        channel: "WEB",
        reporterName: "Siti Nurhaliza",
        reporterEmail: "reporter1@campusfix.edu",
        assigneeName: "Agus Pratama",
        isSafetyHazard: false,
        createdAt: "2026-11-20 10:00:00",
        targetDate: "2026-11-22",
        resolvedAt: "2026-11-21 15:30:00",
        closedAt: "",
      },
    ];

    const csv = generateTicketsCsv(rows);
    const lines = csv.split("\r\n");

    expect(lines[0]).toContain("Ticket No,Status,Priority");
    expect(lines[1]).toContain("CF-202611-0001,RESOLVED,HIGH,Electrical");
    expect(lines[1]).toContain("Siti Nurhaliza");
    expect(lines[1]).toContain("NO"); // Safety hazard
  });

  it("escapes fields containing commas and quotes properly", () => {
    const rows: ExportTicketRow[] = [
      {
        ticketNo: "CF-202611-0002",
        status: "SUBMITTED",
        priority: "CRITICAL",
        category: "Plumbing, leaks & water",
        building: 'Building "Tower A"',
        room: "Room 101",
        channel: "WEB",
        reporterName: "Fauzi, Ahmad",
        reporterEmail: "reporter2@campusfix.edu",
        assigneeName: "Unassigned",
        isSafetyHazard: true,
        createdAt: "2026-11-20 10:00:00",
        targetDate: "",
        resolvedAt: "",
        closedAt: "",
      },
    ];

    const csv = generateTicketsCsv(rows);
    expect(csv).toContain('"Plumbing, leaks & water"');
    expect(csv).toContain('"Building ""Tower A"""');
    expect(csv).toContain('"Fauzi, Ahmad"');
    expect(csv).toContain("YES"); // Safety hazard
  });
});
