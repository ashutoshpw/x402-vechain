import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, bigint, index, uniqueIndex } from 'drizzle-orm/pg-core'

/**
 * Users table - Stores wallet addresses and user profiles
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLogin: timestamp('last_login'),
}, (table) => ({
  walletAddressIdx: index('wallet_address_idx').on(table.walletAddress),
}))

/**
 * API Keys table - Stores API key hashes and permissions
 */
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull().unique(),
  permissions: jsonb('permissions').default([]).notNull(), // Array of permission strings
  isActive: boolean('is_active').default(true).notNull(),
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  keyHashIdx: index('key_hash_idx').on(table.keyHash),
  userIdIdx: index('api_keys_user_id_idx').on(table.userId),
  isActiveIdx: index('is_active_idx').on(table.isActive),
}))

/**
 * Transactions table - Stores settlement history
 */
export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  txHash: varchar('tx_hash', { length: 66 }).notNull().unique(),
  fromAddress: varchar('from_address', { length: 42 }).notNull(),
  toAddress: varchar('to_address', { length: 42 }).notNull(),
  amount: varchar('amount', { length: 78 }).notNull(), // Store as string to handle big numbers
  tokenAddress: varchar('token_address', { length: 42 }),
  network: varchar('network', { length: 50 }).notNull(), // 'testnet' or 'mainnet'
  status: varchar('status', { length: 50 }).notNull(), // 'pending', 'confirmed', 'failed'
  blockNumber: bigint('block_number', { mode: 'number' }),
  gasUsed: varchar('gas_used', { length: 78 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  txHashIdx: index('tx_hash_idx').on(table.txHash),
  userIdIdx: index('transactions_user_id_idx').on(table.userId),
  networkIdx: index('network_idx').on(table.network),
  statusIdx: index('status_idx').on(table.status),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}))

/**
 * Nonces table - Cache for replay attack prevention
 */
export const nonces = pgTable('nonces', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  nonce: varchar('nonce', { length: 255 }).notNull(),
  usedAt: timestamp('used_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => ({
  walletNonceIdx: index('wallet_nonce_idx').on(table.walletAddress, table.nonce),
  expiresAtIdx: index('expires_at_idx').on(table.expiresAt),
  // Unique constraint to prevent race conditions in concurrent requests
  uniqueWalletNonce: uniqueIndex('unique_wallet_nonce').on(table.walletAddress, table.nonce),
}))

/**
 * Fee Delegation Logs table - Tracks gas sponsorship history
 */
export const feeDelegationLogs = pgTable('fee_delegation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  txHash: varchar('tx_hash', { length: 66 }).notNull(),
  userAddress: varchar('user_address', { length: 42 }).notNull(),
  vthoSpent: varchar('vtho_spent', { length: 78 }).notNull(), // Store as string to handle big numbers
  network: varchar('network', { length: 50 }).notNull(), // 'testnet' or 'mainnet'
  blockNumber: bigint('block_number', { mode: 'number' }),
  status: varchar('status', { length: 50 }).notNull(), // 'success', 'failed', 'reverted'
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  txHashIdx: index('fee_delegation_tx_hash_idx').on(table.txHash),
  userAddressIdx: index('fee_delegation_user_address_idx').on(table.userAddress),
  networkIdx: index('fee_delegation_network_idx').on(table.network),
  createdAtIdx: index('fee_delegation_created_at_idx').on(table.createdAt),
  statusIdx: index('fee_delegation_status_idx').on(table.status),
}))
