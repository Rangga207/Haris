export interface ExportTicketRow {
  ticketNo: string;
  status: string;
  priority: string;
  category: string;
  building: string;
  room: string;
  channel: string;
  reporterName: string;
  reporterEmail: string;
  assigneeName: string;
  isSafetyHazard: boolean;
  createdAt: string;
  targetDate: string;
  resolvedAt: string;
  closedAt: string;
}

function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return "";
  const stringValue = String(field);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function generateTicketsCsv(rows: ExportTicketRow[]): string {
  const headers = [
    "Ticket No",
    "Status",
    "Priority",
    "Category",
    "Building",
    "Room",
    "Channel",
    "Reporter Name",
    "Reporter Email",
    "Assignee Name",
    "Safety Hazard",
    "Created At",
    "Target Completion Date",
    "Resolved At",
    "Closed At",
  ];

  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) =>
    [
      row.ticketNo,
      row.status,
      row.priority,
      row.category,
      row.building,
      row.room,
      row.channel,
      row.reporterName,
      row.reporterEmail,
      row.assigneeName,
      row.isSafetyHazard ? "YES" : "NO",
      row.createdAt,
      row.targetDate,
      row.resolvedAt,
      row.closedAt,
    ]
      .map(escapeCsvField)
      .join(",")
  );

  return [headerLine, ...dataLines].join("\r\n");
}
