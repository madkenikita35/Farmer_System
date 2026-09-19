// components/icons.jsx
// -----------------------------------------------------------------------
// EVERY icon in the app comes from here.
//
// ---------------------------------------------------------------------
// WHY THIS FILE EXISTS
// ---------------------------------------------------------------------
// The app used to draw its icons with emoji: a pushpin for a location,
// a classical building for a mandi, a bar chart for a chart. Four
// problems with that:
//
//   1. Emoji are drawn by the OPERATING SYSTEM, not by us. The same
//      screen looks different on Windows, Android and iOS, and we cannot
//      control any of it.
//   2. They are full-colour cartoons. A rainbow of unrelated hues in a
//      toolbar reads as a lifestyle app, not as something you check a
//      price on before selling a crop.
//   3. They cannot take a colour, a stroke width, or a size that matches
//      the text beside them - they are pictures, not shapes.
//   4. A screen reader announces "classical building" for the mandi
//      emoji, which is not what the link means.
//
// lucide-react solves all four: one line-drawn family, one stroke
// weight, and every icon inherits `currentColor` from its parent - so an
// icon next to muted text is muted, and an icon in a button is the
// button's colour, automatically.
//
// ---------------------------------------------------------------------
// WHY THE NAMES ARE RENAMED
// ---------------------------------------------------------------------
// Components import `Mandi`, not `Landmark`. The app's vocabulary is
// mandis, crops and receipts; lucide's is buildings and files. Mapping
// once here means that if a better icon appears later, it changes in ONE
// place rather than in forty imports.
// -----------------------------------------------------------------------

export {
  // ---- navigation ----
  Home as HomeIcon,
  Search as SearchIcon,
  MapPin as LocationIcon,
  Landmark as MandiIcon,
  TrendingUp as TrendIcon,
  Upload as UploadIcon,
  LayoutDashboard as DashboardIcon,
  Menu as MenuIcon,
  X as CloseIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
  ChevronDown as ChevronDownIcon,
  ChevronsUpDown as SelectorIcon,

  // ---- data and status ----
  BarChart3 as ChartIcon,
  LineChart as LineChartIcon,
  CheckCircle2 as OkIcon,
  AlertTriangle as WarnIcon,
  XCircle as ErrorIcon,
  Info as InfoIcon,
  Loader2 as SpinnerIcon,

  // ---- domain ----
  Wheat as CropIcon,
  ReceiptText as ReceiptIcon,
  IndianRupee as RupeeIcon,
  Scale as WeightIcon,
  Calendar as DateIcon,
  Ruler as DistanceIcon,
  Map as RegionIcon,
  Globe as CountryIcon,
  Building2 as StateIcon,

  // ---- account and admin ----
  User as UserIcon,
  Users as FarmersIcon,
  LogOut as LogoutIcon,
  LogIn as LoginIcon,
  Shield as AdminIcon,
  Activity as ActivityIcon,
  Languages as LanguageIcon,
  Palette as ThemeIcon,

  // ---- actions ----
  Mic as MicIcon,
  Volume2 as SpeakingIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  UserPlus as SignupIcon,
  Camera as CameraIcon,
  RotateCcw as ResetIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUpRight as ArrowUpRightIcon,
  Lightbulb as TipIcon,
  ShoppingCart as BuyIcon,
  Sprout as SellIcon,
  Eye as ViewIcon,
} from "lucide-react";

// ---------------------------------------------------------------------
// SIZES
// ---------------------------------------------------------------------
// Three sizes, so icons stay in step with the text they sit beside
// instead of each one being tuned by hand. lucide takes a `size` in
// pixels; these match Tailwind's text sizes:
//
//   ICON_SM (14px) - next to text-xs / text-sm
//   ICON_MD (16px) - next to text-sm / text-base, buttons, nav links
//   ICON_LG (20px) - page headings and empty states
//
// Anything bigger than 20px starts to look like decoration again, which
// is the thing we just removed.
// ---------------------------------------------------------------------
export const ICON_SM = 14;
export const ICON_MD = 16;
export const ICON_LG = 20;

// The stroke weight for every icon in the app. lucide's default is 2,
// which reads heavy next to Inter at small sizes; 1.75 matches the
// text better without going faint.
export const ICON_STROKE = 1.75;
