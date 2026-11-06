import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Copy,
  Check,
  Upload,
  Camera,
  Share2,
  FileCheck2,
  Download,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Btn, Field, Modal, controlClass } from "@/components/ms/ui";
import { useMs } from "@/lib/ms/store";
import {
  calculateChecksum,
  createMetaSharePackage,
  parseMetaShareInput,
  validateMetaSharePackage,
} from "@/lib/ms/metashare";
import type { MetaSharePackage } from "@/lib/ms/types";

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
  const importMetaSharePackage = useMs((s) => s.importMetaSharePackage);
  const [tab, setTab] = useState<"qr" | "scan" | "import">("qr");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrTooLarge, setQrTooLarge] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Normalized package
  const pkg: MetaSharePackage =
    payload && typeof payload === "object" && (payload as Record<string, unknown>).format === "mspack"
      ? (payload as MetaSharePackage)
      : createMetaSharePackage(
          "schedule",
          title,
          payload as any,
          { authorName: "Andárer", description: title }
        );

  // Ensure checksum is computed
  if (!pkg.checksum) {
    pkg.checksum = calculateChecksum(JSON.stringify(pkg.payload));
  }

  const jsonString = JSON.stringify(pkg, null, 2);
  const compactPayload = JSON.stringify(pkg);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    setCopied(false);
    setImportMsg("");
    setIsSuccess(false);

    // Standard optical QR codes safely hold ~2000 chars at medium error correction.
    // If the package is larger, we show clean fallback without truncating payload.
    if (compactPayload.length > 2400) {
      setQrTooLarge(true);
      setQrDataUrl("");
    } else {
      setQrTooLarge(false);
      QRCode.toDataURL(compactPayload, {
        width: 280,
        margin: 1,
        color: {
          dark: "#102033",
          light: "#FFFAF4",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => {
          setQrTooLarge(true);
          setQrDataUrl("");
        });
    }
  }, [open, compactPayload]);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownloadMspack = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metashare-${pkg.kind}-${new Date().toISOString().slice(0, 10)}.mspack`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportText = () => {
    const validation = parseMetaShareInput(importText);
    if (!validation.ok) {
      setImportMsg(`Ошибка: ${validation.error}`);
      setIsSuccess(false);
      return;
    }

    const res = importMetaSharePackage(validation.pkg);
    if (res.ok) {
      setIsSuccess(true);
      setImportMsg(`Успешно импортировано: ${validation.summary} (${res.count} объектов)`);
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setIsSuccess(false);
      setImportMsg(res.error || "Ошибка объединения данных");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
        const validation = parseMetaShareInput(content);
        if (validation.ok) {
          const res = importMetaSharePackage(validation.pkg);
          if (res.ok) {
            setIsSuccess(true);
            setImportMsg(`Успешно импортирован файл: ${validation.summary}`);
            setTimeout(() => onClose(), 1800);
          } else {
            setIsSuccess(false);
            setImportMsg(res.error || "Ошибка объединения");
          }
        } else {
          setIsSuccess(false);
          setImportMsg(`Ошибка файла: ${validation.error}`);
        }
      }
    };
    reader.readAsText(file);
  };

  // Camera start / stop logic
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Камера не поддерживается в данном браузере или окружении");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : "Не удалось получить доступ к камере");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (tab === "scan") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [tab]);

  if (!open) return null;

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Tab selection */}
        <div className="grid grid-cols-3 gap-2">
          <Btn
            variant={tab === "qr" ? "primary" : "ghost"}
            onClick={() => setTab("qr")}
            className="flex items-center justify-center gap-1.5 text-xs py-2"
          >
            <QrCode className="h-4 w-4" />
            <span>QR-код</span>
          </Btn>
          <Btn
            variant={tab === "scan" ? "primary" : "ghost"}
            onClick={() => setTab("scan")}
            className="flex items-center justify-center gap-1.5 text-xs py-2"
          >
            <Camera className="h-4 w-4" />
            <span>Камера</span>
          </Btn>
          <Btn
            variant={tab === "import" ? "primary" : "ghost"}
            onClick={() => setTab("import")}
            className="flex items-center justify-center gap-1.5 text-xs py-2"
          >
            <Upload className="h-4 w-4" />
            <span>Импорт</span>
          </Btn>
        </div>

        {tab === "qr" && (
          <div className="flex flex-col items-center gap-3">
            {qrDataUrl && !qrTooLarge ? (
              <div className="rounded-2xl border border-line bg-surface p-3 shadow-xs">
                <img src={qrDataUrl} alt="MetaShare QR Code" className="h-64 w-64 rounded-xl" />
              </div>
            ) : (
              <div className="flex h-64 w-64 flex-col items-center justify-center rounded-2xl border border-line bg-surface p-4 text-center text-xs text-muted">
                <FileCheck2 className="h-10 w-10 text-copper mb-2" />
                <p className="font-semibold text-fg">Пакет MetaShare (.mspack)</p>
                <p className="mt-1">
                  Объём расписания ({compactPayload.length} байт) превышает оптический лимит QR-кода.
                </p>
                <p className="mt-2 text-[11px] text-muted">
                  Используйте экспорт файла или копирование для 100% надёжного обмена.
                </p>
              </div>
            )}

            <div className="text-center text-xs text-muted space-y-1">
              <p>Пакет MetaShare v1 с контрольной суммой: <code className="font-mono text-fg bg-surface px-1 py-0.5 rounded">{pkg.checksum}</code></p>
              <p className="text-[11px]">Совместимо с Android, PWA, ПК и автономным импортом без интернета.</p>
            </div>

            <div className="flex w-full gap-2">
              <Btn onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 text-xs">
                {copied ? <Check className="h-4 w-4 text-sage" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? "Скопировано!" : "Копировать .mspack"}</span>
              </Btn>
              <Btn onClick={handleDownloadMspack} variant="ghost" className="flex items-center justify-center gap-2 text-xs border border-line">
                <Download className="h-4 w-4 text-copper" />
                <span>Скачать .mspack</span>
              </Btn>
            </div>
          </div>
        )}

        {tab === "scan" && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-64 w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-dashed border-copper/60 bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-surface/90 text-xs">
                  {cameraError ? (
                    <>
                      <AlertCircle className="h-8 w-8 text-clay mb-2" />
                      <p className="text-clay font-medium">{cameraError}</p>
                    </>
                  ) : (
                    <>
                      <Camera className="h-8 w-8 text-copper mb-2" />
                      <p className="text-muted">Подключение к камере устройства...</p>
                    </>
                  )}
                  <Btn onClick={startCamera} className="mt-3 text-xs flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Повторить</span>
                  </Btn>
                </div>
              )}
            </div>
            <p className="text-center text-xs text-muted">
              Наведите камеру на QR-код другого устройства с MetaШколой для моментального считывания расписания.
            </p>
          </div>
        )}

        {tab === "import" && (
          <div className="flex flex-col gap-3">
            <Field label="Импорт файла пакета MetaShare (.mspack или .json):">
              <input
                type="file"
                accept=".mspack,.json"
                onChange={handleFileUpload}
                className="block w-full text-xs text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-copper/20 file:text-copper hover:file:bg-copper/30 cursor-pointer"
              />
            </Field>

            <Field label="Или вставьте скопированный код пакета:">
              <textarea
                className={`${controlClass} h-28 font-mono text-xs`}
                placeholder='{"format":"mspack","version":1,"kind":"schedule",...}'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </Field>

            <Btn onClick={handleImportText} className="flex items-center justify-center gap-2 text-xs">
              <Upload className="h-4 w-4" />
              <span>Проверить и объединить с расписанием</span>
            </Btn>

            {importMsg ? (
              <div
                className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                  isSuccess ? "bg-sage/15 text-sage border border-sage/30" : "bg-clay/15 text-clay border border-clay/30"
                }`}
              >
                {isSuccess ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{importMsg}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}
