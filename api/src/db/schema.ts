// ─────────────────────────────────────────────────────────────────────────────
// این فایل کپی مستقیم schema ربات است.
// هر بار که schema ربات تغییر کرد، این فایل را هم آپدیت کن.
// مسیر اصلی: bot/src/db/schema.ts
// ─────────────────────────────────────────────────────────────────────────────

import {
  bigint,
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  decimal,
  jsonb,
  serial,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👤 USERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const usersTable = pgTable(
  "users",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    languageCode: text("language_code"),
    role: text("role").default("customer"),
    isBlocked: boolean("is_blocked").default(false),
    blockedReason: text("blocked_reason"),
    walletBalance: decimal("wallet_balance", {
      precision: 15,
      scale: 2,
    }).default("0"),
    referralCode: text("referral_code").unique(),
    referredBy: bigint("referred_by", { mode: "number" }),
    notifyOrders: boolean("notify_orders").default(true),
    notifyWallet: boolean("notify_wallet").default(true),
    notifyPromotions: boolean("notify_promotions").default(true),
    notifyReferrals: boolean("notify_referrals").default(true),
    notifyStock: boolean("notify_stock").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username),
    roleIdx: index("users_role_idx").on(table.role),
  }),
);

export type User = typeof usersTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛍️ PRODUCTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Category = typeof categoriesTable.$inferSelect;

export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    image: text("image"),
    categoryId: integer("category_id").references(() => categoriesTable.id),
    // automatic | manual | custom_schedule | invite | code | family_join | renewable | reservation
    deliveryType: text("delivery_type").notNull(),
    requiresEmail: boolean("requires_email").default(false),
    requiresOtp: boolean("requires_otp").default(false),
    requiresLogin: boolean("requires_login").default(false),
    requiresRegion: boolean("requires_region").default(false),
    isRenewable: boolean("is_renewable").default(false),
    canUnlockPerks: boolean("can_unlock_perks").default(false),
    canNotifyStock: boolean("can_notify_stock").default(true),
    isActive: boolean("is_active").default(true),
    stock: integer("stock").default(0),
    minStock: integer("min_stock").default(5),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    categoryIdIdx: index("products_category_id_idx").on(table.categoryId),
    slugIdx: index("products_slug_idx").on(table.slug),
  }),
);

export type Product = typeof productsTable.$inferSelect;

export const productPlansTable = pgTable(
  "product_plans",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: decimal("price", { precision: 15, scale: 2 }).notNull(),
    duration: integer("duration"),
    durationUnit: text("duration_unit"), // day | month | year
    // Per-plan delivery requirements (override product-level defaults)
    requiresEmail: boolean("requires_email").default(false),
    requiresOtp: boolean("requires_otp").default(false),
    requiresLogin: boolean("requires_login").default(false),
    requiresRegion: boolean("requires_region").default(false),
    order: integer("order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    productIdIdx: index("product_plans_product_id_idx").on(table.productId),
  }),
);

export type ProductPlan = typeof productPlansTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// � PRODUCT CONFIGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const productConfigsTable = pgTable(
  "product_configs",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    planId: integer("plan_id").references(() => productPlansTable.id, {
      onDelete: "set null",
    }),
    configData: text("config_data").notNull(),
    label: text("label"),
    isUsed: boolean("is_used").default(false),
    orderId: integer("order_id"),
    assignedAt: timestamp("assigned_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    productIdIdx: index("product_configs_product_id_idx").on(table.productId),
    planIdIdx: index("product_configs_plan_id_idx").on(table.planId),
    isUsedIdx: index("product_configs_is_used_idx").on(table.isUsed),
  }),
);

