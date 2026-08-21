import Navbar, { type NavbarProps } from './Navbar';

export interface HeaderProps {
  readonly title?: string;
  /**
   * 'app' (default) — in-app chrome: search + avatar.
   * 'landing' — public landing/login: nav links + Sign in / Open app CTAs.
   */
  readonly variant?: 'app' | 'landing';
}

/**
 * Backwards-compatible alias for the Navbar. Maps the legacy `landing`
 * variant onto the navbar's `public` variant so existing call-sites keep
 * working while the chrome is rebuilt on the two-variant navbar.
 */
export default function Header({ title, variant = 'app' }: HeaderProps) {
  const navbarVariant: NavbarProps['variant'] = variant === 'landing' ? 'public' : 'app';
  return <Navbar title={title} variant={navbarVariant} />;
}
