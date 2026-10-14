/**
 * Icon convention — every icon in the UI comes from Lucide via this map, so a
 * concept always uses the same glyph. Import `icons.finance.deposit` rather
 * than picking an icon ad hoc. Sizes/strokes are set by <Icon> (components/ui/icon.js).
 */
import {
  // navigation
  LayoutDashboard, Menu, X, ChevronRight, ChevronLeft, ChevronDown, ArrowRight, ArrowLeft, ExternalLink,
  Home, LogOut, LogIn, Search, PanelLeftClose, PanelLeftOpen,
  // finance
  Wallet, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Landmark, PiggyBank, Receipt, Banknote,
  CircleDollarSign, Hourglass, CalendarClock, Layers,
  // crypto
  Bitcoin, Coins, ChartCandlestick, Gem,
  // security
  ShieldCheck, Lock, KeyRound, Fingerprint, ShieldAlert, Eye, EyeOff,
  // users
  User, Users, UserCog, UserCheck, UserX, IdCard, BadgeCheck,
  // charts
  TrendingUp, TrendingDown, ChartLine, ChartPie, ChartColumn, Activity,
  // settings
  Settings, SlidersHorizontal, Languages, Sun, Moon, Monitor, Palette,
  // notifications
  Bell, BellRing, Mail, Megaphone, Inbox,
  // status / forms
  CircleCheck, CircleX, CircleAlert, Info, Clock, Loader2, Check, Plus, Minus, Copy, Upload, FileText,
  Filter, ArrowUpDown, RefreshCw, Trash2, Pencil, Ban, LifeBuoy, MessageSquare, Send, ScrollText, HelpCircle,
  Phone, Globe, MapPin, Sparkles, FlaskConical,
} from "lucide-react";

export const icons = {
  nav: {
    dashboard: LayoutDashboard, menu: Menu, close: X, next: ChevronRight, prev: ChevronLeft,
    expand: ChevronDown, forward: ArrowRight, back: ArrowLeft, external: ExternalLink, home: Home,
    logout: LogOut, login: LogIn, search: Search, collapse: PanelLeftClose, uncollapse: PanelLeftOpen,
  },
  finance: {
    wallet: Wallet, deposit: ArrowDownToLine, withdraw: ArrowUpFromLine, transfer: ArrowLeftRight,
    bank: Landmark, invest: PiggyBank, receipt: Receipt, cash: Banknote, balance: CircleDollarSign,
    pending: Hourglass, term: CalendarClock, plans: Layers,
  },
  crypto: { bitcoin: Bitcoin, coins: Coins, market: ChartCandlestick, asset: Gem },
  security: {
    shield: ShieldCheck, lock: Lock, key: KeyRound, mfa: Fingerprint, alert: ShieldAlert, show: Eye, hide: EyeOff,
  },
  users: { user: User, users: Users, admin: UserCog, active: UserCheck, suspended: UserX, kyc: IdCard, verified: BadgeCheck },
  charts: { up: TrendingUp, down: TrendingDown, line: ChartLine, pie: ChartPie, bar: ChartColumn, activity: Activity },
  settings: {
    settings: Settings, preferences: SlidersHorizontal, language: Languages, light: Sun, dark: Moon,
    system: Monitor, theme: Palette,
  },
  notify: { bell: Bell, ring: BellRing, mail: Mail, announce: Megaphone, inbox: Inbox },
  status: {
    success: CircleCheck, error: CircleX, warning: CircleAlert, info: Info, pending: Clock, loading: Loader2,
    check: Check, add: Plus, remove: Minus, copy: Copy, upload: Upload, file: FileText, filter: Filter,
    sort: ArrowUpDown, refresh: RefreshCw, delete: Trash2, edit: Pencil, block: Ban, simulation: FlaskConical,
  },
  support: { help: LifeBuoy, message: MessageSquare, send: Send, audit: ScrollText, faq: HelpCircle },
  contact: { phone: Phone, web: Globe, location: MapPin, sparkle: Sparkles },
};
