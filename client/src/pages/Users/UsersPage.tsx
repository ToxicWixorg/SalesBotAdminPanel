import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";
import UserProfileModal from "./Components/UserProfileModal";
import RoleFilter from "./Components/RoleFliter";
import IsBlockedFilter from "./Components/IsBlockedFilter";

const ROLES = ["customer", "support", "admin"] as const;

type User = {
  id: number;
  firstName: string;
  username: string;
  role: string;
  walletBalance: string;
  isBlocked: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    isBlocked: "",
    role: "",
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const {
    data: users,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["users", filters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
      );
      return api.get(`/api/admin/users?${params}`).then((r) => r.data);
    },
    placeholderData: (prev: unknown) => prev,
  });

  if (isLoading) return <SuspencePage Text={null} />;

  return (
    <div className="w-full h-full p-4 mb-20">
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("users.title")}</h1>
      </div>

      <div className="flex flex-wrap gap-8 mb-4">
        <div className="flex gap-2 justify-start items-center">
          <input
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none"
            placeholder={t("users.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                setFilters((f) => ({ ...f, search: searchInput }));
            }}
          />
          <button
            onClick={() => setFilters((f) => ({ ...f, search: searchInput }))}
            className="w-8 h-8 text-black rounded-lg p-1 hover:bg-white/20 active:scale-95 transition-all duration-300"
          >
            <img
              src="/svgs/search.svg"
              alt={t("common.search")}
              className="w-full h-full object-cover object-center"
            />
          </button>
        </div>
        <div className="flex gap-4 justify-start items-center">
          <RoleFilter
            setFilters={setFilters}
            filters={filters}
            t={t}
            ROLES={ROLES}
          />
          <IsBlockedFilter setFilters={setFilters} filters={filters} t={t} />
        </div>
      </div>

      <div
        className={`w-full transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <ul className="flex flex-col gap-2">
          {users?.map((user: User) => (
            <li
              key={user.id}
              className="rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-white/40 font-mono">
                  #{user.id}
                </span>
                <span className="font-semibold text-white/90 text-sm">
                  {user.firstName}
                </span>
                <span className="text-xs text-white/50">@{user.username}</span>
                <span className="text-xs bg-white/10 text-white/60 rounded-full px-2 py-0.5">
                  {t(`users.roles.${user.role}`)}
                </span>
                <span className="text-xs text-white/60">
                  {Number(user.walletBalance).toLocaleString()}{" "}
                  {t("common.toman")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.isBlocked
                      ? "bg-red-500/20 text-red-400"
                      : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {user.isBlocked ? t("users.blocked") : t("users.active")}
                </span>
                <button
                  onClick={() => setSelectedUser(user)}
                  className="text-xs bg-white/10 hover:bg-white/20 rounded-xl px-3 py-1 transition-all"
                >
                  {t("users.profile")}
                </button>
              </div>
            </li>
          ))}
        </ul>
        {(!users || users.length === 0) && (
          <p className="text-center text-white/40 py-8">{t("common.noData")}</p>
        )}
      </div>

      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
