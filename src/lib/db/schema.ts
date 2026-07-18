import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * Public User Profiles table.
 * It is linked 1:1 to Supabase Auth's internal auth.users table.
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().notNull(), // Maps directly to auth.users(id)
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  preferences: jsonb('preferences').$type<{
    theme?: 'light' | 'dark' | 'system';
    notificationsEnabled?: boolean;
    aiTemperature?: number;
    aiResponseStyle?: 'concise' | 'balanced' | 'detailed';
    defaultCompanion?: string;
  }>().default({
    theme: 'dark',
    notificationsEnabled: true,
    aiTemperature: 0.8,
    aiResponseStyle: 'balanced',
    defaultCompanion: '',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Conversations table.
 * Groups chat messages between a user and their companion.
 */
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  companionName: text('companion_name').notNull(),
  companionAvatar: text('companion_avatar'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Messages table.
 * Stores individual chat bubbles in conversations.
 */
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
