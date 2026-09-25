import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  BadgeCheck,
  Building2,
  FolderTree,
  Globe,
  Image,
  IndianRupee,
  LayoutDashboard,
  MessageSquareMore,
  Package,
  Settings,
  ShoppingCart,
  Star,
  TicketPercent,
  UserCog,
  UserPlus,
  UserSearch,
  Users,
} from "lucide-react"

export type DashboardRole = "admin" | "staff"

export interface NavigationItem {
  label: string
  href?: string
  icon: LucideIcon
  roles: DashboardRole[]
  children?: NavigationItem[]
}

export interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

const adminOnly: DashboardRole[] = ["admin"]
const operations: DashboardRole[] = ["admin", "staff"]

export const navigationGroups: NavigationGroup[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard, roles: operations }] },
  {
    label: "Operations",
    items: [
      { label: "Product Catalogue", href: "/products", icon: Package, roles: operations },
      { label: "Price Management", href: "/price-management", icon: IndianRupee, roles: adminOnly },
      { label: "Brands", href: "/brands", icon: Building2, roles: operations },
      { label: "Categories", href: "/categories", icon: FolderTree, roles: operations },
      { label: "Orders", href: "/orders", icon: ShoppingCart, roles: operations },
      { label: "Negotiations", href: "/negotiations", icon: MessageSquareMore, roles: operations },
      { label: "Customers", href: "/customers", icon: Users, roles: operations },
    ],
  },
  {
    label: "Admin controls",
    items: [
      { label: "Labels", href: "/labels", icon: BadgeCheck, roles: adminOnly },
      { label: "Account Upgrades", href: "/account-upgrades", icon: UserPlus, roles: adminOnly },
      {
        label: "Offers",
        icon: TicketPercent,
        roles: adminOnly,
        children: [
          { label: "Customers", href: "/offers/customers", icon: Users, roles: adminOnly },
          { label: "Wholesalers", href: "/offers/wholesalers", icon: Building2, roles: adminOnly },
          { label: "Affiliate Codes", href: "/offers/affiliates", icon: BadgeCheck, roles: adminOnly },
        ],
      },
      { label: "Staff Management", href: "/staff", icon: UserCog, roles: adminOnly },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3, roles: adminOnly },
      { label: "Leads", href: "/potential-customers", icon: UserSearch, roles: adminOnly },
      { label: "Banners", href: "/banners", icon: Image, roles: adminOnly },
      { label: "Website", href: "/manage-website", icon: Globe, roles: adminOnly },
      { label: "Reviews", href: "/reviews", icon: Star, roles: adminOnly },
      { label: "Settings", href: "/settings", icon: Settings, roles: adminOnly },
    ],
  },
]

export function canAccessPath(role: DashboardRole, pathname: string) {
  if (role === "admin") return true
  return ["/", "/products", "/brands", "/categories", "/orders", "/negotiations", "/customers"].includes(pathname)
}

export function roleLabel(role: DashboardRole) {
  return role === "admin" ? "Administrator" : "Staff"
}
