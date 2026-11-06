import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Copy,
  Check,
  Upload,
  Camera,
  Download,
  AlertCircle,
  RefreshCw,
  FileCheck2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Btn, Field, Modal, controlClass } from "@/components/ms/ui";
import { useMs } from "@/lib/ms/store";
import {
  createMetaSharePackage,
  parseMetaShareInputAsync,
  validateMetaSharePackageAsync,
  type MetaShareValidationResult,
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
  const importMetaSharePackage = useMs((s) => s.importMetaSharePackage);
  const [tab, setTab] = useState<"qr" | "scan" | "import">("qr");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrTooLarge, setQrTooLarge] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Strategy and preview state
  const [validatedPkg, setValidatedPkg] = useState<MetaSharePackage | null>(null);
  const [pkgSummary, setPkgSummary] = useState<string>("");
  const [pkgDetails, setPkgDetails] = useState<{
    lessonsCount: number;
    subjectsCount: number;
    classesCount: number;
    spaceName: string;
  } | null>(null);
  const [importStrategy, setImportStrategy] = useState<"merge" | "replace" | "selective">("merge");
  const [selectedCategories, setSelectedCategories] = useState<{
    lessons: boolean;
    subjects: boolean;
    classes: boolean;
    tasks: boolean;
    events: boolean;
  }>({
    lessons: true,
    subjects: true,
    classes: true,
    tasks: true,
    events: true,
  });

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string>("Наведите камеру на QR-код...");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Normalized package
  const pkg: MetaSharePackage =
    payload && typeof payload === "object" && (payload as Record<string, unknown>).format === "mspack"
      ? (payload as MetaSharePackage)
      : createMetaSharePackage("schedule", title, payload as any, {
          authorName: "Andárer",
          description: title,
        });

  const jsonString = JSON.stringify(pkg, null, 2);
  const compactPayload = JSON.stringify(pkg);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setValidatedPkg(null);
      setPkgDetails(null);
      return;
    }
    setCopied(false);
    setImportMsg("");
    setIsSuccess(false);

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

  const inspectPackageText = async (text: string) => {
    setImportMsg("");
    setIsSuccess(false);
    const validation = await parseMetaShareInputAsync(text);
    if (!validation.ok) {
      setImportMsg(`Ошибка пакета: ${validation.error}`);
      setValidatedPkg(null);
      setPkgDetails(null);
      return;
    }

    setValidatedPkg(validation.pkg);
    setPkgSummary(validation.summary);
    setPkgDetails(validation.details);
  };

  const confirmImport = () => {
    if (!validatedPkg) return;

    const categoriesToImport: ("lessons" | "subjects" | "classes" | "tasks" | "events")[] = [];
    if (selectedCategories.lessons) categoriesToImport.push("lessons");
    if (selectedCategories.subjects) categoriesToImport.push("subjects");
    if (selectedCategories.classes) categoriesToImport.push("classes");
    if (selectedCategories.tasks) categoriesToImport.push("tasks");
    if (selectedCategories.events) categoriesToImport.push("events");

    const res = importMetaSharePackage(validatedPkg, importStrategy, categoriesToImport);
    if (res.ok) {
      setIsSuccess(true);
      setImportMsg(`Успешно импортировано: ${res.count} объектов (${importStrategy})`);
      setTimeout(() => {
        onClose();
      }, 1600);
    } else {
      setIsSuccess(false);
      setImportMsg(res.error || "Ошибка объединения данных");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
        await inspectPackageText(content);
      }
    };
    reader.readAsText(file);
  };

  // Real BarcodeDetector frame recognition
  const initFrameDecoder = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    // If native BarcodeDetector API is available (Chrome / Android WebView)
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const rawVal = barcodes[0].rawValue;
              if (rawVal) {
                setScanStatus("QR-код обнаружен! Проверка...");
                stopCamera();
                setTab("import");
                setImportText(rawVal);
                await inspectPackageText(rawVal);
              }
            }
          } catch {
            // Ignore frame decode exceptions
          }
        }, 500);
      } catch {
        // Fallback
      }
    }
  };

  // Camera start / stop logic
  const startCamera = async () => {
    setCameraError(null);
    setScanStatus("Подключение к оптическому сенсору...");
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
      setScanStatus("Наведите камеру на QR-код...");
      initFrameDecoder();
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : "Не удалось получить доступ к камере");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
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
            <span>Сканер</span>
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
                  Объём пакета ({compactPayload.length} байт) оптимизирован для экспорта в файл.
                </p>
                <p className="mt-2 text-[11px] text-muted">
                  Используйте экспорт файла или буфер обмена для 100% надёжного обмена.
                </p>
              </div>
            )}

            <div className="text-center text-xs text-muted space-y-1">
              <p>
                Формат MetaShare v1 · Целостность (SHA-256):{" "}
                <code className="font-mono text-fg bg-surface px-1 py-0.5 rounded text-[10px]">
                  {pkg.integrity?.sha256 ? `${pkg.integrity.sha256.slice(0, 12)}...` : pkg.checksum || "verified"}
                </code>
              </p>
              <p className="text-[11px]">Безопасный перенос расписания между телефонами и ПК без интернета.</p>
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
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
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
                      <p className="text-muted">Подключение к камере...</p>
                    </>
                  )}
                  <Btn onClick={startCamera} className="mt-3 text-xs flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Повторить</span>
                  </Btn>
                </div>
              )}
            </div>
            <p className="text-center text-xs text-muted font-medium">{scanStatus}</p>
          </div>
        )}

        {tab === "import" && (
          <div className="flex flex-col gap-3">
            {!validatedPkg ? (
              <>
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

                <Btn
                  onClick={() => inspectPackageText(importText)}
                  disabled={!importText.trim()}
                  className="flex items-center justify-center gap-2 text-xs"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>Проверить целостность и открыть Preview</span>
                </Btn>
              </>
            ) : (
              /* Preview & Strategy Selection Stage */
              <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 text-xs">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-2 font-bold text-fg">
                    <Layers className="h-4 w-4 text-copper" />
                    <span>Предварительный просмотр (Preview)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValidatedPkg(null)}
                    className="text-xs text-muted hover:text-fg"
                  >
                    Изменить файл
                  </button>
                </div>

                <div className="space-y-1 text-muted">
                  <p className="font-semibold text-fg">{pkgSummary}</p>
                  {pkgDetails && (
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-fg">
                      <div className="bg-surface-2 p-1.5 rounded-lg text-center">
                        Уроков: <strong>{pkgDetails.lessonsCount}</strong>
                      </div>
                      <div className="bg-surface-2 p-1.5 rounded-lg text-center">
                        Предметов: <strong>{pkgDetails.subjectsCount}</strong>
                      </div>
                      <div className="bg-surface-2 p-1.5 rounded-lg text-center">
                        Классов: <strong>{pkgDetails.classesCount}</strong>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-line/60 pt-2 space-y-2">
                  <span className="font-semibold text-fg">Стратегия импорта:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["merge", "replace", "selective"] as const).map((strat) => (
                      <button
                        key={strat}
                        type="button"
                        onClick={() => setImportStrategy(strat)}
                        className={`rounded-lg py-1 px-2 text-xs font-semibold capitalize ${
                          importStrategy === strat
                            ? "bg-copper text-copper-fg"
                            : "bg-surface-2 text-muted hover:text-fg"
                        }`}
                      >
                        {strat === "merge" ? "Слияние" : strat === "replace" ? "Замена" : "Выборочно"}
                      </button>
                    ))}
                  </div>
                </div>

                {importStrategy === "selective" && (
                  <div className="rounded-xl border border-line/60 bg-surface-2/40 p-2 space-y-1 text-xs">
                    <p className="font-semibold text-fg mb-1">Выберите категории для импорта:</p>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.lessons}
                        onChange={(e) =>
                          setSelectedCategories({ ...selectedCategories, lessons: e.target.checked })
                        }
                      />
                      <span>Расписание уроков и звонков</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.subjects}
                        onChange={(e) =>
                          setSelectedCategories({ ...selectedCategories, subjects: e.target.checked })
                        }
                      />
                      <span>Список предметов</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.classes}
                        onChange={(e) =>
                          setSelectedCategories({ ...selectedCategories, classes: e.target.checked })
                        }
                      />
                      <span>Классы и кабинеты</span>
                    </label>
                  </div>
                )}

                <Btn onClick={confirmImport} className="mt-2 flex items-center justify-center gap-2 text-xs">
                  <Check className="h-4 w-4" />
                  <span>Подтвердить и выполнить транзакционный импорт</span>
                </Btn>
              </div>
            )}

            {importMsg && (
              <div
                className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                  isSuccess ? "bg-sage/15 text-sage border border-sage/30" : "bg-clay/15 text-clay border border-clay/30"
                }`}
              >
                {isSuccess ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{importMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
