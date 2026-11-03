import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Copy, Check, Upload, Share2 } from "lucide-react";
import { Btn, Field, Modal, controlClass } from "@/components/ms/ui";
import { t } from "@/lib/ms/i18n";
import { useMs } from "@/lib/ms/store";

export function QrShareModal({
  open,
  onClose,
  title,
  payload,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  payload: unknown;
}) {
  const lang = useMs((s) => s.data.lang);
  const importData = useMs((s) => s.importData);
  const [tab, setTab] = useState<"qr" | "import">("qr");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");

  const jsonString = JSON.stringify(payload, null, 2);
  const compactPayload = JSON.stringify(payload);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setImportMsg("");

    // Generate QR code for sharing
    QRCode.toDataURL(compactPayload.slice(0, 2200), {
      width: 280,
      margin: 1,
      color: {
        dark: "#102033",
        light: "#FFFAF4",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [open, compactPayload]);

  if (!open) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText);
      const res = importData(parsed, "merge");
      if (res.ok) {
        setImportMsg("Успешно импортировано!");
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setImportMsg("Ошибка формата данных.");
      }
    } catch {
      setImportMsg("Некорректный JSON код.");
    }
  };

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Btn
            variant={tab === "qr" ? "primary" : "ghost"}
            onClick={() => setTab("qr")}
            className="flex items-center justify-center gap-2"
          >
            <QrCode className="h-4 w-4" />
            <span>QR-код</span>
          </Btn>
          <Btn
            variant={tab === "import" ? "primary" : "ghost"}
            onClick={() => setTab("import")}
            className="flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            <span>Импорт</span>
          </Btn>
        </div>

        {tab === "qr" ? (
          <div className="flex flex-col items-center gap-3">
            {qrDataUrl ? (
              <div className="rounded-2xl border border-line bg-surface p-3 shadow-xs">
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="h-64 w-64 rounded-xl"
                />
              </div>
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-line bg-surface text-center p-4 text-xs text-muted">
                Данные слишком объемны для оптического QR-кода. Используйте быстрое копирование текста ниже.
              </div>
            )}
            <p className="text-center text-xs text-muted">
              Отсканируйте камерой смартфона для быстрого обмена расписанием без интернета.
            </p>
            <div className="flex w-full gap-2">
              <Btn onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2">
                {copied ? <Check className="h-4 w-4 text-sage" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? "Скопировано!" : "Копировать код"}</span>
              </Btn>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Field label="Вставьте скопированный JSON-код расписания или пространства:">
              <textarea
                className={`${controlClass} h-36 font-mono text-xs`}
                placeholder='{"version": 1, ...}'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </Field>
            <Btn onClick={handleImport} className="flex items-center justify-center gap-2">
              <Upload className="h-4 w-4" />
              <span>Объединить с текущими данными</span>
            </Btn>
            {importMsg ? (
              <p className={`text-xs font-semibold ${importMsg.includes("Успешно") ? "text-sage" : "text-clay"}`}>
                {importMsg}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}
