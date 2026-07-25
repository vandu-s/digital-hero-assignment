import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { SvgIconComponent } from "@mui/icons-material";
import { Role } from "../types/models";

export interface NavItem {
  label: string;
  path: string;
  icon: SvgIconComponent;
  // Omit to allow every authenticated role.
  allowedRoles?: Role[];
}

export const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: DashboardOutlinedIcon },
  { label: "Leads", path: "/leads", icon: GroupOutlinedIcon },
  { label: "Users", path: "/users", icon: PeopleAltOutlinedIcon, allowedRoles: ["ADMIN"] },
  { label: "Settings", path: "/settings", icon: SettingsOutlinedIcon },
];
