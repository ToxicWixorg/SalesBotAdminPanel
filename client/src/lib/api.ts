// ─────────────────────────────────────────────────────────────────────────────
// Axios instance با base URL و JWT interceptor
//
// - baseURL از env می‌خواند
// - token رو از localStorage می‌گیرد و به هر request اضافه می‌کند
// - اگر 401 برگشت، کاربر را به /login هدایت می‌کند
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === "true";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: اضافه کردن JWT
api.interceptors.request.use((config) => {
  if (DEV_BYPASS) return config; // در dev bypass نیازی به token نیست
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: مدیریت 401 و mock در dev bypass
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("error: ", error);
    console.log("errConfig: ", error.config);
    console.log("url: ", error.config?.url);
    // در dev bypass به جای خطا، داده خالی برمی‌گردانیم
    if (DEV_BYPASS) {
      const url = error.config?.url ?? "";
      const mockData = getDevMockData(url);
      return Promise.resolve({
        data: mockData,
        status: 200,
        headers: {},
        config: error.config,
      });
    }
    if (error.response?.status === 401) {
      localStorage.removeItem("admin_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

function getDevMockData(url: string): unknown {
  if (url.includes("dashboard/stats"))
    return {
      todayOrders: 12,
      todayRevenue: "4,850,000",
      newUsersToday: 5,
      openTickets: 3,
      pendingAdminOrders: 2,
      totalUsers: 142,
      ordersByStatus: [
        { status: "pending_payment", count: 2 },
        { status: "paid", count: 4 },
        { status: "pending_admin", count: 2 },
        { status: "completed", count: 8 },
        { status: "cancelled", count: 1 },
      ],
    };
  if (url.includes("dashboard/pending"))
    return {
      pendingOrders: [
        {
          id: 7,
          productName: "Netflix Premium",
          userName: "علی محمدی",
          createdAt: "2026-05-01T10:23:00Z",
        },
        {
          id: 8,
          productName: "Spotify Family",
          userName: "سارا رضایی",
          createdAt: "2026-05-01T11:05:00Z",
        },
      ],
      urgentTickets: [
        {
          id: 3,
          subject: "سفارشم تحویل داده نشد",
          userName: "رضا کریمی",
          priority: "urgent",
        },
      ],
      waitingInvites: [],
    };
  if (url.includes("dashboard/orders-chart"))
    return [
      { date: "2026-04-25", count: 5, revenue: "1800000" },
      { date: "2026-04-26", count: 8, revenue: "3200000" },
      { date: "2026-04-27", count: 3, revenue: "900000" },
      { date: "2026-04-28", count: 11, revenue: "4200000" },
      { date: "2026-04-29", count: 7, revenue: "2600000" },
      { date: "2026-04-30", count: 9, revenue: "3500000" },
      { date: "2026-05-01", count: 12, revenue: "4850000" },
    ];

  if (url.includes("admin/categories"))
    return [
      { id: 1, name: "استریمینگ" },
      { id: 2, name: "موزیک" },
      { id: 3, name: "VPN" },
      { id: 4, name: "آموزشی" },
    ];

  if (/admin\/products\/\d+\/plans/.test(url))
    return [
      {
        id: 1,
        productId: 1,
        name: "۱ ماهه",
        description: null,
        price: "320000",
        duration: 1,
        durationUnit: "month",
        order: 1,
        isActive: true,
      },
      {
        id: 2,
        productId: 1,
        name: "۳ ماهه",
        description: null,
        price: "850000",
        duration: 3,
        durationUnit: "month",
        order: 2,
        isActive: true,
      },
      {
        id: 3,
        productId: 1,
        name: "۱ ساله",
        description: null,
        price: "2800000",
        duration: 1,
        durationUnit: "year",
        order: 3,
        isActive: true,
      },
    ];

  if (url.includes("admin/products"))
    return [
      {
        id: 1,
        name: "Netflix Premium 1 ماهه",
        categoryName: "استریمینگ",
        deliveryType: "custom_schedule",
        stock: 15,
        isActive: true,
        price: "320000",
      },
      {
        id: 2,
        name: "Spotify Family 3 ماهه",
        categoryName: "موزیک",
        deliveryType: "invite",
        stock: 8,
        isActive: true,
        price: "250000",
      },
      {
        id: 3,
        name: "VPN Pro سالانه",
        categoryName: "VPN",
        deliveryType: "code",
        stock: 50,
        isActive: true,
        price: "980000",
      },
      {
        id: 4,
        name: "YouTube Premium 6 ماهه",
        categoryName: "استریمینگ",
        deliveryType: "family_join",
        stock: 3,
        isActive: false,
        price: "450000",
      },
      {
        id: 5,
        name: "Duolingo Plus 1 ماهه",
        categoryName: "آموزشی",
        deliveryType: "automatic",
        stock: 100,
        isActive: true,
        price: "120000",
      },
    ];

  if (url.includes("admin/orders")) {
    const mockOrders = [
      {
        order: {
          id: 101,
          status: "pending_admin",
          finalPrice: "320000",
          paymentMethod: "card",
          createdAt: "2026-05-01T09:15:00Z",
        },
        user: { firstName: "علی محمدی", username: "ali_m" },
        product: { name: "Netflix Premium" },
        plan: { id: 1, name: "پرمیوم" },
      },
      {
        order: {
          id: 102,
          status: "completed",
          finalPrice: "250000",
          paymentMethod: "zarinpal",
          createdAt: "2026-05-01T08:30:00Z",
        },
        user: { firstName: "سارا رضایی", username: "sara_r" },
        product: { name: "Spotify Family" },
        plan: { id: 2, name: "خانوادگی" },
      },
      {
        order: {
          id: 103,
          status: "paid",
          finalPrice: "980000",
          paymentMethod: "crypto",
          createdAt: "2026-04-30T22:10:00Z",
        },
        user: { firstName: "محمد حسینی", username: "mhosseini" },
        product: { name: "VPN Pro" },
        plan: { id: 3, name: "سالانه" },
      },
      {
        order: {
          id: 104,
          status: "waiting_invite",
          finalPrice: "120000",
          paymentMethod: "wallet",
          createdAt: "2026-04-30T18:45:00Z",
        },
        user: { firstName: "نازنین احمدی", username: "naz_a" },
        product: { name: "Duolingo Plus" },
        plan: { id: 4, name: "ماهانه" },
      },
      {
        order: {
          id: 105,
          status: "cancelled",
          finalPrice: "450000",
          paymentMethod: "card",
          createdAt: "2026-04-29T14:20:00Z",
        },
        user: { firstName: "رضا کریمی", username: "reza_k" },
        product: { name: "YouTube Premium" },
        plan: { id: 5, name: "پرمیوم" },
      },
    ];
    const urlParams = new URLSearchParams(
      url.includes("?") ? url.split("?")[1] : "",
    );
    const statusFilter = urlParams.get("status");
    return statusFilter
      ? mockOrders.filter((item) => item.order.status === statusFilter)
      : mockOrders;
  }

  if (/admin\/users\/\d+/.test(url)) {
    const userId = parseInt(url.match(/admin\/users\/(\d+)/)?.[1] ?? "0");
    const mockUsers = [
      {
        id: 1001,
        firstName: "علی",
        username: "ali_m",
        role: "customer",
        walletBalance: "120000",
        isBlocked: false,
        createdAt: "2026-01-15T10:00:00Z",
      },
      {
        id: 1002,
        firstName: "سارا",
        username: "sara_r",
        role: "customer",
        walletBalance: "0",
        isBlocked: false,
        createdAt: "2026-02-03T14:30:00Z",
      },
      {
        id: 1003,
        firstName: "محمد",
        username: "mhosseini",
        role: "customer",
        walletBalance: "450000",
        isBlocked: false,
        createdAt: "2026-02-20T09:15:00Z",
      },
      {
        id: 1004,
        firstName: "نازنین",
        username: "naz_a",
        role: "customer",
        walletBalance: "75000",
        isBlocked: true,
        createdAt: "2026-03-01T11:00:00Z",
      },
      {
        id: 1005,
        firstName: "رضا",
        username: "reza_k",
        role: "support",
        walletBalance: "200000",
        isBlocked: false,
        createdAt: "2025-12-10T08:00:00Z",
      },
    ];
    return mockUsers.find((u) => u.id === userId) ?? null;
  }

  if (url.includes("admin/users")) {
    const p = new URLSearchParams(url.split("?")[1] ?? "");
    const roleFilter = p.get("role");
    const isBlockedFilter = p.get("isBlocked");
    const searchFilter = (p.get("search") ?? "").toLowerCase();
    let mockUsers = [
      {
        id: 1001,
        firstName: "علی",
        username: "ali_m",
        role: "customer",
        walletBalance: "120000",
        isBlocked: false,
        createdAt: "2026-01-15T10:00:00Z",
      },
      {
        id: 1002,
        firstName: "سارا",
        username: "sara_r",
        role: "customer",
        walletBalance: "0",
        isBlocked: false,
        createdAt: "2026-02-03T14:30:00Z",
      },
      {
        id: 1003,
        firstName: "محمد",
        username: "mhosseini",
        role: "customer",
        walletBalance: "450000",
        isBlocked: false,
        createdAt: "2026-02-20T09:15:00Z",
      },
      {
        id: 1004,
        firstName: "نازنین",
        username: "naz_a",
        role: "customer",
        walletBalance: "75000",
        isBlocked: true,
        createdAt: "2026-03-01T11:00:00Z",
      },
      {
        id: 1005,
        firstName: "رضا",
        username: "reza_k",
        role: "support",
        walletBalance: "200000",
        isBlocked: false,
        createdAt: "2025-12-10T08:00:00Z",
      },
    ];
    if (roleFilter) mockUsers = mockUsers.filter((u) => u.role === roleFilter);
    if (isBlockedFilter !== null && isBlockedFilter !== "")
      mockUsers = mockUsers.filter(
        (u) => String(u.isBlocked) === isBlockedFilter,
      );
    if (searchFilter)
      mockUsers = mockUsers.filter(
        (u) =>
          u.firstName.toLowerCase().includes(searchFilter) ||
          u.username.toLowerCase().includes(searchFilter),
      );
    return mockUsers;
  }

  const mockTickets = [
    {
      ticket: {
        id: 1,
        title: "سفارشم تحویل داده نشد",
        type: "order",
        priority: "urgent",
        status: "open",
        createdAt: "2026-05-01T10:00:00Z",
      },
      user: { firstName: "رضا", username: "reza_k" },
    },
    {
      ticket: {
        id: 2,
        title: "درخواست استرداد وجه",
        type: "support",
        priority: "high",
        status: "in_progress",
        createdAt: "2026-04-30T16:30:00Z",
      },
      user: { firstName: "علی", username: "ali_m" },
    },
    {
      ticket: {
        id: 3,
        title: "سوال درباره محصول Netflix",
        type: "support",
        priority: "normal",
        status: "waiting_user",
        createdAt: "2026-04-29T12:00:00Z",
      },
      user: { firstName: "سارا", username: "sara_r" },
    },
    {
      ticket: {
        id: 4,
        title: "کد تخفیف کار نمی‌کند",
        type: "report",
        priority: "normal",
        status: "resolved",
        createdAt: "2026-04-28T09:45:00Z",
      },
      user: { firstName: "محمد", username: "mhosseini" },
    },
    {
      ticket: {
        id: 5,
        title: "مشکل در ورود به اکانت",
        type: "support",
        priority: "high",
        status: "waiting_support",
        createdAt: "2026-04-27T08:00:00Z",
      },
      user: { firstName: "نازنین", username: "naz_a" },
    },
  ];

  if (/admin\/tickets\/\d+/.test(url)) {
    const ticketId = parseInt(url.match(/admin\/tickets\/(\d+)/)?.[1] ?? "0");
    const found = mockTickets.find((t) => t.ticket.id === ticketId);
    if (!found) return null;
    return {
      ...found,
      messages: [
        {
          message: {
            id: 1,
            message: "سلام، سفارش من چند روز پیش ثبت شد ولی هنوز تحویل نگرفتم.",
            isFromUser: true,
            createdAt: "2026-05-01T10:00:00Z",
          },
          sender: found.user,
        },
        {
          message: {
            id: 2,
            message: "با سلام، پیگیری می‌کنیم و در اسرع وقت پاسخ می‌دهیم.",
            isFromUser: false,
            createdAt: "2026-05-01T11:30:00Z",
          },
          sender: { firstName: "ادمین", username: "admin" },
        },
      ],
    };
  }

  if (url.includes("admin/tickets")) {
    const p = new URLSearchParams(url.split("?")[1] ?? "");
    const statusFilter = p.get("status");
    const priorityFilter = p.get("priority");
    const typeFilter = p.get("type");
    let result = [...mockTickets];
    if (statusFilter)
      result = result.filter((t) => t.ticket.status === statusFilter);
    if (priorityFilter)
      result = result.filter((t) => t.ticket.priority === priorityFilter);
    if (typeFilter) result = result.filter((t) => t.ticket.type === typeFilter);
    return result;
  }

  if (url.includes("wallet/stats"))
    return {
      credit: { total: "48500000", count: 31 },
      debit: { total: "27300000", count: 18 },
      totalWalletBalance: "21200000",
      bySource: [
        { source: "purchase", total: "27300000", count: 18 },
        { source: "recharge", total: "35000000", count: 20 },
        { source: "refund", total: "4500000", count: 5 },
        { source: "referral", total: "6000000", count: 8 },
        { source: "perk", total: "3000000", count: 3 },
        { source: "admin_adjustment", total: "2000000", count: 2 },
      ],
    };
  if (url.includes("wallet/transactions")) {
    const p = new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");
    const typeFilter = p.get("type");
    const sourceFilter = p.get("source");
    const dateFrom = p.get("dateFrom");
    const dateTo = p.get("dateTo");
    const page = parseInt(p.get("page") ?? "1");
    const limit = parseInt(p.get("limit") ?? "30");

    const allTx = [
      {
        tx: {
          id: 1,
          type: "debit",
          amount: "1500000",
          source: "purchase",
          description: "خرید Netflix Premium 1 ماهه",
          createdAt: "2026-05-01T10:30:00Z",
        },
        user: { id: 1001, username: "ali_m", firstName: "علی" },
      },
      {
        tx: {
          id: 2,
          type: "credit",
          amount: "2000000",
          source: "recharge",
          description: "شارژ کیف پول",
          createdAt: "2026-05-01T09:15:00Z",
        },
        user: { id: 1002, username: "sara_r", firstName: "سارا" },
      },
      {
        tx: {
          id: 3,
          type: "debit",
          amount: "800000",
          source: "purchase",
          description: "خرید Spotify Premium",
          createdAt: "2026-04-30T16:00:00Z",
        },
        user: { id: 1003, username: "mhosseini", firstName: "محمد" },
      },
      {
        tx: {
          id: 4,
          type: "credit",
          amount: "500000",
          source: "referral",
          description: "پاداش معرفی دوست",
          createdAt: "2026-04-30T12:45:00Z",
        },
        user: { id: 1001, username: "ali_m", firstName: "علی" },
      },
      {
        tx: {
          id: 5,
          type: "credit",
          amount: "3000000",
          source: "recharge",
          description: "شارژ کیف پول از درگاه",
          createdAt: "2026-04-29T11:00:00Z",
        },
        user: { id: 1004, username: "naz_a", firstName: "نازنین" },
      },
      {
        tx: {
          id: 6,
          type: "debit",
          amount: "2100000",
          source: "purchase",
          description: "خرید Disney+ 3 ماهه",
          createdAt: "2026-04-29T10:20:00Z",
        },
        user: { id: 1004, username: "naz_a", firstName: "نازنین" },
      },
      {
        tx: {
          id: 7,
          type: "credit",
          amount: "450000",
          source: "refund",
          description: "استرداد سفارش #88",
          createdAt: "2026-04-28T15:30:00Z",
        },
        user: { id: 1005, username: "reza_k", firstName: "رضا" },
      },
      {
        tx: {
          id: 8,
          type: "credit",
          amount: "1000000",
          source: "admin_adjustment",
          description: "تعدیل دستی توسط ادمین",
          createdAt: "2026-04-27T09:00:00Z",
        },
        user: { id: 1002, username: "sara_r", firstName: "سارا" },
      },
      {
        tx: {
          id: 9,
          type: "debit",
          amount: "1200000",
          source: "purchase",
          description: "خرید YouTube Premium",
          createdAt: "2026-04-26T14:10:00Z",
        },
        user: { id: 1003, username: "mhosseini", firstName: "محمد" },
      },
      {
        tx: {
          id: 10,
          type: "credit",
          amount: "300000",
          source: "perk",
          description: "جایزه تکمیل پروفایل",
          createdAt: "2026-04-25T08:00:00Z",
        },
        user: { id: 1005, username: "reza_k", firstName: "رضا" },
      },
    ];

    let result = [...allTx];
    if (typeFilter)
      result = result.filter((item) => item.tx.type === typeFilter);
    if (sourceFilter)
      result = result.filter((item) => item.tx.source === sourceFilter);
    if (dateFrom)
      result = result.filter(
        (item) => new Date(item.tx.createdAt) >= new Date(dateFrom),
      );
    if (dateTo)
      result = result.filter(
        (item) =>
          new Date(item.tx.createdAt) <= new Date(dateTo + "T23:59:59Z"),
      );

    const offset = (page - 1) * limit;
    return result.slice(offset, offset + limit);
  }

  if (url.includes("admin/discounts")) {
    const p = new URLSearchParams(url.split("?")[1] ?? "");
    const typeFilter = p.get("type");
    const isActiveFilter = p.get("isActive");
    const isExpiredFilter = p.get("isExpired");

    const mockDiscounts = [
      {
        id: 1,
        code: "WELCOME20",
        description: "تخفیف خوش‌آمدگویی",
        type: "percentage",
        value: "20",
        maxDiscount: "500000",
        minOrderAmount: "100000",
        maxUses: 100,
        maxUsesPerUser: 1,
        currentUses: 34,
        productIds: null,
        userIds: null,
        expiresAt: "2026-06-01T00:00:00Z",
        isActive: true,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: 2,
        code: "GIFT50K",
        description: null,
        type: "fixed",
        value: "50000",
        maxDiscount: null,
        minOrderAmount: "200000",
        maxUses: 20,
        maxUsesPerUser: 1,
        currentUses: 8,
        productIds: null,
        userIds: null,
        expiresAt: "2026-05-15T00:00:00Z",
        isActive: true,
        createdAt: "2026-02-15T00:00:00Z",
      },
      {
        id: 3,
        code: "VIP30",
        description: "تخفیف مشتریان ویژه",
        type: "percentage",
        value: "30",
        maxDiscount: "1000000",
        minOrderAmount: null,
        maxUses: null,
        maxUsesPerUser: 2,
        currentUses: 5,
        productIds: null,
        userIds: null,
        expiresAt: null,
        isActive: false,
        createdAt: "2026-03-01T00:00:00Z",
      },
      {
        id: 4,
        code: "EXPIRED10",
        description: null,
        type: "percentage",
        value: "10",
        maxDiscount: null,
        minOrderAmount: null,
        maxUses: 50,
        maxUsesPerUser: 1,
        currentUses: 50,
        productIds: null,
        userIds: null,
        expiresAt: "2026-04-01T00:00:00Z",
        isActive: true,
        createdAt: "2026-03-20T00:00:00Z",
      },
    ];

    let result = [...mockDiscounts];
    if (typeFilter) result = result.filter((d) => d.type === typeFilter);
    if (isActiveFilter !== null && isActiveFilter !== "")
      result = result.filter((d) => String(d.isActive) === isActiveFilter);
    if (isExpiredFilter === "true")
      result = result.filter(
        (d) => d.expiresAt != null && new Date(d.expiresAt) < new Date(),
      );
    return result;
  }

  if (url.includes("referrals/stats"))
    return {
      totalAwarded: { total: "3600000", count: 30 },
      totalPending: 4,
      topReferrers: [
        {
          referrerId: 1001,
          totalRewards: 12,
          user: { id: 1001, username: "ali_m", firstName: "علی" },
        },
        {
          referrerId: 1005,
          totalRewards: 7,
          user: { id: 1005, username: "reza_k", firstName: "رضا" },
        },
      ],
    };
  if (url.includes("admin/referrals")) {
    const p = new URLSearchParams(url.split("?")[1] ?? "");
    const statusFilter = p.get("status");
    const page = parseInt(p.get("page") ?? "1");
    const limit = parseInt(p.get("limit") ?? "20");

    const mockReferrals = [
      {
        reward: {
          id: 1,
          referrerId: 1001,
          referredUserId: 1004,
          rewardType: "wallet_credit",
          rewardValue: "120000",
          status: "pending",
          awardedAt: null,
          createdAt: "2026-05-01T09:00:00Z",
        },
        referrer: { id: 1001, firstName: "علی", username: "ali_m" },
      },
      {
        reward: {
          id: 2,
          referrerId: 1005,
          referredUserId: 1003,
          rewardType: "wallet_credit",
          rewardValue: "120000",
          status: "awarded",
          awardedAt: "2026-04-30T15:00:00Z",
          createdAt: "2026-04-30T14:00:00Z",
        },
        referrer: { id: 1005, firstName: "رضا", username: "reza_k" },
      },
      {
        reward: {
          id: 3,
          referrerId: 1002,
          referredUserId: 1003,
          rewardType: "discount",
          rewardValue: "50000",
          status: "pending",
          awardedAt: null,
          createdAt: "2026-04-28T11:00:00Z",
        },
        referrer: { id: 1002, firstName: "سارا", username: "sara_r" },
      },
      {
        reward: {
          id: 4,
          referrerId: 1001,
          referredUserId: 1002,
          rewardType: "wallet_credit",
          rewardValue: "120000",
          status: "pending",
          awardedAt: null,
          createdAt: "2026-04-27T08:30:00Z",
        },
        referrer: { id: 1001, firstName: "علی", username: "ali_m" },
      },
    ];

    let result = [...mockReferrals];
    if (statusFilter)
      result = result.filter((r) => r.reward.status === statusFilter);
    const offset = (page - 1) * limit;
    return result.slice(offset, offset + limit);
  }

  if (url.includes("perks/tasks"))
    return [
      {
        id: 1,
        title: "عضویت در کانال",
        description: "عضو کانال تلگرام شو",
        type: "join_channel",
        taskData: { channel_username: "mychannel" },
        rewardType: "wallet_credit",
        rewardValue: "50000",
        rewardProductId: null,
        maxRewards: 100,
        currentRewards: 87,
        isActive: true,
        expiresAt: null,
        createdAt: "2026-04-01T10:00:00Z",
      },
      {
        id: 2,
        title: "دعوت دوستان",
        description: "ربات را به دوستان معرفی کن",
        type: "invite_friend",
        taskData: null,
        rewardType: "wallet_credit",
        rewardValue: "20000",
        rewardProductId: null,
        maxRewards: 200,
        currentRewards: 42,
        isActive: true,
        expiresAt: null,
        createdAt: "2026-04-05T10:00:00Z",
      },
      {
        id: 3,
        title: "اولین خرید",
        description: null,
        type: "first_purchase",
        taskData: null,
        rewardType: "wallet_credit",
        rewardValue: "100000",
        rewardProductId: null,
        maxRewards: null,
        currentRewards: 12,
        isActive: false,
        expiresAt: "2026-06-01T00:00:00Z",
        createdAt: "2026-04-10T10:00:00Z",
      },
    ];
  if (url.includes("perks/requests")) {
    const statusFilter =
      new URL(url, "http://x").searchParams.get("status") ?? "pending";
    const allRequests = [
      {
        userPerk: {
          id: 1,
          userId: 1001,
          taskId: 1,
          status: "pending",
          verificationData: null,
          completedAt: null,
          claimedAt: null,
          createdAt: "2026-05-01T09:00:00Z",
        },
        user: { id: 1001, firstName: "علی", username: "ali_m" },
        task: {
          id: 1,
          title: "عضویت در کانال",
          type: "join_channel",
          rewardType: "wallet_credit",
          rewardValue: "50000",
          isActive: true,
        },
      },
      {
        userPerk: {
          id: 2,
          userId: 1002,
          taskId: 2,
          status: "pending",
          verificationData: null,
          completedAt: null,
          claimedAt: null,
          createdAt: "2026-05-01T10:30:00Z",
        },
        user: { id: 1002, firstName: "سارا", username: "sara_r" },
        task: {
          id: 2,
          title: "دعوت دوستان",
          type: "invite_friend",
          rewardType: "wallet_credit",
          rewardValue: "20000",
          isActive: true,
        },
      },
      {
        userPerk: {
          id: 3,
          userId: 1003,
          taskId: 1,
          status: "verified",
          verificationData: null,
          completedAt: "2026-05-02T12:00:00Z",
          claimedAt: "2026-05-02T12:00:00Z",
          createdAt: "2026-04-30T08:00:00Z",
        },
        user: { id: 1003, firstName: "رضا", username: "reza_k" },
        task: {
          id: 1,
          title: "عضویت در کانال",
          type: "join_channel",
          rewardType: "wallet_credit",
          rewardValue: "50000",
          isActive: true,
        },
      },
      {
        userPerk: {
          id: 4,
          userId: 1004,
          taskId: 2,
          status: "completed",
          verificationData: null,
          completedAt: null,
          claimedAt: null,
          createdAt: "2026-04-29T15:00:00Z",
        },
        user: { id: 1004, firstName: "نگار", username: "negar_h" },
        task: {
          id: 2,
          title: "دعوت دوستان",
          type: "invite_friend",
          rewardType: "wallet_credit",
          rewardValue: "20000",
          isActive: true,
        },
      },
    ];
    return statusFilter === ""
      ? allRequests
      : allRequests.filter((r) => r.userPerk.status === statusFilter);
  }

  if (url.includes("admin/schedules/week"))
    // API returns flat rows { schedule } — client groups by date
    return [
      {
        schedule: {
          id: 1,
          orderId: 101,
          date: "2026-05-03",
          timeSlot: "09:00-10:00",
          capacity: 3,
          currentBookings: 2,
          reminderSent: false,
          status: "available",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
      },
      {
        schedule: {
          id: 2,
          orderId: 102,
          date: "2026-05-03",
          timeSlot: "11:00-12:00",
          capacity: 2,
          currentBookings: 2,
          reminderSent: true,
          status: "full",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
      },
      {
        schedule: {
          id: 3,
          orderId: 103,
          date: "2026-05-03",
          timeSlot: "15:00-16:00",
          capacity: 4,
          currentBookings: 1,
          reminderSent: false,
          status: "in_progress",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
      },
      {
        schedule: {
          id: 4,
          orderId: 104,
          date: "2026-05-04",
          timeSlot: "10:00-11:00",
          capacity: 3,
          currentBookings: 1,
          reminderSent: false,
          status: "available",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
      },
      {
        schedule: {
          id: 5,
          orderId: 105,
          date: "2026-05-04",
          timeSlot: "14:00-15:00",
          capacity: 2,
          currentBookings: 0,
          reminderSent: false,
          status: "available",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
      },
      {
        schedule: {
          id: 6,
          orderId: 106,
          date: "2026-05-05",
          timeSlot: "09:00-10:00",
          capacity: 2,
          currentBookings: 2,
          reminderSent: false,
          status: "full",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
      },
      {
        schedule: {
          id: 7,
          orderId: 107,
          date: "2026-05-07",
          timeSlot: "10:00-11:00",
          capacity: 3,
          currentBookings: 3,
          reminderSent: false,
          status: "full",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
      },
      {
        schedule: {
          id: 8,
          orderId: 108,
          date: "2026-05-07",
          timeSlot: "13:00-14:00",
          capacity: 2,
          currentBookings: 1,
          reminderSent: false,
          status: "available",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
      },
      {
        schedule: {
          id: 9,
          orderId: 109,
          date: "2026-05-07",
          timeSlot: "16:00-17:00",
          capacity: 4,
          currentBookings: 4,
          reminderSent: false,
          status: "completed",
          completedAt: "2026-05-07T17:10:00Z",
          createdAt: "2026-05-01T00:00:00Z",
        },
      },
      {
        schedule: {
          id: 10,
          orderId: 110,
          date: "2026-05-07",
          timeSlot: "17:00-18:00",
          capacity: 2,
          currentBookings: 2,
          reminderSent: true,
          status: "full",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
      },
    ];
  if (url.includes("admin/schedules")) {
    // /:date → [{ schedule, order, user, product }]
    return [
      {
        schedule: {
          id: 1,
          orderId: 101,
          date: "2026-05-03",
          timeSlot: "09:00-10:00",
          capacity: 3,
          currentBookings: 2,
          reminderSent: false,
          status: "available",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
        order: { id: 101, finalPrice: "350000" },
        user: { id: 1001, firstName: "علی", username: "ali_m" },
        product: { id: 10, name: "Netflix Premium" },
      },
      {
        schedule: {
          id: 2,
          orderId: 102,
          date: "2026-05-03",
          timeSlot: "11:00-12:00",
          capacity: 2,
          currentBookings: 2,
          reminderSent: true,
          status: "full",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
        order: { id: 102, finalPrice: "200000" },
        user: { id: 1002, firstName: "سارا", username: "sara_r" },
        product: { id: 11, name: "Spotify Family" },
      },
      {
        schedule: {
          id: 3,
          orderId: 103,
          date: "2026-05-03",
          timeSlot: "15:00-16:00",
          capacity: 4,
          currentBookings: 1,
          reminderSent: false,
          status: "in_progress",
          completedAt: null,
          createdAt: "2026-05-01T00:00:00Z",
        },
        order: { id: 103, finalPrice: "180000" },
        user: { id: 1003, firstName: "رضا", username: "reza_k" },
        product: { id: 12, name: "VPN Pro" },
      },
    ];
  }

  if (url.includes("broadcast/preview"))
    return { count: Math.floor(Math.random() * 500) + 50 };

  if (url.includes("broadcast/send"))
    return { successCount: 142, failCount: 3, total: 145 };

  if (url.includes("settings/backup/run"))
    return {
      success: true,
      fileSize: 524288,
      sentAt: new Date().toISOString(),
    };

  if (url.includes("settings/bot-config"))
    return {
      id: 1,
      maintenanceMode: false,
      maintenanceMessage: null,
      referralEnabled: true,
      shopEnabled: true,
      updatedAt: null,
    };

  if (url.includes("settings/backup"))
    return {
      id: 1,
      isEnabled: false,
      telegramChannelId: null,
      cronSchedule: "0 3 * * *",
      lastBackupAt: null,
      lastBackupStatus: null,
      lastBackupSize: null,
      updatedAt: null,
    };

  if (url.includes("settings/payment/cards"))
    return [
      {
        id: 1,
        cardNumber: "6037-9975-1234-5678",
        holderName: "علی محمدی",
        bankName: "بانک ملی",
        isActive: true,
        order: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

  if (url.includes("settings/payment/config"))
    return {
      id: 1,
      cardEnabled: true,
      zarinpalEnabled: false,
      zarinpalMerchantId: null,
      zarinpalCallbackUrl:
        "https://example.com/api/public/payments/zarinpal/wallet/callback",
      zarinpalSandbox: true,
      cryptoEnabled: false,
      cryptoAddress: null,
      cryptoNetwork: "TRC20",
      cryptoExchangeRate: 0,
      updatedAt: null,
    };

  if (url.includes("settings/force-join"))
    return [
      {
        id: 1,
        channelId: "-1223246566",
        channelUrl: "https://t.me/MyChannel",
        channelName: "کانال اصلی",
        isActive: true,
        order: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: 2,
        channelId: "-1009876543",
        channelUrl: "https://t.me/MyChannel2",
        channelName: "کانال دوم",
        isActive: false,
        order: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

  if (url.includes("settings/admins"))
    return [
      {
        admin: {
          id: 1,
          userId: 123456789,
          displayName: "ToxicWix",
          role: "superadmin",
          isActive: true,
          isSuperAdmin: true,
          allowedSections: null,
          permissions: {},
          lastLoginAt: "2026-05-03T08:00:00Z",
          lastActivityAt: "2026-05-03T10:00:00Z",
          loginCount: 42,
          notes: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
        user: { id: 123456789, username: "TajEzat", firstName: "ToxicWix" },
      },
      {
        admin: {
          id: 2,
          userId: 987654321,
          displayName: "پشتیبان اول",
          role: "support",
          isActive: true,
          isSuperAdmin: false,
          allowedSections: ["tickets", "orders", "users"],
          permissions: {},
          lastLoginAt: "2026-05-02T14:30:00Z",
          lastActivityAt: "2026-05-02T15:00:00Z",
          loginCount: 15,
          notes: null,
          createdAt: "2026-02-10T00:00:00Z",
        },
        user: { id: 987654321, username: "support1", firstName: "امیر" },
      },
      {
        admin: {
          id: 3,
          userId: 111222333,
          displayName: "مدیر فروش",
          role: "manager",
          isActive: false,
          isSuperAdmin: false,
          allowedSections: ["products", "orders", "discounts"],
          permissions: {},
          lastLoginAt: "2026-04-20T09:00:00Z",
          lastActivityAt: "2026-04-20T09:30:00Z",
          loginCount: 7,
          notes: "موقتاً غیرفعال",
          createdAt: "2026-03-01T00:00:00Z",
        },
        user: { id: 111222333, username: "sales_mgr", firstName: "زهرا" },
      },
    ];

  if (url.includes("settings/logs"))
    return [
      {
        log: {
          id: 1,
          adminId: 1,
          action: "create",
          entityType: "product",
          entityId: "10",
          description: "محصول جدید ایجاد شد",
          severity: "info",
          isSuccess: true,
          createdAt: "2026-05-03T09:10:00Z",
        },
        admin: { id: 1, displayName: "ToxicWix", role: "superadmin" },
      },
      {
        log: {
          id: 2,
          adminId: 2,
          action: "reply_ticket",
          entityType: "ticket",
          entityId: "55",
          description: "پاسخ تیکت ارسال شد",
          severity: "info",
          isSuccess: true,
          createdAt: "2026-05-03T08:45:00Z",
        },
        admin: { id: 2, displayName: "پشتیبان اول", role: "support" },
      },
      {
        log: {
          id: 3,
          adminId: 1,
          action: "broadcast",
          entityType: "broadcast",
          entityId: null,
          description: "پیام همگانی ارسال شد",
          severity: "warning",
          isSuccess: true,
          createdAt: "2026-05-02T18:00:00Z",
        },
        admin: { id: 1, displayName: "ToxicWix", role: "superadmin" },
      },
      {
        log: {
          id: 4,
          adminId: 1,
          action: "delete",
          entityType: "discount",
          entityId: "8",
          description: "کد تخفیف حذف شد",
          severity: "warning",
          isSuccess: true,
          createdAt: "2026-05-02T16:30:00Z",
        },
        admin: { id: 1, displayName: "ToxicWix", role: "superadmin" },
      },
      {
        log: {
          id: 5,
          adminId: 1,
          action: "create",
          entityType: "admin",
          entityId: "3",
          description: "ادمین جدید اضافه شد",
          severity: "warning",
          isSuccess: true,
          createdAt: "2026-05-01T11:00:00Z",
        },
        admin: { id: 1, displayName: "ToxicWix", role: "superadmin" },
      },
      {
        log: {
          id: 6,
          adminId: 2,
          action: "manual_delivery",
          entityType: "order",
          entityId: "101",
          description: "تحویل دستی سفارش",
          severity: "info",
          isSuccess: true,
          createdAt: "2026-04-30T14:00:00Z",
        },
        admin: { id: 2, displayName: "پشتیبان اول", role: "support" },
      },
      {
        log: {
          id: 7,
          adminId: 1,
          action: "deactivate",
          entityType: "admin",
          entityId: "3",
          description: "ادمین غیرفعال شد",
          severity: "critical",
          isSuccess: true,
          createdAt: "2026-04-20T09:35:00Z",
        },
        admin: { id: 1, displayName: "ToxicWix", role: "superadmin" },
      },
    ];

  if (url.includes("account/me"))
    return {
      admin: {
        id: 1,
        userId: 123456789,
        role: "superadmin",
        displayName: "ToxicWix",
        isSuperAdmin: true,
        allowedSections: null,
        permissions: {},
        lastLoginAt: new Date().toISOString(),
        loginCount: 42,
        createdAt: "2025-01-01T00:00:00Z",
      },
      botUser: {
        id: 123456789,
        username: "TajEzat",
        firstName: "Toxic",
        lastName: "Wix",
        languageCode: "fa",
        role: "customer",
        isBlocked: false,
        walletBalance: "350000",
        referralCode: "TOXIC123",
        notifyOrders: true,
        notifyWallet: true,
        notifyPromotions: false,
        notifyReferrals: true,
        notifyStock: false,
        createdAt: "2025-01-01T00:00:00Z",
      },
    };

  return {};
}
