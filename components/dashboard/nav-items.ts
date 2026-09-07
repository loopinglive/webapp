import {
  BarChart3,
  Binoculars,
  CreditCard,
  Handshake,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Palette,
  Plug,
  Settings,
  Users,
  Video,
  Workflow,
} from "lucide-react";

/**
 * The dashboard's navigation, in one place.
 *
 * Shared by the desktop sidebar and the mobile drawer so the two cannot drift
 * apart — which is how a link ends up reachable on a laptop and invisible on a
 * phone.
 */
export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/webinars", label: "Webinars", icon: Video },
  { href: "/attendees", label: "Attendees", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/competitor-intelligence", label: "Competitor Intel", icon: Binoculars },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/revenue-forecast", label: "Revenue Forecast", icon: LineChart },
  { href: "/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/settings/white-label", label: "White label", icon: Palette },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/affiliate", label: "Affiliate", icon: Handshake },
  { href: "/settings/api-keys", label: "API keys", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