export type ProductConfig = typeof productConfigsTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// �📦 ORDERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ordersTable = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id),
    planId: integer("plan_id")
      .notNull()
      .references(() => productPlansTable.id),
    status: text("status").default("pending_payment"),
    quantity: integer("quantity").default(1),
    totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),
    discountAmount: decimal("discount_amount", {
      precision: 15,
      scale: 2,
    }).default("0"),
    walletUsed: decimal("wallet_used", { precision: 15, scale: 2 }).default(
      "0",
    ),
    finalPrice: decimal("final_price", { precision: 15, scale: 2 }).notNull(),
    paymentMethod: text("payment_method"), // card | zarinpal | crypto | wallet
    paymentId: text("payment_id"),
    discountCodeId: integer("discount_code_id"),
    scheduledTime: timestamp("scheduled_time"),
    schedule: jsonb("schedule"),
    delivery: jsonb("delivery"),
    deliveredAt: timestamp("delivered_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("orders_user_id_idx").on(table.userId),
    statusIdx: index("orders_status_idx").on(table.status),
    productIdIdx: index("orders_product_id_idx").on(table.productId),
  }),
);

export type Order = typeof ordersTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💳 SUBSCRIPTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    orderId: integer("order_id")
      .notNull()
      .references(() => ordersTable.id),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    renewalDate: timestamp("renewal_date"),
    status: text("status").default("active"), // active | expiring_soon | expired | cancelled
    reminderSent: boolean("reminder_sent").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
    endDateIdx: index("subscriptions_end_date_idx").on(table.endDate),
    statusIdx: index("subscriptions_status_idx").on(table.status),
  }),
);

export type Subscription = typeof subscriptionsTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 WALLET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const walletTransactionsTable = pgTable(
  "wallet_transactions",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => ordersTable.id),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    type: text("type").notNull(), // credit | debit
    source: text("source").notNull(), // purchase | recharge | refund | referral | reward | perk | manual
    description: text("description"),
    balanceBefore: decimal("balance_before", { precision: 15, scale: 2 }),
    balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("wallet_transactions_user_id_idx").on(table.userId),
    typeIdx: index("wallet_transactions_type_idx").on(table.type),
  }),
);

export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎫 TICKETS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ticketsTable = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => ordersTable.id),
    forumGroupId: bigint("forum_group_id", { mode: "number" }),
    topicId: integer("topic_id"),
    threadMessageId: bigint("thread_message_id", { mode: "number" }),
    ticketNumber: text("ticket_number").notNull().unique(),
    type: text("type").notNull(), // support | order | report
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("open"), // open | waiting_user | waiting_support | in_progress | resolved | closed | blocked
    priority: text("priority").default("normal"), // low | normal | high | urgent
    assignedTo: bigint("assigned_to", { mode: "number" }).references(
      () => usersTable.id,
    ),
    assignedAt: timestamp("assigned_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    closedAt: timestamp("closed_at"),
    firstResponseAt: timestamp("first_response_at"),
    messageCount: integer("message_count").default(0),
    lastMessageAt: timestamp("last_message_at"),
  },
  (table) => ({
    userIdIdx: index("tickets_user_id_idx").on(table.userId),
    statusIdx: index("tickets_status_idx").on(table.status),
    typeIdx: index("tickets_type_idx").on(table.type),
    ticketNumberIdx: uniqueIndex("tickets_ticket_number_idx").on(
      table.ticketNumber,
    ),
    threadMessageIdIdx: index("tickets_thread_message_id_idx").on(
      table.threadMessageId,
    ),
  }),
);

export type Ticket = typeof ticketsTable.$inferSelect;

export const ticketMessagesTable = pgTable(
  "ticket_messages",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => ticketsTable.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id),
    messageId: bigint("message_id", { mode: "number" }),
    message: text("message").notNull(),
    attachments: jsonb("attachments"),
    isFromUser: boolean("is_from_user").default(true),
    isSystemMessage: boolean("is_system_message").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    ticketIdIdx: index("ticket_messages_ticket_id_idx").on(table.ticketId),
    messageIdIdx: index("ticket_messages_message_id_idx").on(table.messageId),
  }),
);

