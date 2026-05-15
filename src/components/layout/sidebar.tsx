"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import type { Profile } from "@/types";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  BarChart3, Settings, Shield, Zap, DollarSign, ChevronLeft,
  ChevronRight, Menu, X, Wallet, FileText
} from "lucide-react";

const navigation = [
  { name: "Dashboard",   href: "/dashboard",    icon: LayoutDashboard, roles: ["admin","manager","cashier","storekeeper"] },
  { name: "POS",         href: "/pos",          icon: ShoppingCart,    roles: ["admin","manager","cashier"] },
  { name: "Inventory",   href: "/inventory",    icon: Package,         roles: ["admin","manager","storekeeper"] },
  { name: "Customers",   href: "/customers",    icon: Users,           roles: ["admin","manager","cashier"] },
  { name: "Suppliers",   href: "/suppliers",    icon: Truck,           roles: ["admin","manager"] },
  { name: "Quotations",  href: "/quotations",   icon: FileText,        roles: ["admin","manager","cashier"] },
  { name: "Expenses",    href: "/expenses",     icon: Wallet,          roles: ["admin","manager"] },
  { name: "Reports",     href: "/reports",      icon: BarChart3,       roles: ["admin","manager"] },
  { name: "Admin",       href: "/admin",        icon: Shield,          roles: ["admin"] },
  { name: "Settings",    href: "/settings",     icon: Settings,        roles: ["admin","manager"] },
];

interface SidebarProps {
  profile: Profile | null;
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { settings } = useBusinessSettings(profile?.branch_id);

  const role = profile?.role ?? "cashier";
  const filteredNav = navigation.filter((item) => item.roles.includes(role));

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-slate-200 dark:border-slate-700",
        collapsed && "justify-center"
      )}>
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          {settings?.company_logo_url ? (
            <img src={settings.company_logo_url} alt="Logo" className="w-full h-full rounded-xl object-contain" />
          ) : (
            <Zap className="w-5 h-5 text-white" />
          )}
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-slate-800 dark:text-white text-sm leading-none truncate">
              {settings?.company_name ? settings.company_name.substring(0, 15) : "POS"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{profile?.role}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
                collapsed && "justify-center"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-sm font-bold text-blue-600">
              {profile?.full_name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                {profile?.full_name ?? "User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center p-3 border-t border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-white dark:bg-slate-800 shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 lg:hidden transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}
