import {
  Activity,
  Inbox,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const dashboardNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Approval Queue", href: "/dashboard/queue", icon: Inbox },
  { label: "Activity Log", href: "/dashboard/activity", icon: Activity },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
