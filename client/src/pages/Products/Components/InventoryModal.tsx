import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";
import SuspencePage from "../../../suspence/suspence";

type InventoryItem = {
  id: number;
  productId: number;
  email: string | null;
  password: string | null;
  extraData: string | null;
  status: "available" | "reserved" | "used" | "dead";
  reservedAt: string | null;
  usedAt: string | null;
  usedByOrderId: number | null;
  deadReason: string | null;
  createdAt: string;
};

type Summary = {
  available: number;
  reserved: number;
  used: number;
  dead: number;
};

type Props = {
  productId: number;
  productName: string;
  onClose: () => void;
};

type Tab = "available" | "used" | "dead";

export default function InventoryModal({ productId, productName, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("available");
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [extraData, setExtraData] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editExtraData, setEditExtraData] = useState("");
  const [deadId, setDeadId] = useState<number | null>(null);
  const [deadReason, setDeadReason] = useState("");

  const queryKey = ["inventory", productId];

  const { data, isLoading } = useQuery<{ items: InventoryItem[]; summary: Summary }>({
    queryKey,
    queryFn: () =>
      api.get(`/api/admin/inventory/${productId}`).then((r) => r.data),
  });

  const summary = data?.summary ?? { available: 0, reserved: 0, used: 0, dead: 0 };
  const items = (data?.items ?? []).filter((i) => i.status === tab);

  const addMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/admin/inventory/${productId}`, {
        email: email.trim() || undefined,
        password: password.trim() || undefined,
        extraData: extraData.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEmail("");
      setPassword("");
      setExtraData("");
    },
  });

  const bulkMutation = useMutation({
    mutationFn: () => {
      const lines = bulkText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      return api
        .post(`/api/admin/inventory/${productId}/bulk`, { lines })
        .then((r) => r.data as { inserted: number });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey });
      setBulkText("");
      setBulkSuccess(res.inserted);
    },
  });

  const editMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/inventory/${id}`, {
        email: editEmail.trim() || undefined,
        password: editPassword.trim() || undefined,
        extraData: editExtraData.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditId(null);
    },
  });

  const deadMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/inventory/${id}/dead`, { reason: deadReason.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeadId(null);
      setDeadReason("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/inventory/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const startEdit = (item: InventoryItem) => {
    setEditId(item.id);
    setEditEmail(item.email ?? "");
    setEditPassword(item.password ?? "");
    setEditExtraData(item.extraData ?? "");
  };

  const tabs: Tab[] = ["available", "used", "dead"];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--bg-secondary, #1e1e2e)",
          borderRadius: 12,
          padding: 24,
          width: "min(700px, 95vw)",
          maxHeight: "85vh",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {t("products.inventory.title")} — {productName}
            </h2>
            <p style={{ margin: "4px 0 0", opacity: 0.6, fontSize: 13 }}>
              {t("products.inventory.stats", summary)}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8 }}>
          {tabs.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: tab === s ? "var(--accent, #7c3aed)" : "var(--bg-tertiary, #2a2a3e)",
                color: tab === s ? "#fff" : "inherit",
              }}
            >
              {t(`products.inventory.${s}`)} ({summary[s]})
            </button>
          ))}
        </div>

        {/* Add form (only for available tab) */}
        {tab === "available" && (
          <div style={{ border: "1px solid var(--border, #333)", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => setMode("single")}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: mode === "single" ? "var(--accent, #7c3aed)" : "var(--bg-tertiary, #2a2a3e)",
                  color: mode === "single" ? "#fff" : "inherit",
                  fontSize: 13,
                }}
              >
                {t("products.inventory.addItem")}
              </button>
              <button
                onClick={() => setMode("bulk")}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: mode === "bulk" ? "var(--accent, #7c3aed)" : "var(--bg-tertiary, #2a2a3e)",
                  color: mode === "bulk" ? "#fff" : "inherit",
                  fontSize: 13,
                }}
              >
                {t("products.inventory.bulkAdd")}
              </button>
            </div>

            {mode === "single" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  placeholder={t("products.inventory.emailLabel")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder={t("products.inventory.passwordLabel")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder={t("products.inventory.extraDataLabel")}
                  value={extraData}
                  onChange={(e) => setExtraData(e.target.value)}
                  style={inputStyle}
                />
                <button
                  onClick={() => addMutation.mutate()}
                  disabled={addMutation.isPending || (!email && !password)}
                  style={btnPrimaryStyle}
                >
                  {addMutation.isPending ? "..." : t("products.inventory.addItem")}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  placeholder={t("products.inventory.bulkPlaceholder")}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={6}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace" }}
                />
                <p style={{ margin: 0, opacity: 0.5, fontSize: 12 }}>
                  {t("products.inventory.bulkHelp")}
                </p>
                {bulkSuccess != null && (
                  <p style={{ color: "#4ade80", fontSize: 13 }}>
                    ✓ {t("products.inventory.bulkSuccess", { count: bulkSuccess })}
                  </p>
                )}
                <button
                  onClick={() => { setBulkSuccess(null); bulkMutation.mutate(); }}
                  disabled={bulkMutation.isPending || !bulkText.trim()}
                  style={btnPrimaryStyle}
                >
                  {bulkMutation.isPending ? "..." : t("products.inventory.bulkAdd")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Items list */}
        {isLoading ? (
          <SuspencePage />
        ) : items.length === 0 ? (
          <p style={{ textAlign: "center", opacity: 0.5 }}>{t("common.noData")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--border, #333)",
                  borderRadius: 8,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {editId === item.id ? (
                  <>
                    <input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder={t("products.inventory.emailLabel")}
                      style={inputStyle}
                    />
                    <input
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder={t("products.inventory.passwordLabel")}
                      style={inputStyle}
                    />
                    <input
                      value={editExtraData}
                      onChange={(e) => setEditExtraData(e.target.value)}
                      placeholder={t("products.inventory.extraDataLabel")}
                      style={inputStyle}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => editMutation.mutate(item.id)} style={btnPrimaryStyle}>
                        {t("common.save")}
                      </button>
                      <button onClick={() => setEditId(null)} style={btnSecondaryStyle}>
                        {t("common.cancel")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13 }}>
                        {item.email && <span>{item.email}</span>}
                        {item.password && (
                          <span style={{ opacity: 0.6, fontFamily: "monospace" }}>
                            {"•".repeat(Math.min(item.password.length, 12))}
                          </span>
                        )}
                        {item.extraData && (
                          <span style={{ opacity: 0.5, fontSize: 12 }}>{item.extraData}</span>
                        )}
                        {item.usedByOrderId && (
                          <span style={{ opacity: 0.5, fontSize: 12 }}>
                            {t("products.inventory.orderId")}: #{item.usedByOrderId}
                          </span>
                        )}
                        {item.deadReason && (
                          <span style={{ color: "#f87171", fontSize: 12 }}>{item.deadReason}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {item.status === "available" && (
                          <>
                            <button onClick={() => startEdit(item)} style={btnSmallStyle}>
                              {t("common.edit")}
                            </button>
                            <button
                              onClick={() => { setDeadId(item.id); setDeadReason(""); }}
                              style={{ ...btnSmallStyle, color: "#f87171" }}
                            >
                              {t("products.inventory.markDead")}
                            </button>
                            <button
                              onClick={() => window.confirm(t("products.inventory.deleteConfirm")) && deleteMutation.mutate(item.id)}
                              style={{ ...btnSmallStyle, color: "#f87171" }}
                            >
                              {t("common.delete")}
                            </button>
                          </>
                        )}
                        {item.status === "dead" && (
                          <button
                            onClick={() => window.confirm(t("products.inventory.deleteConfirm")) && deleteMutation.mutate(item.id)}
                            style={{ ...btnSmallStyle, color: "#f87171" }}
                          >
                            {t("common.delete")}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Mark dead confirm inline */}
                    {deadId === item.id && (
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <input
                          placeholder={t("products.inventory.deadReasonPlaceholder")}
                          value={deadReason}
                          onChange={(e) => setDeadReason(e.target.value)}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <button onClick={() => deadMutation.mutate(item.id)} style={{ ...btnSmallStyle, color: "#f87171" }}>
                          {t("common.confirm")}
                        </button>
                        <button onClick={() => setDeadId(null)} style={btnSmallStyle}>
                          {t("common.cancel")}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border, #444)",
  background: "var(--bg-tertiary, #2a2a3e)",
  color: "inherit",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: "var(--accent, #7c3aed)",
  color: "#fff",
  fontSize: 14,
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid var(--border, #444)",
  cursor: "pointer",
  background: "transparent",
  color: "inherit",
  fontSize: 14,
};

const btnSmallStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid var(--border, #444)",
  cursor: "pointer",
  background: "transparent",
  color: "inherit",
  fontSize: 12,
};
