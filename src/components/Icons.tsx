import type { ComponentProps, FC } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity01Icon, AlertCircleIcon, Alert02Icon, Add01Icon, Archive02Icon, ArrowDown01Icon,
  ArrowLeft01Icon, ArrowRight01Icon, ArrowRight02Icon, ArrowUpRight01Icon, BlockedIcon,
  BookOpen01Icon, Calendar03Icon, CalendarAdd01Icon, CallRinging01Icon, Call02Icon,
  Cancel01Icon, ChartBarLineIcon, CheckmarkCircle02Icon, Clock01Icon, Copy01Icon,
  CreditCardIcon, CustomerSupportIcon, DashboardSquare01Icon, Delete02Icon, Download01Icon,
  FavouriteIcon, File01Icon, FileAddIcon, FloppyDiskIcon, GlobalIcon, GridViewIcon, Image01Icon,
  InboxIcon, LanguageSquareIcon, Layers01Icon, LayoutIcon, LayoutTopIcon, Link02Icon,
  LinkSquare02Icon, Loading03Icon, Location01Icon, Logout01Icon, Mail01Icon, MailAdd01Icon,
  Mailbox01Icon, Message01Icon, MoreHorizontalIcon, Notification01Icon, PaintBoardIcon,
  PencilEdit01Icon, QrCodeIcon, Refresh01Icon, RotateLeft01Icon, Search01Icon, Shield01Icon,
  SmartPhone01Icon, SparklesIcon, Tick02Icon, Ticket01Icon, UserIcon, UserMultipleIcon,
  ViewIcon, ViewOffIcon, Share08Icon, GoogleIcon, LockPasswordIcon,
} from "@hugeicons/core-free-icons";

/* Thin wrappers around Hugeicons so every icon stays a drop-in React component
   (they are passed around as props, e.g. <MenuIcon Icon={Bell} />).
   Props: size, strokeWidth, className, color (defaults to currentColor). */
type HugeProps = ComponentProps<typeof HugeiconsIcon>;
type IconData = NonNullable<HugeProps["icon"]>;
export type IconProps = Omit<HugeProps, "icon">;
export type IconComponent = FC<IconProps>;

const make = (icon: IconData, name: string): IconComponent => {
  const C: IconComponent = (props) => <HugeiconsIcon icon={icon} {...props} />;
  C.displayName = name;
  return C;
};

export const Activity = make(Activity01Icon, "Activity");
export const AlertCircle = make(AlertCircleIcon, "AlertCircle");
export const AlertTriangle = make(Alert02Icon, "AlertTriangle");
export const Archive = make(Archive02Icon, "Archive");
export const ArrowRight = make(ArrowRight02Icon, "ArrowRight");
export const ArrowUpRight = make(ArrowUpRight01Icon, "ArrowUpRight");
export const Ban = make(BlockedIcon, "Ban");
export const BarChart3 = make(ChartBarLineIcon, "BarChart3");
export const Bell = make(Notification01Icon, "Bell");
export const BookOpen = make(BookOpen01Icon, "BookOpen");
export const CalendarDays = make(Calendar03Icon, "CalendarDays");
export const CalendarPlus = make(CalendarAdd01Icon, "CalendarPlus");
export const Check = make(Tick02Icon, "Check");
export const CheckCircle2 = make(CheckmarkCircle02Icon, "CheckCircle2");
export const ChevronDown = make(ArrowDown01Icon, "ChevronDown");
export const ChevronLeft = make(ArrowLeft01Icon, "ChevronLeft");
export const ChevronRight = make(ArrowRight01Icon, "ChevronRight");
export const Clock = make(Clock01Icon, "Clock");
export const Copy = make(Copy01Icon, "Copy");
export const CreditCard = make(CreditCardIcon, "CreditCard");
export const Download = make(Download01Icon, "Download");
export const ExternalLink = make(LinkSquare02Icon, "ExternalLink");
export const Eye = make(ViewIcon, "Eye");
export const EyeOff = make(ViewOffIcon, "EyeOff");
export const FilePlus2 = make(FileAddIcon, "FilePlus2");
export const FileText = make(File01Icon, "FileText");
export const Globe = make(GlobalIcon, "Globe");
export const Heart = make(FavouriteIcon, "Heart");
export const Image = make(Image01Icon, "Image");
export const Inbox = make(InboxIcon, "Inbox");
export const Languages = make(LanguageSquareIcon, "Languages");
export const Layers = make(Layers01Icon, "Layers");
export const LayoutDashboard = make(DashboardSquare01Icon, "LayoutDashboard");
export const LayoutGrid = make(GridViewIcon, "LayoutGrid");
export const Share = make(Share08Icon, "Share");
export const LayoutTemplate = make(LayoutIcon, "LayoutTemplate");
export const LifeBuoy = make(CustomerSupportIcon, "LifeBuoy");
export const Link2 = make(Link02Icon, "Link2");
export const Loader2 = make(Loading03Icon, "Loader2");
export const LogOut = make(Logout01Icon, "LogOut");
export const Mail = make(Mail01Icon, "Mail");
export const Lock = make(LockPasswordIcon, "Lock");
export const Google = make(GoogleIcon, "Google");
export const MailPlus = make(MailAdd01Icon, "MailPlus");
export const Mails = make(Mailbox01Icon, "Mails");
export const MapPin = make(Location01Icon, "MapPin");
export const MessageCircle = make(Message01Icon, "MessageCircle");
export const MoreHorizontal = make(MoreHorizontalIcon, "MoreHorizontal");
export const Palette = make(PaintBoardIcon, "Palette");
export const PanelTop = make(LayoutTopIcon, "PanelTop");
export const Pencil = make(PencilEdit01Icon, "Pencil");
export const Phone = make(Call02Icon, "Phone");
export const PhoneCall = make(CallRinging01Icon, "PhoneCall");
export const Plus = make(Add01Icon, "Plus");
export const QrCode = make(QrCodeIcon, "QrCode");
export const RefreshCw = make(Refresh01Icon, "RefreshCw");
export const RotateCcw = make(RotateLeft01Icon, "RotateCcw");
export const Save = make(FloppyDiskIcon, "Save");
export const Search = make(Search01Icon, "Search");
export const ShieldCheck = make(Shield01Icon, "ShieldCheck");
export const Smartphone = make(SmartPhone01Icon, "Smartphone");
export const Sparkles = make(SparklesIcon, "Sparkles");
export const Ticket = make(Ticket01Icon, "Ticket");
export const Trash2 = make(Delete02Icon, "Trash2");
export const User = make(UserIcon, "User");
export const Users = make(UserMultipleIcon, "Users");
export const X = make(Cancel01Icon, "X");