export type TicketMessage = typeof ticketMessagesTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎁 DISCOUNT CODES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const discountCodesTable = pgTable(
  "discount_codes",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    description: text("description"),
    type: text("type").notNull(), // percentage | fixed
    value: decimal("value", { precision: 15, scale: 2 }).notNull(),
    maxDiscount: decimal("max_discount", { precision: 15, scale: 2 }),
    minOrderAmount: decimal("min_order_amount", { precision: 15, scale: 2 }),
    maxUses: integer("max_uses"),
    maxUsesPerUser: integer("max_uses_per_user").default(1),
    currentUses: integer("current_uses").default(0),
    productIds: jsonb("product_ids"),
    userIds: jsonb("user_ids"),
    expiresAt: timestamp("expires_at"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    codeIdx: uniqueIndex("discount_codes_code_idx").on(table.code),
  }),
);

export type DiscountCode = typeof discountCodesTable.$inferSelect;

export const discountUsageTable = pgTable(
  "discount_usage",
  {
    id: serial("id").primaryKey(),
    codeId: integer("code_id")
      .notNull()
      .references(() => discountCodesTable.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id),
    orderId: integer("order_id").references(() => ordersTable.id),
    discountAmount: decimal("discount_amount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    usedAt: timestamp("used_at").defaultNow(),
  },
  (table) => ({
    codeIdIdx: index("discount_usage_code_id_idx").on(table.codeId),
    userIdIdx: index("discount_usage_user_id_idx").on(table.userId),
  }),
);

export type DiscountUsage = typeof discountUsageTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👥 REFERRAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const referralRewardsTable = pgTable(
  "referral_rewards",
  {
    id: serial("id").primaryKey(),
    referrerId: bigint("referrer_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    referredUserId: bigint("referred_user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id),
    rewardType: text("reward_type").notNull(), // wallet_credit | discount
    rewardValue: decimal("reward_value", { precision: 15, scale: 2 }).notNull(),
    status: text("status").default("pending"), // pending | awarded | cancelled
    awardedAt: timestamp("awarded_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    referrerIdIdx: index("referral_rewards_referrer_id_idx").on(
      table.referrerId,
    ),
  }),
);

export type ReferralReward = typeof referralRewardsTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 PERKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const perksTasksTable = pgTable("perks_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // join_channel | invite_friend | instagram_story | tweet | review | first_purchase | renew_subscription | complete_profile
  taskData: jsonb("task_data"),
  rewardType: text("reward_type").notNull(), // wallet_credit | discount | free_product
  rewardValue: decimal("reward_value", { precision: 15, scale: 2 }),
  rewardProductId: integer("reward_product_id").references(
    () => productsTable.id,
  ),
  maxRewards: integer("max_rewards"),
  currentRewards: integer("current_rewards").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PerksTask = typeof perksTasksTable.$inferSelect;

export const userPerksTable = pgTable(
  "user_perks",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => perksTasksTable.id),
    status: text("status").default("pending"), // pending | completed | verified | claimed
    verificationData: jsonb("verification_data"),
    completedAt: timestamp("completed_at"),
    claimedAt: timestamp("claimed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_perks_user_id_idx").on(table.userId),
    taskIdIdx: index("user_perks_task_id_idx").on(table.taskId),
  }),
);

export type UserPerks = typeof userPerksTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏰ TIME SLOT TEMPLATES (Admin-defined)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const timeSlotTemplatesTable = pgTable("time_slot_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(), // "10:00"
  capacity: integer("capacity").notNull().default(1),
  productIds: jsonb("product_ids"), // null = all products
  daysOfWeek: jsonb("days_of_week").default([0, 1, 2, 3, 4, 5, 6]).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TimeSlotTemplate = typeof timeSlotTemplatesTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏰ SCHEDULES (Per-booking)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const schedulesTable = pgTable(
  "schedules",
  {
    id: serial("id").primaryKey(),
    templateId: integer("template_id").references(
      () => timeSlotTemplatesTable.id,
      { onDelete: "set null" },
    ),
    orderId: integer("order_id").references(() => ordersTable.id, {
      onDelete: "cascade",
    }),
    userId: bigint("user_id", { mode: "number" }).references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),
    date: text("date").notNull(), // YYYY-MM-DD
    timeSlot: text("time_slot").notNull(), // "09:00-10:00"
    capacity: integer("capacity").notNull().default(1),
    currentBookings: integer("current_bookings").default(0),
    reminderSent: boolean("reminder_sent").default(false),
    reminderTime: timestamp("reminder_time"),
    sessionStartNotified: boolean("session_start_notified").default(false),
    sessionTicketId: integer("session_ticket_id"),
    status: text("status").default("available"), // available | full | in_progress | completed | cancelled
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orderIdIdx: index("schedules_order_id_idx").on(table.orderId),
    userIdIdx: index("schedules_user_id_idx").on(table.userId),
    dateIdx: index("schedules_date_idx").on(table.date),
    templateDateIdx: index("schedules_template_date_idx").on(
      table.templateId,
      table.date,
    ),
  }),
);

