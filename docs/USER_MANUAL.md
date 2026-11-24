# CampusFix — Official User & Operational Manual

Welcome to **CampusFix**, the campus-wide Facility Complaint and Service Request System designed for the Campus Facilities Unit. This document outlines operational protocols, role capabilities, and lifecycle workflows.

---

## 1. System Overview

CampusFix replaces ad-hoc WhatsApp, verbal, and paper reports with an audited, transaction-safe service ticketing lifecycle. Every facility report receives:
- A unique monthly tracking sequence: `CF-YYYYMM-NNNN`.
- Transparent status and SLA priority level.
- Single technician ownership with complete assignment and reassignment history.
- An append-only historical audit trail.

---

## 2. Roles & Access Matrix

| Role | Scope | Default Home | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **REPORTER** (Student, Lecturer, Staff) | Own Tickets Only | `/requests` | Submit issues, provide photos, respond to questions, verify repairs, rate service. |
| **ADMIN** (Facilities Dispatcher) | System-Wide | `/inbox` | Triage complaints, confirm priorities, assign technicians, merge duplicates, manage master data. |
| **TECHNICIAN** (Maintenance Crews) | Assigned Jobs Only | `/jobs` | Execute field repairs, log hold reasons, record completion notes, upload after-repair photos. |
| **UNIT_HEAD** (Director / Facilities Head) | Read-Only System-Wide | `/dashboard` | Monitor operational KPIs, analyze SLA compliance, inspect overdue backlogs, export reports. |

---

## 3. Reporter Guide

### 3.1 Submitting a Complaint
1. Navigate to **New Request** (`/requests/new`).
2. Select your **Building**; the **Room** dropdown dynamically filters available locations in that facility.
3. Choose the **Category** (e.g. Electrical, Plumbing, HVAC, Civil).
   - The form will calculate and display the **Suggested Priority** based on university SLA policies.
4. **Safety Hazard Toggle**: If there is an immediate danger (exposed high-voltage wires, gas smell, ceiling collapse risk), tick the safety hazard box. The ticket priority will automatically escalate to **CRITICAL**.
5. Attach an optional photo (JPG or PNG, max 5 MB).
6. Click **Submit Ticket**. You will receive an immediate confirmation with your permanent Ticket Number (e.g., `CF-202611-0001`).

### 3.2 Responding to Dispatcher Inquiries (`NEEDS_INFO`)
If the dispatcher requires clarification (e.g. "Which sink counter is leaking?"):
1. You will receive an in-app notification.
2. Open the ticket detail page (`/requests/[id]`).
3. An amber response banner will display the question. Type your reply and click **Submit Information**.
4. The ticket transitions back to `SUBMITTED` for immediate technician assignment.

### 3.3 Confirming Repair Closure & Reopening (3-Day Window)
When a technician resolves your issue:
1. The ticket enters `RESOLVED` status.
2. Visit `/requests/[id]` to inspect the repair notes and optional after-repair photo.
3. **If satisfied**: Select your 1–5 Star rating, optionally add a comment, and click **Confirm Resolution & Close Ticket**.
4. **If problem persists**: Click **Reopen Issue (Within 3 Days)**, enter the mandatory reason, and confirm. The ticket returns to the dispatch queue for re-inspection.
5. *Note: If no action is taken within 72 hours (3 days), the automated system cron will close the ticket.*

---

## 4. Technician Guide

### 4.1 My Assigned Jobs (`/jobs`)
- Your work queue displays all assigned tickets ordered by **Priority** (CRITICAL first) and then **Due Date**.
- Tickets that have exceeded their target completion time display a prominent **Overdue** indicator.

### 4.2 Field Operations Workspace (`/jobs/[id]`)
- **Start Work**: When arriving on site, click **Start Work** (`ASSIGNED` → `IN_PROGRESS`). This informs dispatch and the reporter that diagnostics are underway.
- **Put On Hold**: If waiting for replacement parts or contractor equipment, click **Put On Hold** (`IN_PROGRESS` → `ON_HOLD`). You must provide an explanation (e.g. "Waiting for 3-inch PVC elbow pipe").
- **Resume Work**: Once parts arrive, click **Resume Work** to return the ticket to `IN_PROGRESS`.
- **Resolve Ticket**: Once work is finished and tested, click **Resolve Ticket**. Enter your **Work Completion Notes** and optionally upload an **After Photo** showing the fixed installation.

---

## 5. Facilities Admin / Dispatcher Guide

### 5.1 Inbox Triage (`/inbox`)
- Filter tickets by status, priority, category, or building, or search directly by ticket number or description.
- Click **Triage** on any ticket to open the management console.

### 5.2 Priority Adjustments & Justifications
- If you change a ticket's priority away from the category recommendation (e.g. lowering an Electrical issue or raising a Furniture request), the system enforces a mandatory **Justification Reason**. This is logged to the permanent audit trail.

### 5.3 Assigning Technicians & SLA Target Dates
- The technician dropdown displays real-time active job counts and critical workloads for each crew member.
- The target completion date is pre-filled using working-day calculations (Mon–Fri 08:00–16:00):
  - **CRITICAL**: 1 working day (First response within 30 minutes).
  - **HIGH**: 2 working days.
  - **MEDIUM**: 5 working days.
  - **LOW**: 15 working days.
- Reassigning an existing ticket automatically closes the previous technician's assignment record with an `unassignedAt` timestamp.

### 5.4 Duplicate Detection & Merging
- If a student reports a leak in a lecture hall that was already reported by a lecturer, the triage console surfaces a **Potential Duplicate Detected** banner.
- Select the primary ticket and click **Merge this Ticket into Primary**. The secondary ticket transitions to `MERGED`, links to the primary ticket, and notifies the reporter.

### 5.5 Create on Behalf (`/tickets/new`)
- Log complaints received via telephone, walk-in counter, or WhatsApp hotline.
- Choose whether to associate the complaint with an existing campus user or record manual contact details.

---

## 6. Unit Head & Executive Guide

### 6.1 Dashboard Analytics (`/dashboard`)
- **Key Metrics**: Real-time counts of active open tickets, overdue backlogs, critical safety hazards, and average user satisfaction rating.
- **Operational Charts**:
  - Breakdown by ticket status.
  - Distribution by priority level.
  - Campus building heat breakdown.
- **Unresolved & Overdue Queue**: Sortable by ticket age to identify aging tickets.

### 6.2 Data Exports
- Click **Export CSV Report** on the dashboard to download an up-to-date `.csv` spreadsheet containing all ticket specs, timestamps, and assignee details.

---

## 7. Automated System Operations

- **Auto-Close Daemon (`/api/cron/auto-close`)**: A scheduled task queries tickets in `RESOLVED` status whose `resolvedAt` timestamp is greater than 72 hours (3 days). It transitions them to `CLOSED` and notifies the reporter.
- **System Health Monitor (`/api/health`)**: Automated health check reporting application version, server uptime, and real-time database connectivity.

---

## 8. Life-Safety Emergency Policy

CampusFix is an asynchronous facilities maintenance ticketing platform and is **NOT** a life-safety emergency dispatch system. For fires, active flooding, gas leaks, medical emergencies, or physical security threats, users are instructed on all login and request forms to call the Campus Emergency Hotline:
**`+62 21 555-0911` (Extension 911)**.
