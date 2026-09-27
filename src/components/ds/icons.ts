/**
 * Maps every design-system icon name (docs/design-system/reference/index.d.ts
 * `IconName`) to its lucide-react component.
 *
 * Import each icon by name — never `import * as Lucide from 'lucide-react'` —
 * so a production build only bundles the icons this map lists.
 */
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Captions,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileText,
  Globe,
  GraduationCap,
  Hand,
  HelpCircle,
  Home,
  ImageIcon,
  Info,
  Landmark,
  Lightbulb,
  Lock,
  LogOut,
  Mail,
  Map,
  Menu,
  MessageCircle,
  Mic,
  NotebookPen,
  Package,
  Palette,
  Pause,
  Pencil,
  Play,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Settings,
  Sprout,
  Square,
  Target,
  Trash2,
  Type,
  Upload,
  User,
  Users,
  Volume2,
  Wifi,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react';

/** Every icon name the design system uses. Keep in sync with the components' README and index.d.ts. */
export type IconName =
  | 'BookOpen'
  | 'Pencil'
  | 'MessageCircle'
  | 'Play'
  | 'Pause'
  | 'RefreshCw'
  | 'RotateCcw'
  | 'Check'
  | 'ArrowRight'
  | 'ArrowLeft'
  | 'ChevronRight'
  | 'ChevronDown'
  | 'X'
  | 'Menu'
  | 'Plus'
  | 'Volume2'
  | 'Mic'
  | 'Square'
  | 'Trash2'
  | 'Wifi'
  | 'Type'
  | 'Lightbulb'
  | 'Clock'
  | 'Lock'
  | 'User'
  | 'Users'
  | 'Map'
  | 'Landmark'
  | 'Palette'
  | 'Scale'
  | 'HelpCircle'
  | 'ClipboardCheck'
  | 'NotebookPen'
  | 'GraduationCap'
  | 'Home'
  | 'Eye'
  | 'Download'
  | 'Printer'
  | 'Mail'
  | 'Globe'
  | 'Sprout'
  | 'Target'
  | 'Info'
  | 'WifiOff'
  | 'FileText'
  | 'Package'
  | 'Receipt'
  | 'ImageIcon'
  | 'Captions'
  | 'Hand'
  | 'Search'
  | 'LogOut'
  // Not in the design-system list: the header's link to Settings (phase 6).
  | 'Settings'
  // Not in the design-system list: "Load my work" in Settings (moving work between devices).
  | 'Upload'
  // Not in the design-system list: the links to a printable certificate.
  | 'Award';

/**
 * Icon names that point along the reading direction and must be mirrored
 * (scaleX(-1)) when `dir="rtl"`. `Icon` does this itself; components should
 * not add their own mirroring.
 */
export const DIRECTIONAL_ICONS: ReadonlySet<IconName> = new Set<IconName>([
  'ArrowRight',
  'ArrowLeft',
  'ChevronRight',
  'LogOut',
]);

export const ICONS: Record<IconName, LucideIcon> = {
  BookOpen,
  Pencil,
  MessageCircle,
  Play,
  Pause,
  RefreshCw,
  RotateCcw,
  Check,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  X,
  Menu,
  Plus,
  Volume2,
  Mic,
  Square,
  Trash2,
  Wifi,
  Type,
  Lightbulb,
  Clock,
  Lock,
  User,
  Users,
  Map,
  Landmark,
  Palette,
  Scale,
  HelpCircle,
  ClipboardCheck,
  NotebookPen,
  GraduationCap,
  Home,
  Eye,
  Download,
  Printer,
  Mail,
  Globe,
  Sprout,
  Target,
  Info,
  WifiOff,
  FileText,
  Package,
  Receipt,
  ImageIcon,
  Captions,
  Hand,
  Search,
  LogOut,
  Settings,
  Upload,
  Award,
};
