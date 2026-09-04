// Field configs and system definitions for CampusOS dashboard, derived from Prisma schema.

export type FieldInputType = "text" | "number" | "date" | "select" | "textarea";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldInputType;
  editable?: boolean;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface SystemConfig {
  system: "schedules" | "rooms" | "events" | "announcements" | "assignments";
  title: string;
  singularTitle: string;
  description: string;
  endpoint: string;
  idKey: string;
  fields: FieldConfig[];
}

export const scheduleConfig: SystemConfig = {
  system: "schedules",
  title: "Class Schedules",
  singularTitle: "Schedule",
  description: "Manage weekly class timetables, assigned rooms, and faculty allocations.",
  endpoint: "/api/schedules",
  idKey: "id",
  fields: [
    { key: "course", label: "Course Code", type: "text", required: true, placeholder: "e.g. CSE 4113" },
    { key: "title", label: "Course Title", type: "text", required: true, placeholder: "e.g. Machine Learning" },
    {
      key: "day",
      label: "Day of Week",
      type: "select",
      required: true,
      options: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
    },
    { key: "startTime", label: "Start Time", type: "text", required: true, placeholder: "HH:MM (e.g. 08:00)" },
    { key: "endTime", label: "End Time", type: "text", required: true, placeholder: "HH:MM (e.g. 09:20)" },
    { key: "room", label: "Room", type: "text", required: true, placeholder: "e.g. 7A03" },
    { key: "instructor", label: "Instructor", type: "text", required: true, placeholder: "Faculty name or TBA" },
    { key: "section", label: "Section", type: "text", required: true, placeholder: "e.g. B or B1/B2" },
  ],
};

export const roomConfig: SystemConfig = {
  system: "rooms",
  title: "Campus Rooms & Labs",
  singularTitle: "Room",
  description: "Campus facilities, seat capacities, equipment details, and live availability.",
  endpoint: "/api/rooms",
  idKey: "id",
  fields: [
    { key: "roomNumber", label: "Room Number", type: "text", required: true, placeholder: "e.g. 7A03" },
    {
      key: "type",
      label: "Room Type",
      type: "select",
      required: true,
      options: ["classroom", "lab", "seminar"],
    },
    { key: "capacity", label: "Capacity", type: "number", required: true, placeholder: "Maximum occupants" },
    { key: "floor", label: "Floor", type: "number", required: true, placeholder: "Floor number (e.g. 7)" },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: ["available", "unavailable"],
    },
    {
      key: "equipment",
      label: "Equipment",
      type: "text",
      required: false,
      placeholder: "e.g. projector, AC, whiteboard",
    },
  ],
};

export const eventConfig: SystemConfig = {
  system: "events",
  title: "Campus Events",
  singularTitle: "Event",
  description: "Seminars, workshops, hackathons, and extracurricular university events.",
  endpoint: "/api/events",
  idKey: "id",
  fields: [
    { key: "name", label: "Event Name", type: "text", required: true, placeholder: "Title of the event" },
    { key: "description", label: "Description", type: "textarea", required: true, placeholder: "Details and agenda" },
    { key: "date", label: "Start Date", type: "date", required: true },
    { key: "startTime", label: "Start Time", type: "text", required: true, placeholder: "HH:MM" },
    { key: "endTime", label: "End Time", type: "text", required: true, placeholder: "HH:MM" },
    { key: "endDate", label: "End Date", type: "date", required: true },
    { key: "venue", label: "Venue (Room)", type: "text", required: true, placeholder: "e.g. 7C01" },
    { key: "organizer", label: "Organizer", type: "text", required: true, placeholder: "Club or department" },
    { key: "capacity", label: "Max Capacity", type: "number", required: true, placeholder: "Max registrations" },
    { key: "registered", label: "Registered Count", type: "number", required: true, placeholder: "Current count" },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: ["upcoming", "ongoing", "completed", "cancelled", "full"],
    },
  ],
};

export const announcementConfig: SystemConfig = {
  system: "announcements",
  title: "Official Announcements",
  singularTitle: "Announcement",
  description: "Notices, departmental updates, academic calendars, and administrative alerts.",
  endpoint: "/api/announcements",
  idKey: "id",
  fields: [
    { key: "title", label: "Headline", type: "text", required: true, placeholder: "Announcement title" },
    { key: "body", label: "Announcement Body", type: "textarea", required: true, placeholder: "Full notice content" },
    { key: "date", label: "Date Posted", type: "date", required: true },
    {
      key: "priority",
      label: "Priority Level",
      type: "select",
      required: true,
      options: ["high", "medium", "low"],
    },
    { key: "postedBy", label: "Posted By", type: "text", required: true, placeholder: "Author or Department" },
    { key: "expires", label: "Expiry Date", type: "date", required: true },
  ],
};

export const assignmentConfig: SystemConfig = {
  system: "assignments",
  title: "Course Assignments",
  singularTitle: "Assignment",
  description: "Coursework tasks, submission portals, marks distribution, and deadlines.",
  endpoint: "/api/assignments",
  idKey: "id",
  fields: [
    { key: "course", label: "Course Code", type: "text", required: true, placeholder: "e.g. CSE 4113" },
    { key: "courseTitle", label: "Course Title", type: "text", required: true, placeholder: "Course subject" },
    { key: "title", label: "Assignment Title", type: "text", required: true, placeholder: "Task name" },
    { key: "description", label: "Instructions", type: "textarea", required: true, placeholder: "Task details" },
    { key: "assignedDate", label: "Assigned Date", type: "date", required: true },
    { key: "deadline", label: "Deadline", type: "date", required: true },
    {
      key: "submissionPlatform",
      label: "Submission Platform",
      type: "text",
      required: true,
      placeholder: "e.g. Google Classroom",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: ["pending", "submitted", "graded", "late"],
    },
    { key: "marks", label: "Total Marks", type: "number", required: true, placeholder: "e.g. 20" },
  ],
};

export const allSystemConfigs: Record<string, SystemConfig> = {
  schedules: scheduleConfig,
  rooms: roomConfig,
  events: eventConfig,
  announcements: announcementConfig,
  assignments: assignmentConfig,
};
