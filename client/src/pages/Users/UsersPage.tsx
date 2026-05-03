import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";
import Th from "../../Components/Th";
import Td from "../../Components/Td";
import UserProfileModal from "./Components/UserProfileModal";
import RoleFilter from "./Components/RoleFliter";
import IsBlockedFilter from "./Components/IsBlockedFilter";

const ROLES = ["customer", "support"] as const;

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
    <div className="w-full h-full p-4">
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
              src="/search.svg"
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
        className={`w-full overflow-x-auto transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <table className="w-full border">
          <thead className="bg-white/80 text-black">
            <tr className="border-b">
              <Th Text="ID" />
              <Th Text={t("common.name")} />
              <Th Text={t("users.username")} />
              <Th Text={t("users.role")} />
              <Th Text={t("users.walletBalance")} />
              <Th Text={t("common.status")} />
              <Th Text={t("common.actions")} />
            </tr>
          </thead>
          <tbody>
            {users
              ?.filter(
                (user: User) =>
                  user.role === "customer" || user.role === "support",
              )
              .map((user: User, i: number) => (
                <tr
                  key={user.id}
                  className={`border-b ${i % 2 === 0 ? "bg-white/5" : ""}`}
                >
                  <Td>#{user.id}</Td>
                  <Td>{user.firstName}</Td>
                  <Td>@{user.username}</Td>
                  <Td>{t(`users.roles.${user.role}`)}</Td>
                  <Td>
                    {Number(user.walletBalance).toLocaleString()}{" "}
                    {t("common.toman")}
                  </Td>
                  <Td>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.isBlocked
                          ? "bg-red-500/20 text-red-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {user.isBlocked ? t("users.blocked") : t("users.active")}
                    </span>
                  </Td>
                  <Td>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition-all"
                    >
                      {t("users.profile")}
                    </button>
                  </Td>
                </tr>
              ))}
          </tbody>
        </table>
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
