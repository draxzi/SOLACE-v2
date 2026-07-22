'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/providers/ThemeProvider';
import { createClient } from '@/lib/supabase/client';
import { 
  User as UserIcon, 
  ShieldAlert, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Loader2, 
  Check, 
  Trash2,
  Lock,
  Moon,
  Sun,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'profile' | 'preferences' | 'security';

// Premium Preset Avatar Options
const PRESET_AVATARS = [
  { name: 'Aurora', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aurora' },
  { name: 'Cosmo', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cosmo' },
  { name: 'Nebula', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nebula' },
  { name: 'Pixel', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pixel' },
  { name: 'Spark', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Spark' },
  { name: 'Zen', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zen' },
];

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!user) {
      router.push('/login?redirectTo=/settings');
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile Form States
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // AI Preferences States
  const [defaultCompanion, setDefaultCompanion] = useState('');
  const [aiResponseStyle, setAiResponseStyle] = useState<'concise' | 'balanced' | 'detailed'>('balanced');
  const [aiTemperature, setAiTemperature] = useState(0.8);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Delete Account Confirmation States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Hydrate states when profile loads
  useEffect(() => {
    if (profile) {
      const timer = setTimeout(() => {
        setDisplayName(profile.name || '');
        setAvatarUrl(profile.avatarUrl || '');
        
        const prefs = profile.preferences;
        if (prefs) {
          setDefaultCompanion(prefs.defaultCompanion || '');
          setAiResponseStyle(prefs.aiResponseStyle || 'balanced');
          setAiTemperature(prefs.aiTemperature !== undefined ? prefs.aiTemperature : 0.8);
          setNotificationsEnabled(prefs.notificationsEnabled !== false);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  const handleClearMessages = () => {
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  // 1. Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    handleClearMessages();

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: displayName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      await refreshProfile();
      setSuccessMsg('Profile updated successfully!');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update profile.';
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 2. Save Settings/AI Preferences
  const handleSavePreferences = async () => {
    if (!user) return;
    setLoading(true);
    handleClearMessages();

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preferences: {
            defaultCompanion,
            aiResponseStyle,
            aiTemperature,
            notificationsEnabled
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      await refreshProfile();
      setSuccessMsg('Preferences saved successfully!');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to save preferences.';
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 3. Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setLoading(true);
    handleClearMessages();

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('Password updated successfully!');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update password.';
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 4. Delete Account Simulation
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete my account') {
      setErrorMsg('Confirmation text does not match.');
      return;
    }
    setLoading(true);
    handleClearMessages();

    try {
      // Cascade delete is managed by foreign keys on DB, but let's clear explicitly
      const { error: convError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user?.id || '');

      if (convError) throw convError;

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id || '');

      if (profileError) throw profileError;

      // Sign out user after deletion
      await signOut();
      window.location.href = '/register';
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete account.';
      setErrorMsg(errMsg);
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <main className="min-h-full bg-background p-4 lg:p-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Page Title & Breadcrumbs */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-extrabold text-cream-warm tracking-wide uppercase">
            Settings & Profile
          </h1>
          <p className="text-[10px] text-muted-foreground/60">
            Configure your personal profile settings, AI parameters, and security details.
          </p>
        </div>

        {/* Success/Error Alerts */}
        <AnimatePresence>
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex justify-between items-center"
            >
              <span>{successMsg}</span>
              <button onClick={handleClearMessages} className="text-[10px] uppercase font-bold tracking-wider hover:underline cursor-pointer">Dismiss</button>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex justify-between items-center"
            >
              <span>{errorMsg}</span>
              <button onClick={handleClearMessages} className="text-[10px] uppercase font-bold tracking-wider hover:underline cursor-pointer">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Layout (Tabs Sidebar + Content Box) */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* Tabs Sidebar Selector */}
          <div className="w-full md:w-56 shrink-0 bg-card/65 border border-border/80 rounded-3xl p-2 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible shadow-lg shadow-black/10">
            <button
              onClick={() => { setActiveTab('profile'); handleClearMessages(); }}
              className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-primary text-background shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/45'
              }`}
            >
              <UserIcon size={14} />
              <span>Profile Details</span>
            </button>
            
            <button
              onClick={() => { setActiveTab('preferences'); handleClearMessages(); }}
              className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'preferences'
                  ? 'bg-primary text-background shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/45'
              }`}
            >
              <Sparkles size={14} />
              <span>AI Preferences</span>
            </button>
            
            <button
              onClick={() => { setActiveTab('security'); handleClearMessages(); }}
              className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-primary text-background shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/45'
              }`}
            >
              <Lock size={14} />
              <span>Security & Acc</span>
            </button>
          </div>

          {/* Active Tab Workspace Container */}
          <div className="flex-1 w-full bg-card/40 border border-border/80 rounded-3xl p-6 lg:p-8 backdrop-blur-md shadow-lg shadow-black/10">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-cream-warm">Personal Profile</h2>
                  <p className="text-[10px] text-muted-foreground/60">Update how you appear to your AI companions.</p>
                </div>

                {/* Avatar Selection presets */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 block">Select Avatar Preset</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {PRESET_AVATARS.map((preset) => {
                      const isSelected = avatarUrl === preset.url;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setAvatarUrl(preset.url)}
                          className={`relative aspect-square rounded-2xl bg-background border overflow-hidden p-1 transition-all duration-300 cursor-pointer group hover:scale-105 ${
                            isSelected 
                              ? 'border-primary ring-2 ring-primary-glow bg-card' 
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={preset.url} alt={preset.name} className="w-full h-full rounded-xl bg-background" />
                          <div className="absolute inset-x-0 bottom-0 bg-background/90 py-0.5 text-[8px] text-muted-foreground text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {preset.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Avatar Link */}
                <div className="space-y-1.5">
                  <label htmlFor="avatar-input" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 block">Avatar URL</label>
                  <input
                    id="avatar-input"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Enter custom image/avatar URL..."
                    className="w-full px-4 py-3 bg-background border border-border focus:border-primary/50 rounded-xl text-foreground text-xs focus:outline-none transition-all placeholder:text-muted-foreground/40 font-light"
                  />
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name-input" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 block">Display Name</label>
                  <input
                    id="name-input"
                    type="text"
                    required
                    maxLength={30}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Explorer"
                    className="w-full px-4 py-3 bg-background border border-border focus:border-primary/50 rounded-xl text-foreground text-xs focus:outline-none transition-all placeholder:text-muted-foreground/40 font-light"
                  />
                </div>

                {/* User Email (View Only) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 block">Account Email</label>
                  <div className="w-full px-4 py-3 bg-background/40 border border-border/60 text-muted-foreground/50 rounded-xl text-xs cursor-not-allowed select-none font-light">
                    {user?.email}
                  </div>
                </div>

                {/* Save Changes Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-rose-soft/85 disabled:opacity-40 text-background font-bold rounded-xl text-xs shadow-md shadow-primary/5 cursor-pointer transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Profile changes</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-cream-warm">AI & Appearance</h2>
                  <p className="text-[10px] text-muted-foreground/60">Fine-tune how your AI responds and how the interface looks.</p>
                </div>

                {/* Theme Preference */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 block">Theme Preferences</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (theme !== 'dark') toggleTheme();
                      }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-semibold transition-all duration-300 cursor-pointer ${
                        theme === 'dark'
                          ? 'border-primary/80 bg-primary-glow text-primary'
                          : 'border-border bg-card/25 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Moon size={14} />
                      Dark Mode
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (theme !== 'light') toggleTheme();
                      }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-semibold transition-all duration-300 cursor-pointer ${
                        theme === 'light'
                          ? 'border-primary/80 bg-primary-glow text-primary'
                          : 'border-border bg-card/25 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Sun size={14} />
                      Light Mode
                    </button>
                  </div>
                </div>

                {/* Default Companion */}
                <div className="space-y-1.5">
                  <label htmlFor="default-companion-select" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 block">Default Companion</label>
                  <select
                    id="default-companion-select"
                    value={defaultCompanion}
                    onChange={(e) => setDefaultCompanion(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border text-foreground text-xs rounded-xl focus:outline-none focus:border-primary/50 transition-all font-light"
                  >
                    <option value="">Default (Solace Chat)</option>
                    <option value="Nova">Nova (Empathetic Companion)</option>
                    <option value="Zephyr">Zephyr (Witty Brainstormer)</option>
                    <option value="Astra">Astra (Academic Mentor)</option>
                    <option value="Echo">Echo (Philosophical Sage)</option>
                  </select>
                </div>

                {/* AI Response Style */}
                <div className="space-y-1.5">
                  <label htmlFor="response-style-select" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 block">AI Response Style</label>
                  <select
                    id="response-style-select"
                    value={aiResponseStyle}
                    onChange={(e) => setAiResponseStyle(e.target.value as 'concise' | 'balanced' | 'detailed')}
                    className="w-full px-4 py-2.5 bg-background border border-border text-foreground text-xs rounded-xl focus:outline-none focus:border-primary/50 transition-all font-light"
                  >
                    <option value="balanced">Balanced (Natural Conversation)</option>
                    <option value="concise">Concise (Direct & Brief Answers)</option>
                    <option value="detailed">Detailed (Elaborate Explanations)</option>
                  </select>
                </div>

                {/* AI Temperature Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">
                    <label htmlFor="temp-slider">AI Creativity (Temperature)</label>
                    <span className="text-primary font-bold">{aiTemperature.toFixed(1)}</span>
                  </div>
                  <input
                    id="temp-slider"
                    type="range"
                    min={0.2}
                    max={1.2}
                    step={0.1}
                    value={aiTemperature}
                    onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                    className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[8px] text-muted-foreground/50 mt-1 font-light">
                    <span>Analytical (0.2)</span>
                    <span>Balanced</span>
                    <span>Creative (1.2)</span>
                  </div>
                </div>

                {/* Notification Preferences (Prepared Structure) */}
                <div className="pt-2 border-t border-border">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 flex items-center gap-1.5 mb-3">
                    <Bell size={12} />
                    Notification preferences (Mock Structure)
                  </label>
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <h4 className="text-xs font-semibold text-cream-warm">Daily check-in reminders</h4>
                      <p className="text-[9px] text-muted-foreground/60 leading-normal font-light">Get email indicators encouraging daily journaling.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                      className={`relative w-8 h-4 rounded-full transition-colors duration-300 cursor-pointer ${
                        notificationsEnabled ? 'bg-primary' : 'bg-border'
                      }`}
                    >
                      <motion.span
                        layout
                        className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm"
                        animate={{ x: notificationsEnabled ? 16 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>

                {/* Save Preferences Button */}
                <button
                  onClick={handleSavePreferences}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-rose-soft/85 disabled:opacity-40 text-background font-bold rounded-xl text-xs shadow-md shadow-primary/5 cursor-pointer transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Saving preferences...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save AI & Appearance settings</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                
                {/* Change Password Form */}
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-cream-warm">Security Credentials</h2>
                    <p className="text-[10px] text-muted-foreground/60">Update your account login password below.</p>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5 relative">
                    <label htmlFor="new-pwd-input" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 block">New Password</label>
                    <input
                      id="new-pwd-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters..."
                      className="w-full px-4 py-3 bg-background border border-border focus:border-primary/50 rounded-xl text-foreground text-xs focus:outline-none transition-all placeholder:text-muted-foreground/40 font-light"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 bottom-3.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-300"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5 relative">
                    <label htmlFor="confirm-pwd-input" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 block">Confirm New Password</label>
                    <input
                      id="confirm-pwd-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password..."
                      className="w-full px-4 py-3 bg-background border border-border focus:border-primary/50 rounded-xl text-foreground text-xs focus:outline-none transition-all placeholder:text-muted-foreground/40 font-light"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !newPassword}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-card border border-border hover:border-primary/20 hover:text-foreground text-muted-foreground font-bold rounded-xl text-xs shadow-md cursor-pointer transition-all duration-300"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>Update password</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Account Management (Delete Account) */}
                <div className="pt-6 border-t border-red-500/10 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-red-400 animate-pulse" />
                      Danger Zone
                    </h3>
                    <p className="text-[9px] text-muted-foreground/60 leading-relaxed mt-0.5 font-light">
                      Deleting your account removes all conversations, messages, and configurations permanently. This action cannot be undone.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => { handleClearMessages(); setShowDeleteModal(true); }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer w-full"
                  >
                    <Trash2 size={12} />
                    Delete Account
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* Account Deletion Double-Confirmation Modal Dialog */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-card border border-red-500/20 rounded-3xl p-6 space-y-5 shadow-2xl z-10"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-cream-warm">Delete Account Permanently?</h3>
                <p className="text-[10px] text-muted-foreground/60 leading-normal font-light">
                  All companions, chats, and records will be deleted. To verify, please type <b className="text-foreground font-bold">&quot;delete my account&quot;</b> below.
                </p>
              </div>
            </div>

            <input
              type="text"
              required
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type confirmation text..."
              className="w-full px-4 py-3 bg-background border border-border focus:border-red-500/50 rounded-xl text-foreground text-xs focus:outline-none transition-all placeholder:text-muted-foreground/45 font-light"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="flex-1 py-2.5 rounded-xl text-xs bg-card hover:bg-card/85 font-bold text-muted-foreground cursor-pointer transition-all duration-300 border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.toLowerCase() !== 'delete my account' || loading}
                className="flex-1 py-2.5 rounded-xl text-xs bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-bold cursor-pointer transition-all duration-300 shadow-md"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={14} /> : 'Yes, Delete Account'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </main>
  );
}
