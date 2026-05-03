const fa = {
  // ── عمومی ──────────────────────────────────────────────────
  common: {
    loading: "در حال بارگذاری...",
    save: "ذخیره",
    cancel: "لغو",
    delete: "حذف",
    edit: "ویرایش",
    confirm: "تأیید",
    close: "بستن",
    search: "جستجو...",
    actions: "عملیات",
    status: "وضعیت",
    all: "همه",
    yes: "بله",
    no: "خیر",
    id: "شناسه",
    name: "نام",
    date: "تاریخ",
    amount: "مقدار",
    description: "توضیحات",
    error: "خطا",
    success: "موفق",
    noData: "داده‌ای یافت نشد",
    submit: "ارسال",
    back: "بازگشت",
    refresh: "بروزرسانی",
    toman: "تومان",
    Total: "مجموع",
  },

  // ── احراز هویت ─────────────────────────────────────────────
  auth: {
    loginTitle: "پنل مدیریت",
    loginSubtitle: "پنل مدیریت ربات فروش",
    loginText: "",
    loginButton: "ورود با حساب تلگرام",
    loggingIn: "در حال ورود...",
    logout: "خروج",
    notAuthorized: "شما دسترسی ادمین ندارید",
  },

  // ── ناوبری ─────────────────────────────────────────────────
  nav: {
    dashboard: "داشبورد",
    products: "محصولات",
    orders: "سفارشات",
    users: "کاربران",
    tickets: "تیکت‌ها",
    wallet: "کیف پول",
    discounts: "تخفیف‌ها",
    referrals: "معرفی دوستان",
    perks: "امتیازات",
    schedules: "زمان‌بندی‌ها",
    broadcast: "اطلاعیه",
    settings: "تنظیمات",
  },

  // ── داشبورد ─────────────────────────────────────────────────
  dashboard: {
    title: "داشبورد",
    todayOrders: "سفارشات امروز",
    todayRevenue: "درآمد امروز",
    newUsersToday: "کاربران جدید",
    openTickets: "تیکت‌های باز",
    pendingAdmin: "در انتظار ادمین",
    totalUsers: "کل کاربران",
    needsAttention: "نیاز به توجه",
    last7Days: "فروش ۷ روز اخیر",
  },

  // ── محصولات ─────────────────────────────────────────────────
  products: {
    title: "محصولات",
    newProduct: "+ محصول جدید",
    searchPlaceholder: "جستجو...",
    name: "نام",
    category: "دسته",
    deliveryType: "نوع تحویل",
    stock: "موجودی",
    active: "فعال",
    inactive: "غیرفعال",
    toggle: "تغییر وضعیت",
    updateStock: "آپدیت موجودی",
    minStock: "حداقل موجودی",
    namePlaceholder: "مثال: Netflix Premium 1 ماهه",
    requiresEmail: "نیاز به ایمیل",
    requiresOtp: "نیاز به OTP",
    requiresLogin: "نیاز به لاگین",
    requiresRegion: "نیاز به منطقه",
    isRenewable: "تمدیدپذیر",
    plans: "پلن ها",
    deliveryTypes: {
      automatic: "خودکار",
      manual: "دستی",
      custom_schedule: "زمان‌بندی سفارشی",
      invite: "دعوت",
      code: "کد",
      family_join: "عضویت خانوادگی",
      renewable: "تمدیدی",
      reservation: "رزرو",
    },
    planModal: {
      newPlan: "پلن جدید +",
      cost: "قیمت",
      time: "مدت",
      timeType: "واحد زمان",
      day: "روز",
      mounth: "ماه",
      year: "سال",
      tartib: "ترتیب",
    },
  },

  // ── سفارشات ─────────────────────────────────────────────────
  orders: {
    title: "سفارشات",
    pendingAdmin: "در انتظار ادمین",
    scheduled: "زمان‌بندی‌شده",
    waitingInvite: "در انتظار دعوت",
    all: "همه",
    userId: "کاربر",
    product: "محصول",
    total: "مبلغ کل",
    payment: "مبلغ نهایی",
    paymentWay: "روش پرداخت",
    state: "وضعیت",
    date: "تاریخ",
    updateStatus: "آپدیت وضعیت",
    actions: "عملیات",
    refund: "استرداد",
    refundReason: "دلیل استرداد",
    statuses: {
      pending_payment: "در انتظار پرداخت",
      paid: "پرداخت شده",
      pending_admin: "در انتظار ادمین",
      waiting_schedule: "در انتظار زمان‌بندی",
      scheduled: "زمان‌بندی شده",
      in_progress: "در حال انجام",
      completed: "تکمیل شده",
      cancelled: "لغو شده",
      refunded: "استرداد شده",
      waiting_invite: "در انتظار دعوت",
      invite_sent: "دعوت ارسال شده",
      rescheduled: "تجدید زمان‌بندی",
    },
  },

  // ── کاربران ─────────────────────────────────────────────────
  users: {
    title: "کاربران",
    searchPlaceholder: "جستجو username / نام...",
    username: "نام کاربری",
    role: "نقش",
    walletBalance: "موجودی کیف پول",
    blocked: "مسدود",
    active: "فعال",
    profile: "پروفایل",
    block: "مسدود کردن",
    unblock: "رفع مسدودیت",
    blockReason: "دلیل مسدودیت",
    adjustWallet: "تنظیم کیف پول",
    chargeWallet: "شارژ کیف پول",
    deductWallet: "کسر کیف پول",
    walletAmount: "مبلغ (تومان)",
    walletDescDefault: "تنظیم دستی توسط ادمین",
    changeRole: "تغییر نقش",
    registeredAt: "تاریخ ثبت‌نام",
    roles: {
      customer: "مشتری",
      support: "پشتیبانی",
      admin: "ادمین",
    },
  },

  // ── تیکت‌ها ─────────────────────────────────────────────────
  tickets: {
    title: "تیکت‌ها",
    subject: "موضوع",
    open: "باز",
    closed: "بسته",
    inProgress: "در حال بررسی",
    waitingUser: "در انتظار کاربر",
    resolved: "حل‌شده",
    reply: "پاسخ",
    close: "بستن تیکت",
    assign: "اختصاص دادن",
    viewDetails: "مشاهده",
    newMessages: "پیام جدید",
    messagePlaceholder: "پیام پاسخ...",
    allStatuses: "همه وضعیت‌ها",
    allPriorities: "همه اولویت‌ها",
    priority: {
      urgent: "فوری",
      high: "بالا",
      normal: "معمولی",
      low: "پایین",
    },
    type: {
      support: "پشتیبانی",
      order: "مشکل سفارش",
      report: "گزارش",
    },
    waitingSupport: "در انتظار پشتیبان",
  },

  // ── کیف پول ─────────────────────────────────────────────────
  wallet: {
    title: "کیف پول",
    deposit: "واریز",
    withdraw: "برداشت",
    type: "نوع",
    balance: "موجودی",
    transactions: "تراکنش‌ها",
    credit: "افزایش",
    debit: "کاهش",
  },

  // ── تخفیف‌ها ────────────────────────────────────────────────
  discounts: {
    title: "تخفیف‌ها",
    newDiscount: "+ تخفیف جدید",
    code: "کد تخفیف",
    percentage: "درصد",
    maxUses: "حداکثر استفاده",
    usedCount: "تعداد استفاده",
    expiresAt: "تاریخ انقضا",
  },

  // ── معرفی دوستان ────────────────────────────────────────────
  referrals: {
    title: "معرفی دوستان",
    referrer: "معرفی‌کننده",
    referred: "معرفی‌شده",
    reward: "پاداش",
    earnedAt: "تاریخ دریافت",
  },

  // ── امتیازات ─────────────────────────────────────────────────
  perks: {
    title: "امتیازات",
    newPerk: "+ امتیاز جدید",
    type: "نوع",
    value: "مقدار",
    expiresAt: "تاریخ انقضا",
  },

  // ── زمان‌بندی‌ها ─────────────────────────────────────────────
  schedules: {
    title: "زمان‌بندی‌ها",
    scheduledAt: "زمان برنامه‌ریزی",
    order: "سفارش",
    execute: "اجرا",
  },

  // ── اطلاعیه ─────────────────────────────────────────────────
  broadcast: {
    title: "اطلاعیه",
    message: "پیام",
    targetAll: "همه کاربران",
    send: "ارسال اطلاعیه",
    preview: "پیش‌نمایش",
  },

  // ── تنظیمات ─────────────────────────────────────────────────
  settings: {
    title: "تنظیمات",
    general: "عمومی",
    notifications: "اعلان‌ها",
    security: "امنیت",
    language: "زبان",
    saveChanges: "ذخیره تغییرات",
  },
};

export default fa;
export type Translations = typeof fa;
