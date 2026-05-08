import { useTranslation } from "react-i18next";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function StatusFilter({ value, onChange }: Props) {
  const { t } = useTranslation();
  const options = [
    { v: "open", label: t("sessionChats.open") },
    { v: "closed", label: t("sessionChats.closed") },
    { v: "all", label: t("sessionChats.all") },
  ];
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.v}
          onClick={() => onChange(opt.v)}
          className={`px-4 py-1.5 rounded-xl text-sm border transition-all ${
            value === opt.v
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-white/10 border-white/20 text-white/60 hover:bg-white/20"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
