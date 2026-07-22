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
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-background/45 border-b border-border/80 backdrop-blur-md z-30 transition-all duration-300">
      
      {/* Left side: Mobile Menu Trigger & Title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-card/40 rounded-xl transition-all duration-300 cursor-pointer"
          title="Open Menu"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
 
        {/* Path/Page Title */}
        <h2 className="text-xs font-bold text-cream-warm tracking-wider flex items-center gap-2 uppercase">
          {pathname.startsWith('/chat/') && <Bot size={14} className="text-primary" />}
          {getHeaderTitle()}
        </h2>
      </div>

      {/* Right side: Actions & User Dropdown */}
      <div className="flex items-center gap-2 lg:gap-3">
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-border/60 hover:bg-card/45 text-muted-foreground hover:text-foreground transition-all duration-300 cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
 
        {/* Profile Dropdown Container */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-card/40 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
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
                  className="w-7 h-7 rounded-lg border border-border bg-background shrink-0" 
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-primary-glow border border-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials()}
                </div>
              )}
              
              <span className="hidden md:block text-xs font-semibold text-muted-foreground">
                {profile?.name || 'Explorer'}
              </span>
              <ChevronDown size={12} className={`transition-transform duration-250 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-card border border-border shadow-2xl p-1.5 z-50"
                >
                  {/* Header User Detail */}
                  <div className="px-3.5 py-2.5 border-b border-border/60 text-left">
                    <p className="text-xs font-bold text-foreground truncate">
                      {profile?.name || 'User Profile'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-background/60 text-left cursor-pointer transition-all duration-300"
                    >
                      <Settings size={14} />
                      Settings
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-soft hover:text-rose-soft/80 hover:bg-rose-500/10 text-left cursor-pointer transition-all duration-300"
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
            className="text-xs font-bold px-4 py-2 bg-card border border-border hover:bg-card/75 text-foreground rounded-full transition-all duration-300 cursor-pointer"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