export type Schedule = typeof schedulesTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔔 STOCK NOTIFICATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const stockNotificationsTable = pgTable(
  "stock_notifications",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").default(true),
    notificationSent: boolean("notification_sent").default(false),
    notificationSentAt: timestamp("notification_sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdProductIdIdx: uniqueIndex("stock_notifications_user_product_idx").on(
      table.userId,
      table.productId,
    ),
  }),
);

export type StockNotification = typeof stockNotificationsTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 INVITES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const invitesTable = pgTable(
  "invites",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id),
    email: text("email").notNull(),
    status: text("status").default("pending"), // pending | sent | accepted | rejected
    sentAt: timestamp("sent_at"),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    orderIdIdx: index("invites_order_id_idx").on(table.orderId),
    userIdIdx: index("invites_user_id_idx").on(table.userId),
  }),
);

export type Invite = typeof invitesTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👑 ADMINS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const adminsTable = pgTable(
  "admins",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .unique()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    email: text("email"),
    phone: text("phone"),
    role: text("role").notNull().default("support"), // admin | support | manager | operator
    isActive: boolean("is_active").default(true),
    isSuperAdmin: boolean("is_super_admin").default(false),
    permissions: jsonb("permissions").default("{}"),
    allowedSections: jsonb("allowed_sections"),
    restrictedIPs: jsonb("restricted_ips"),
    lastLoginAt: timestamp("last_login_at"),
    lastActivityAt: timestamp("last_activity_at"),
    loginCount: integer("login_count").default(0),
    notes: text("notes"),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    createdBy: bigint("created_by", { mode: "number" }).references(
      () => usersTable.id,
    ),
  },
  (table) => ({
    userIdIdx: uniqueIndex("admins_user_id_idx").on(table.userId),
    roleIdx: index("admins_role_idx").on(table.role),
    isActiveIdx: index("admins_is_active_idx").on(table.isActive),
  }),
);

export type Admin = typeof adminsTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 ADMIN SESSIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const adminSessionsTable = pgTable(
  "admin_sessions",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id")
      .notNull()
      .references(() => adminsTable.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at").notNull(),
    lastActivityAt: timestamp("last_activity_at"),
    isValid: boolean("is_valid").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("admin_sessions_token_idx").on(table.token),
    adminIdIdx: index("admin_sessions_admin_id_idx").on(table.adminId),
    expiresAtIdx: index("admin_sessions_expires_at_idx").on(table.expiresAt),
  }),
);

export type AdminSession = typeof adminSessionsTable.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📝 ADMIN LOGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const adminLogsTable = pgTable(
  "admin_logs",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id")
      .notNull()
      .references(() => adminsTable.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    changes: jsonb("changes"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    description: text("description"),
    severity: text("severity").default("info"), // info | warning | critical
    isSuccess: boolean("is_success").default(true),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    adminIdIdx: index("admin_logs_admin_id_idx").on(table.adminId),
    userIdIdx: index("admin_logs_user_id_idx").on(table.userId),
    entityTypeIdx: index("admin_logs_entity_type_idx").on(table.entityType),
    actionIdx: index("admin_logs_action_idx").on(table.action),
    createdAtIdx: index("admin_logs_created_at_idx").on(table.createdAt),
  }),
);

export type AdminLog = typeof adminLogsTable.$inferSelect;
