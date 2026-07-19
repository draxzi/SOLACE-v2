'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppLayout } from '@/context/LayoutContext';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, 
  Sun, 
  Moon, 
  LogOut, 
  Settings, 
  ChevronDown, 
  Bot 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setIsSidebarOpen } = useAppLayout();
  const pathname = usePathname();
  const router = useRouter();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format page header title based on route
  const getHeaderTitle = () => {
    if (pathname === '/chat') return 'Companion Chat';
    if (pathname.startsWith('/chat/')) return 'Chat Session';
    if (pathname === '/settings') return 'Settings';
    return 'Solace Workspace';
  };

  const getInitials = () => {
    if (profile?.name) {
      return profile.name.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'US';
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-slate-900/40 border-b border-slate-800 backdrop-blur-md dark:bg-slate-950/40 dark:border-slate-800/80 light:bg-white/80 light:border-slate-200 z-30 transition-all duration-200">
      
      {/* Left side: Mobile Menu Trigger & Title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-xl transition-all cursor-pointer"
          title="Open Menu"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
 
        {/* Path/Page Title */}
        <h2 className="text-sm font-semibold text-slate-200 dark:text-slate-200 light:text-slate-900 tracking-tight flex items-center gap-2">
          {pathname.startsWith('/chat/') && <Bot size={14} className="text-violet-400" />}
          {getHeaderTitle()}
        </h2>
      </div>

      {/* Right side: Actions & User Dropdown */}
      <div className="flex items-center gap-2 lg:gap-3">
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-800/80 hover:bg-slate-800/50 text-slate-400 hover:text-slate-100 dark:border-slate-800/80 dark:hover:bg-slate-900/60 light:border-slate-200 light:hover:bg-slate-50 light:text-slate-500 light:hover:text-slate-900 transition-all cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
 
        {/* Profile Dropdown Container */}
        {/* Profile Dropdown Container */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-slate-800/30 dark:hover:bg-slate-900/40 light:hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-200 cursor-pointer"
              aria-label="User profile options menu"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              {/* User Avatar Circle */}
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={profile.avatarUrl} 
                  alt="Avatar" 
                  className="w-7 h-7 rounded-lg border border-slate-700 bg-slate-800 shrink-0" 
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-violet-650/10 border border-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials()}
                </div>
              )}
              
              <span className="hidden md:block text-xs font-medium text-slate-300 dark:text-slate-300 light:text-slate-700">
                {profile?.name || 'Explorer'}
              </span>
              <ChevronDown size={12} className={`transition-transform duration-205 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 dark:bg-slate-950 dark:border-slate-800/80 light:bg-white light:border-slate-200"
                >
                  {/* Header User Detail */}
                  <div className="px-3.5 py-2.5 border-b border-slate-800/60 dark:border-slate-800/60 light:border-slate-200 text-left">
                    <p className="text-xs font-bold text-slate-200 dark:text-slate-200 light:text-slate-900 truncate">
                      {profile?.name || 'User Profile'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>

                  {/* Dropdown Options */}
                  <div className="py-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push('/settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 dark:hover:bg-slate-900/60 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-50 text-left cursor-pointer transition-all"
                    >
                      <Settings size={14} />
                      Settings
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 dark:hover:bg-red-950/10 light:hover:bg-red-50 text-left cursor-pointer transition-all"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <Link 
            href="/login"
            className="text-xs font-semibold px-4.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-slate-100 text-slate-350 rounded-full transition-all cursor-pointer"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
