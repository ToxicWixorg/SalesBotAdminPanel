import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";
import SuspencePage from "../../../suspence/suspence";

type InventoryItem = {
  id: number;
  productId: number;
  content: string | null;
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

export default function DeliveryItemsModal({
  productId,
  productName,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("available");
  const [addText, setAddText] = useState("");
  const [addSuccess, setAddSuccess] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deadId, setDeadId] = useState<number | null>(null);
  const [deadReason, setDeadReason] = useState("");

  const queryKey = ["inventory", productId];

  const { data, isLoading } = useQuery<{
    items: InventoryItem[];
    summary: Summary;
  }>({
    queryKey,
    queryFn: () =>
      api.get(`/api/admin/inventory/${productId}`).then((r) => r.data),
  });

  const summary = data?.summary ?? {
    available: 0,
    reserved: 0,
    used: 0,
    dead: 0,
  };
  const items = (data?.items ?? []).filter((i) => i.status === tab);

  const addMutation = useMutation({
    mutationFn: () => {
      const lines = addText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 1) {
        return api
          .post(`/api/admin/inventory/${productId}`, { content: lines[0] })
          .then(() => 1);
      }
      return api
        .post(`/api/admin/inventory/${productId}/bulk`, { lines })
        .then((r) => (r.data as { inserted: number }).inserted);
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey });
      setAddText("");
      setAddSuccess(count);
    },
  });

  const editMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/inventory/${id}`, { content: editContent.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditId(null);
    },
  });

  const deadMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/inventory/${id}/dead`, {
        reason: deadReason.trim() || undefined,
      }),
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
          width: "min(680px, 95vw)",
          maxHeight: "85vh",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {t("products.deliveryItems.title")} — {productName}
            </h2>
            <p style={{ margin: "4px 0 0", opacity: 0.6, fontSize: 13 }}>
              {t("products.inventory.stats", summary)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
            }}
          >
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
                background:
                  tab === s
                    ? "var(--accent, #7c3aed)"
                    : "var(--bg-tertiary, #2a2a3e)",
                color: tab === s ? "#fff" : "inherit",
              }}
            >
              {t(`products.inventory.${s}`)} ({summary[s]})
            </button>
          ))}
        </div>

        {/* Add form (only for available tab) */}
        {tab === "available" && (
          <div
            style={{
              border: "1px solid var(--border, #333)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p style={{ margin: "0 0 8px", fontSize: 13, opacity: 0.7 }}>
              {t("products.deliveryItems.addItems")}
            </p>
            <textarea
              placeholder={t("products.deliveryItems.contentPlaceholder")}
              value={addText}
              onChange={(e) => {
                setAddText(e.target.value);
                setAddSuccess(null);
              }}
              rows={5}
              style={{
                ...inputStyle,
                resize: "vertical",
                fontFamily: "monospace",
              }}
            />
            {addSuccess != null && (
              <p style={{ margin: "6px 0 0", color: "#4ade80", fontSize: 13 }}>
                ✓{" "}
                {t("products.deliveryItems.bulkSuccess", { count: addSuccess })}
              </p>
            )}
            <button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !addText.trim()}
              style={{ ...btnPrimaryStyle, marginTop: 10 }}
            >
              {addMutation.isPending
                ? "..."
                : t("products.deliveryItems.addItems")}
            </button>
          </div>
        )}

        {/* Items list */}
        {isLoading ? (
          <SuspencePage Text={""} />
        ) : items.length === 0 ? (
          <p style={{ textAlign: "center", opacity: 0.5 }}>
            {t("common.noData")}
          </p>
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
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                        fontFamily: "monospace",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => editMutation.mutate(item.id)}
                        style={btnPrimaryStyle}
                      >
                        {t("common.save")}
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        style={btnSecondaryStyle}
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ fontSize: 13, flex: 1, marginRight: 12 }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {item.content ?? "—"}
                        </span>
                        {item.usedByOrderId && (
                          <div
                            style={{ opacity: 0.5, fontSize: 12, marginTop: 4 }}
                          >
                            {t("products.inventory.orderId")}: #
                            {item.usedByOrderId}
                          </div>
                        )}
                        {item.deadReason && (
                          <div
                            style={{
                              color: "#f87171",
                              fontSize: 12,
                              marginTop: 4,
                            }}
                          >
                            {item.deadReason}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {item.status === "available" && (
                          <>
                            <button
                              onClick={() => {
                                setEditId(item.id);
                                setEditContent(item.content ?? "");
                              }}
                              style={btnSmallStyle}
                            >
                              {t("common.edit")}
                            </button>
                            <button
                              onClick={() => {
                                setDeadId(item.id);
                                setDeadReason("");
                              }}
                              style={{ ...btnSmallStyle, color: "#f87171" }}
                            >
                              {t("products.inventory.markDead")}
                            </button>
                            <button
                              onClick={() =>
                                window.confirm(
                                  t("products.inventory.deleteConfirm"),
                                ) && deleteMutation.mutate(item.id)
                              }
                              style={{ ...btnSmallStyle, color: "#f87171" }}
                            >
                              {t("common.delete")}
                            </button>
                          </>
                        )}
                        {item.status === "dead" && (
                          <button
                            onClick={() =>
                              window.confirm(
                                t("products.inventory.deleteConfirm"),
                              ) && deleteMutation.mutate(item.id)
                            }
                            style={{ ...btnSmallStyle, color: "#f87171" }}
                          >
                            {t("common.delete")}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mark dead inline form */}
                    {deadId === item.id && (
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <input
                          placeholder={t(
                            "products.inventory.deadReasonPlaceholder",
                          )}
                          value={deadReason}
                          onChange={(e) => setDeadReason(e.target.value)}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <button
                          onClick={() => deadMutation.mutate(item.id)}
                          style={{ ...btnSmallStyle, color: "#f87171" }}
                        >
                          {t("common.confirm")}
                        </button>
                        <button
                          onClick={() => setDeadId(null)}
                          style={btnSmallStyle}
                        >
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
