import {
  PrismaClient,
  Role,
  Priority,
  Channel,
  TicketStatus,
  AttachmentKind,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { CAMPUS_CATEGORIES } from "../lib/constants/categories";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting CampusFix database seeding...");

  // Clear existing data in reverse relation order
  await prisma.feedback.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.ticketAssignment.deleteMany();
  await prisma.ticketStatusHistory.deleteMany();
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.room.deleteMany();
  await prisma.building.deleteMany();
  await prisma.category.deleteMany();
  await prisma.slaPolicy.deleteMany();
  await prisma.ticketMonthlySequence.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Seed Users
  console.log("👤 Seeding users...");
  const admin = await prisma.user.create({
    data: {
      name: "Budi Santoso (Admin)",
      email: "admin@campusfix.edu",
      passwordHash,
      phone: "+62 812-3456-7890",
      role: Role.ADMIN,
    },
  });

  const unitHead = await prisma.user.create({
    data: {
      name: "Dr. Ir. Hendra Wijaya",
      email: "unithead@campusfix.edu",
      passwordHash,
      phone: "+62 811-9876-5432",
      role: Role.UNIT_HEAD,
    },
  });

  const techElectrical = await prisma.user.create({
    data: {
      name: "Agus Pratama",
      email: "tech.electrical@campusfix.edu",
      passwordHash,
      phone: "+62 813-1122-3344",
      role: Role.TECHNICIAN,
      specialization: "electrical",
    },
  });

  const techPlumbing = await prisma.user.create({
    data: {
      name: "Rian Setiawan",
      email: "tech.plumbing@campusfix.edu",
      passwordHash,
      phone: "+62 813-2233-4455",
      role: Role.TECHNICIAN,
      specialization: "plumbing",
    },
  });

  const techHvac = await prisma.user.create({
    data: {
      name: "Dedi Kusuma",
      email: "tech.hvac@campusfix.edu",
      passwordHash,
      phone: "+62 813-3344-5566",
      role: Role.TECHNICIAN,
      specialization: "HVAC",
    },
  });

  const reporters = await Promise.all([
    prisma.user.create({
      data: {
        name: "Siti Nurhaliza (Student)",
        email: "reporter1@campusfix.edu",
        passwordHash,
        phone: "+62 856-1111-2222",
        role: Role.REPORTER,
      },
    }),
    prisma.user.create({
      data: {
        name: "Ahmad Fauzi (Lecturer)",
        email: "reporter2@campusfix.edu",
        passwordHash,
        phone: "+62 856-3333-4444",
        role: Role.REPORTER,
      },
    }),
    prisma.user.create({
      data: {
        name: "Dewi Lestari (Staff)",
        email: "reporter3@campusfix.edu",
        passwordHash,
        phone: "+62 856-5555-6666",
        role: Role.REPORTER,
      },
    }),
  ]);

  // 2. Seed Buildings & Rooms (5 buildings, 5-8 rooms each)
  console.log("🏢 Seeding buildings and rooms...");
  const buildingsData = [
    {
      code: "ENG-A",
      name: "Engineering Complex Tower A",
      rooms: [
        { name: "Lab Electrical 101", floor: "1st Floor" },
        { name: "Lab Robotics 102", floor: "1st Floor" },
        { name: "Lecture Hall A-201", floor: "2nd Floor" },
        { name: "Lecture Hall A-202", floor: "2nd Floor" },
        { name: "Faculty Lounge 301", floor: "3rd Floor" },
        { name: "Server Room 305", floor: "3rd Floor" },
        { name: "Restroom Male 2F", floor: "2nd Floor" },
      ],
    },
    {
      code: "SCI-B",
      name: "Science & Mathematics Center",
      rooms: [
        { name: "Chemistry Lab 105", floor: "1st Floor" },
        { name: "Physics Lab 106", floor: "1st Floor" },
        { name: "Biology Greenhouse", floor: "Ground Floor" },
        { name: "Auditorium B-201", floor: "2nd Floor" },
        { name: "Dean's Office 301", floor: "3rd Floor" },
        { name: "Restroom Female 1F", floor: "1st Floor" },
      ],
    },
    {
      code: "STU-C",
      name: "Student Activity Center",
      rooms: [
        { name: "Student Council Room 101", floor: "1st Floor" },
        { name: "Cafeteria Main Hall", floor: "1st Floor" },
        { name: "Indoor Gymnasium", floor: "1st Floor" },
        { name: "Music Studio 203", floor: "2nd Floor" },
        { name: "Co-working Space 205", floor: "2nd Floor" },
        { name: "Restroom 1F North", floor: "1st Floor" },
      ],
    },
    {
      code: "ADM-D",
      name: "Rectorate & Administration",
      rooms: [
        { name: "Rector Office 401", floor: "4th Floor" },
        { name: "HR Service Desk 102", floor: "1st Floor" },
        { name: "Finance Counter 103", floor: "1st Floor" },
        { name: "Main Conference Room", floor: "2nd Floor" },
        { name: "Facilities Unit Office", floor: "Ground Floor" },
      ],
    },
    {
      code: "LIB-E",
      name: "Central Campus Library",
      rooms: [
        { name: "Quiet Study Area 2F", floor: "2nd Floor" },
        { name: "Digital Multimedia Lab", floor: "1st Floor" },
        { name: "Periodicals Archive", floor: "Basement" },
        { name: "Discussion Room A", floor: "3rd Floor" },
        { name: "Discussion Room B", floor: "3rd Floor" },
        { name: "Book Repository 1F", floor: "1st Floor" },
      ],
    },
  ];

  const createdBuildings: any[] = [];
  const allRooms: any[] = [];

  for (const b of buildingsData) {
    const building = await prisma.building.create({
      data: {
        code: b.code,
        name: b.name,
      },
    });
    createdBuildings.push(building);

    for (const r of b.rooms) {
      const room = await prisma.room.create({
        data: {
          buildingId: building.id,
          name: r.name,
          floor: r.floor,
        },
      });
      allRooms.push(room);
    }
  }

  // 3. Seed Categories
  console.log("🏷️ Seeding categories...");
  const createdCategories: any[] = [];
  for (const cat of CAMPUS_CATEGORIES) {
    const category = await prisma.category.create({
      data: {
        name: cat.name,
        defaultPriority: cat.defaultPriority,
      },
    });
    createdCategories.push(category);
  }

  // 4. Seed SLA Policies
  console.log("⏱️ Seeding SLA policies...");
  await prisma.slaPolicy.createMany({
    data: [
      { priority: Priority.CRITICAL, responseHours: 1, resolutionHours: 8 },
      { priority: Priority.HIGH, responseHours: 4, resolutionHours: 16 },
      { priority: Priority.MEDIUM, responseHours: 8, resolutionHours: 40 },
      { priority: Priority.LOW, responseHours: 24, resolutionHours: 120 },
    ],
  });

  // 5. Seed ~25 Tickets across all statuses
  console.log("🎫 Seeding ~25 sample tickets...");
  const yearMonth = "202611";
  await prisma.ticketMonthlySequence.create({
    data: {
      yearMonth,
      sequence: 25,
    },
  });

  const getCat = (name: string) => createdCategories.find((c) => c.name.includes(name)) || createdCategories[0];
  const getRoom = (name: string) => allRooms.find((r) => r.name.includes(name)) || allRooms[0];
  const getBuildingOfRoom = (room: any) => createdBuildings.find((b) => b.id === room.buildingId)!;

  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const sampleTickets: any[] = [
    // 1. SUBMITTED - Normal
    {
      seq: 1,
      reporter: reporters[0],
      category: getCat("Air conditioning"),
      room: getRoom("Lab Electrical 101"),
      description: "AC unit in Electrical Lab 101 is blowing warm air only. Temperature reaching 29C.",
      priority: Priority.MEDIUM,
      status: TicketStatus.SUBMITTED,
      channel: Channel.WEB,
      isSafetyHazard: false,
      createdAt: daysAgo(1),
    },
    // 2. SUBMITTED - Urgent Safety Hazard
    {
      seq: 2,
      reporter: reporters[1],
      category: getCat("Electrical"),
      room: getRoom("Lecture Hall A-201"),
      description: "Live electrical spark and smell of burnt plastic from wall outlet near podium.",
      priority: Priority.CRITICAL,
      status: TicketStatus.SUBMITTED,
      channel: Channel.WEB,
      isSafetyHazard: true,
      createdAt: daysAgo(0.5),
    },
    // 3. NEEDS_INFO
    {
      seq: 3,
      reporter: reporters[2],
      category: getCat("Plumbing"),
      room: getRoom("Restroom Male 2F"),
      description: "Water tap won't shut off completely.",
      priority: Priority.HIGH,
      status: TicketStatus.NEEDS_INFO,
      channel: Channel.WHATSAPP,
      isSafetyHazard: false,
      createdAt: daysAgo(3),
      adminNote: "Which sink basin is leaking? North or South counter?",
    },
    // 4. TRIAGED
    {
      seq: 4,
      reporter: reporters[0],
      category: getCat("Furniture"),
      room: getRoom("Lecture Hall A-202"),
      description: "Row 3 student desk chair hinge broken and unstable.",
      priority: Priority.LOW,
      status: TicketStatus.TRIAGED,
      channel: Channel.WEB,
      isSafetyHazard: false,
      createdAt: daysAgo(2),
    },
    // 5. ASSIGNED - On Track
    {
      seq: 5,
      reporter: reporters[1],
      category: getCat("Electrical"),
      room: getRoom("Chemistry Lab 105"),
      description: "Overhead fluorescent light flickering heavily, causing eye strain.",
      priority: Priority.MEDIUM,
      status: TicketStatus.ASSIGNED,
      assignee: techElectrical,
      targetDate: daysFromNow(2),
      channel: Channel.WEB,
      isSafetyHazard: false,
      createdAt: daysAgo(2),
    },
    // 6. ASSIGNED - OVERDUE!
    {
      seq: 6,
      reporter: reporters[2],
      category: getCat("Plumbing"),
      room: getRoom("Restroom Female 1F"),
      description: "Flush valve leaking onto floor, pooling water near entry.",
      priority: Priority.HIGH,
      status: TicketStatus.ASSIGNED,
      assignee: techPlumbing,
      targetDate: daysAgo(1), // Overdue!
      channel: Channel.WALK_IN,
      isSafetyHazard: false,
      createdAt: daysAgo(4),
    },
    // 7. IN_PROGRESS - On Track
    {
      seq: 7,
      reporter: reporters[0],
      category: getCat("Air conditioning"),
      room: getRoom("Auditorium B-201"),
      description: "Central AC cooling duct whistling loudly during seminar hours.",
      priority: Priority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      assignee: techHvac,
      targetDate: daysFromNow(3),
      channel: Channel.WEB,
      isSafetyHazard: false,
      createdAt: daysAgo(2),
    },
    // 8. IN_PROGRESS - OVERDUE!
    {
      seq: 8,
      reporter: reporters[1],
      category: getCat("Electrical"),
      room: getRoom("Server Room 305"),
      description: "Secondary UPS circuit breaker tripping intermittently.",
      priority: Priority.CRITICAL,
      status: TicketStatus.IN_PROGRESS,
      assignee: techElectrical,
      targetDate: daysAgo(0.5), // Overdue!
      channel: Channel.PHONE,
      isSafetyHazard: true,
      createdAt: daysAgo(2),
    },
    // 9. ON_HOLD - Waiting for parts
    {
      seq: 9,
      reporter: reporters[2],
      category: getCat("Plumbing"),
      room: getRoom("Cafeteria Main Hall"),
      description: "Grease trap drain pipe cracked under main wash sink.",
      priority: Priority.HIGH,
      status: TicketStatus.ON_HOLD,
      assignee: techPlumbing,
      holdReason: "Waiting for replacement 3-inch PVC elbow joint from external supplier.",
      targetDate: daysFromNow(4),
      channel: Channel.WEB,
      isSafetyHazard: false,
      createdAt: daysAgo(5),
    },
    // 10. RESOLVED - Awaiting confirmation
    {
      seq: 10,
      reporter: reporters[0],
      category: getCat("Furniture"),
      room: getRoom("Quiet Study Area 2F"),
      description: "Study carrel partition loose and tilting.",
      priority: Priority.LOW,
      status: TicketStatus.RESOLVED,
      assignee: techElectrical,
      resolvedAt: daysAgo(1),
      targetDate: daysFromNow(1),
      channel: Channel.WEB,
      isSafetyHazard: false,
      createdAt: daysAgo(3),
    },
    // 11. CLOSED - Successfully resolved and confirmed
    {
      seq: 11,
      reporter: reporters[1],
      category: getCat("Cleanliness"),
      room: getRoom("Indoor Gymnasium"),
      description: "Spilled sports drink creating sticky residue on basketball court.",
      priority: Priority.MEDIUM,
      status: TicketStatus.CLOSED,
      assignee: techElectrical,
      resolvedAt: daysAgo(5),
      closedAt: daysAgo(4),
      channel: Channel.WEB,
      isSafetyHazard: false,
      createdAt: daysAgo(6),
    },
    // 12. REOPENED - Issue recurred
    {
      seq: 12,
      reporter: reporters[2],
      category: getCat("Air conditioning"),
      room: getRoom("Dean's Office 301"),
      description: "AC condensate water dripping onto carpet again after initial fix.",
      priority: Priority.HIGH,
      status: TicketStatus.REOPENED,
      channel: Channel.WEB,
      isSafetyHazard: false,
      createdAt: daysAgo(4),
    },
    // 13. REJECTED - Out of facilities scope
    {
      seq: 13,
      reporter: reporters[0],
      category: getCat("Other"),
      room: getRoom("Student Council Room 101"),
      description: "Requesting facilities to purchase personal ergonomic gaming mouse for council president.",
      priority: Priority.LOW,
      status: TicketStatus.REJECTED,
      channel: Channel.WEB,
      isSafetyHazard: false,
      createdAt: daysAgo(3),
    },
    // 14. MERGED - Duplicate report
    {
      seq: 14,
      reporter: reporters[1],
      category: getCat("Plumbing"),
      room: getRoom("Restroom Male 2F"),
      description: "Water tap dripping constantly on second floor restroom.",
      priority: Priority.HIGH,
      status: TicketStatus.MERGED,
      channel: Channel.WHATSAPP,
      isSafetyHazard: false,
      createdAt: daysAgo(2),
    },
    // 15. CANCELLED - Cancelled by reporter
    {
      seq: 15,
      reporter: reporters[0],
      category: getCat("Furniture"),
      room: getRoom("Co-working Space 205"),
      description: "Whiteboard marker tray detached. (Actually found markers were just loose, cancelled).",
      priority: Priority.LOW,
      status: TicketStatus.CANCELLED,
      channel: Channel.WEB,
      isSafetyHazard: false,
      createdAt: daysAgo(1),
    },
  ];

  // Generate additional tickets up to 25 to populate all priority and building combinations
  for (let i = 16; i <= 25; i++) {
    const reporter = reporters[i % reporters.length];
    const category = createdCategories[i % createdCategories.length];
    const room = allRooms[i % allRooms.length];
    const statuses: TicketStatus[] = [
      TicketStatus.SUBMITTED,
      TicketStatus.ASSIGNED,
      TicketStatus.IN_PROGRESS,
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ];
    const status = statuses[i % statuses.length];
    const isOverdueItem = i % 5 === 0;

    sampleTickets.push({
      seq: i,
      reporter,
      category,
      room,
      description: `Facility inspection and maintenance request #${i}: Check standard fittings and operation in ${room.name}.`,
      priority: i % 4 === 0 ? Priority.CRITICAL : i % 3 === 0 ? Priority.HIGH : Priority.MEDIUM,
      status,
      assignee: status !== TicketStatus.SUBMITTED ? techPlumbing : undefined,
      targetDate: isOverdueItem ? daysAgo(2) : daysFromNow(3),
      channel: i % 2 === 0 ? Channel.WEB : Channel.WALK_IN,
      isSafetyHazard: i % 4 === 0,
      createdAt: daysAgo(i % 7 + 1),
    });
  }

  for (const st of sampleTickets) {
    const ticketNo = `CF-${yearMonth}-${String(st.seq).padStart(4, "0")}`;
    const building = getBuildingOfRoom(st.room);

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo,
        reporterId: st.reporter.id,
        createdById: st.reporter.id,
        channel: st.channel,
        buildingId: building.id,
        roomId: st.room.id,
        categoryId: st.category.id,
        description: st.description,
        isSafetyHazard: st.isSafetyHazard,
        priority: st.priority,
        status: st.status,
        assigneeId: (st as any).assignee?.id,
        targetDate: (st as any).targetDate,
        holdReason: (st as any).holdReason,
        resolvedAt: (st as any).resolvedAt,
        closedAt: (st as any).closedAt,
        createdAt: st.createdAt,
      },
    });

    // Add initial status history row
    await prisma.ticketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        fromStatus: null,
        toStatus: TicketStatus.SUBMITTED,
        changedById: st.reporter.id,
        note: "Initial ticket submitted via portal",
        createdAt: st.createdAt,
      },
    });

    // If ticket advanced past SUBMITTED, add history
    if (st.status !== TicketStatus.SUBMITTED) {
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          fromStatus: TicketStatus.SUBMITTED,
          toStatus: st.status,
          changedById: (st as any).assignee ? (st as any).assignee.id : admin.id,
          note: `Ticket moved to ${st.status}`,
          createdAt: new Date(st.createdAt.getTime() + 1000 * 60 * 30),
        },
      });
    }

    // Add assignment history if assigned
    if ((st as any).assignee) {
      await prisma.ticketAssignment.create({
        data: {
          ticketId: ticket.id,
          technicianId: (st as any).assignee.id,
          assignedById: admin.id,
          assignedAt: new Date(st.createdAt.getTime() + 1000 * 60 * 15),
        },
      });
    }
  }

  console.log("✅ Seed completed successfully!");
  console.log("-----------------------------------------");
  console.log("Demo Credentials (all password: Password123!)");
  console.log("Admin:      admin@campusfix.edu");
  console.log("Unit Head:  unithead@campusfix.edu");
  console.log("Technicians:");
  console.log("  Electrical: tech.electrical@campusfix.edu");
  console.log("  Plumbing:   tech.plumbing@campusfix.edu");
  console.log("  HVAC:       tech.hvac@campusfix.edu");
  console.log("Reporters:");
  console.log("  Student:    reporter1@campusfix.edu");
  console.log("  Lecturer:   reporter2@campusfix.edu");
  console.log("  Staff:      reporter3@campusfix.edu");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
