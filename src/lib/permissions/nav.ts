import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  GraduationCap,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Award,
  Wallet,
  LifeBuoy,
  MessageSquare,
  BarChart3,
  Settings,
  Bell,
  User,
  ListChecks,
} from "lucide-react";
import type { UserRole } from "./roles";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  SUPER_ADMIN: adminNav(),
  ADMIN: adminNav(),
  TEACHER: [
    { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    { label: "My Classes", href: "/teacher/classes", icon: GraduationCap },
    { label: "My Students", href: "/teacher/students", icon: Users },
    { label: "My Subjects", href: "/teacher/subjects", icon: BookOpen },
    { label: "Timetable", href: "/teacher/timetable", icon: CalendarClock },
    { label: "Attendance", href: "/teacher/attendance", icon: ClipboardCheck },
    { label: "Assessments", href: "/teacher/assessments", icon: FileText },
    { label: "Results", href: "/teacher/results", icon: Award },
    { label: "Student Support", href: "/teacher/support", icon: LifeBuoy },
    { label: "Messages", href: "/teacher/messages", icon: MessageSquare },
    { label: "Profile", href: "/teacher/profile", icon: User },
  ],
  PARENT: [
    { label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
    { label: "My Children", href: "/parent/children", icon: Users },
    { label: "Attendance", href: "/parent/attendance", icon: ClipboardCheck },
    { label: "Performance", href: "/parent/performance", icon: BarChart3 },
    { label: "Fees & Payments", href: "/parent/fees", icon: Wallet },
    { label: "Timetable", href: "/parent/timetable", icon: CalendarClock },
    { label: "Teacher Feedback", href: "/parent/feedback", icon: MessageSquare },
    { label: "Terminal Reports", href: "/parent/terminal-reports", icon: FileText },
    { label: "Notifications", href: "/parent/notifications", icon: Bell },
    { label: "Profile", href: "/parent/profile", icon: User },
  ],
  STUDENT: [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "My Subjects", href: "/student/subjects", icon: BookOpen },
    { label: "Timetable", href: "/student/timetable", icon: CalendarClock },
    { label: "Attendance", href: "/student/attendance", icon: ClipboardCheck },
    { label: "Results", href: "/student/results", icon: Award },
    { label: "Assignments", href: "/student/assignments", icon: ListChecks },
    { label: "Terminal Reports", href: "/student/terminal-reports", icon: FileText },
    { label: "Feedback", href: "/student/feedback", icon: MessageSquare },
    { label: "Notifications", href: "/student/notifications", icon: Bell },
    { label: "Profile", href: "/student/profile", icon: User },
  ],
};

function adminNav(): NavItem[] {
  return [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Students", href: "/admin/students", icon: Users },
    { label: "Parents", href: "/admin/parents", icon: UserCog },
    { label: "Teachers", href: "/admin/teachers", icon: GraduationCap },
    { label: "Classes", href: "/admin/classes", icon: BookOpen },
    { label: "Subjects", href: "/admin/subjects", icon: BookOpen },
    { label: "Timetable", href: "/admin/timetable", icon: CalendarClock },
    { label: "Attendance", href: "/admin/attendance", icon: ClipboardCheck },
    { label: "Assessments", href: "/admin/assessments", icon: FileText },
    { label: "Results", href: "/admin/results", icon: Award },
    { label: "Terminal Reports", href: "/admin/terminal-reports", icon: FileText },
    { label: "Fees & Payments", href: "/admin/fees", icon: Wallet },
    { label: "Student Support", href: "/admin/support", icon: LifeBuoy },
    { label: "Communication", href: "/admin/communication", icon: MessageSquare },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];
}
