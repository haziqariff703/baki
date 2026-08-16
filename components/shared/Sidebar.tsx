'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import {
  LayoutDashboard,
  CreditCard,
  UploadCloud,
  Calculator,
  Bell,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogIn,
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const tNav = useTranslations('Nav');
  const pathname = usePathname();

  const navItems = [
    { label: tNav('workspace'), href: '/', icon: LayoutDashboard },
    { label: tNav('subscriptions'), href: '/dashboard', icon: CreditCard },
    { label: tNav('imports'), href: '/imports', icon: UploadCloud },
    { label: tNav('scorer'), href: '/scorer', icon: Calculator },
    { label: tNav('reminders'), href: '/reminders', icon: Bell },
    { label: tNav('privacy'), href: '/privacy', icon: ShieldCheck },
    { label: tNav('settings'), href: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-40 bg-[#111111] border-r border-[#222222] text-[#888] flex flex-col transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#222222]">
        <Link href="/" className="flex items-center space-x-3 overflow-hidden">
          {!collapsed ? (
            <img 
              src="/logo.png" 
              alt="Baki Logo" 
              className="h-8 object-contain"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-[#1a1a1a] border border-[#333] flex items-center justify-center shrink-0 overflow-hidden bg-white">
              <img 
                src="/favicon.ico" 
                alt="Baki Logo Icon" 
                className="w-full h-full object-contain p-1"
              />
            </div>
          )}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded text-[#666] hover:text-white hover:bg-[#222] transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#1a1a1a] border border-[#333] text-white shadow-sm'
                  : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#888]'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Section */}
      <div className="p-3 border-t border-[#222222] space-y-3">
        {!collapsed && (
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-[#555] uppercase tracking-wider">Locale</span>
            <LanguageSwitcher />
          </div>
        )}

        <Link
          href="/dashboard"
          className="w-full flex items-center justify-center space-x-2 bg-[#1a1a1a] hover:bg-[#222] text-white font-medium py-2.5 px-3 rounded-lg border border-[#333] transition-all text-xs"
        >
          <LogIn className="w-4 h-4 text-white" />
          {!collapsed && <span>{tNav('signIn')}</span>}
        </Link>
      </div>
    </aside>
  );
}
