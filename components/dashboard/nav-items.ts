import {
  Award,
  BarChart3,
  Binoculars,
  BookOpen,
  Bot,
  CreditCard,
  Handshake,
  KanbanSquare,
  KeyRound,
  LayoutDashboard,
  Layers,
  Link2,
  LineChart,
  Mic,
  Palette,
  Plug,
  Puzzle,
  Settings,
  Shield,
  ShieldCheck,
  Sparkle,
  TrendingUp,
  Users,
  UsersRound,
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
  { href: "/admin/dashboard", label: "Webinars", icon: Video },
  { href: "/autonomous", label: "AI Autopilot", icon: Bot },
  { href: "/voice-clone", label: "Voice Cloning", icon: Mic },
  { href: "/webinars/series", label: "Series", icon: Layers },
  { href: "/attendees", label: "Attendees", icon: Users },
  { href: "/crm", label: "Deals", icon: KanbanSquare },
  { href: "/co-hosting", label: "Co-hosting", icon: UsersRound },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/competitor-intelligence", label: "Competitor Intel", icon: Binoculars },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/upsell", label: "Upsell", icon: TrendingUp },
  { href: "/revenue-forecast", label: "Revenue Forecast", icon: LineChart },
  { href: "/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/settings/white-label", label: "White label", icon: Palette },
  { href: "/settings/certificate-template", label: "Certificate Design", icon: Award },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/affiliate", label: "Affiliate", icon: Handshake },
  { href: "/settings/cele-bio", label: "Cele.bio", icon: Link2 },
  { href: "/settings/api-keys", label: "API keys", icon: KeyRound },
  { href: "/settings/security", label: "Security", icon: Shield },
  { href: "/data-privacy", label: "Data Privacy", icon: ShieldCheck },
  { href: "/creator-profile", label: "Creator Profile", icon: Sparkle },
  { href: "/plugins", label: "Plugins", icon: Puzzle },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
