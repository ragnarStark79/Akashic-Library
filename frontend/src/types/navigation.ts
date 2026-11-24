import type { User } from './auth';

export interface NavItem {
  label: string;
  href: string;
  id: string;
  badge?: string;
}

export interface NavbarProps {
  activeId?: string | null;
  onNavigate?: (id: string, href: string) => void;
  onSearchClick?: () => void;
  onSignInClick?: () => void;
  onSignOutClick?: () => void;
  user?: User | null;
  className?: string;
}

export interface FooterLinkItem {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLinkItem[];
}

export interface FooterProps {
  className?: string;
  sections?: FooterSection[];
  onNavigate?: (href: string) => void;
}

export interface ApplicationShellProps {
  children?: React.ReactNode;
  activeNavId?: string | null;
  onNavigate?: (id: string, href: string) => void;
  onSearchClick?: () => void;
  onSignInClick?: () => void;
  onSignOutClick?: () => void;
  user?: User | null;
  className?: string;
  showFooter?: boolean;
}

