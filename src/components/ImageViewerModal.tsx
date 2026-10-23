import React, { useState, useRef, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { CloudImage } from './CloudImage';
import { getCachedMediaData } from '../services/firebase';

interface ImageViewerModalProps {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  imageUrl,
  title = 'عرض الصورة بحجم كامل',
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ text: string; isError: boolean } | null>(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const lastTapRef = useRef(0);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setSaveStatus(null);
  }, [imageUrl]);

  if (!imageUrl) return null;

  const clampScale = (s: number) => Math.min(Math.max(s, 1), 5);

  const zoomIn = () => setScale((s) => clampScale(s + 0.5));
  const zoomOut = () => {
    setScale((s) => {
      const next = clampScale(s - 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (scale > 1.05) {
      resetZoom();
    } else {
      setScale(2.5);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((s) => {
      const next = clampScale(s + delta);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleSaveImage = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const source = getCachedMediaData(imageUrl) || imageUrl;
      const fileName = `Sami_Trade_${Date.now()}.jpg`;

      if (source.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = source;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const res = await fetch(source);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      }
      setSaveStatus({ text: 'تم حفظ الصورة في جهازك بنجاح', isError: false });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus({ text: 'تعذر حفظ الصورة، يرجى المحاولة مرة أخرى', isError: true });
      setTimeout(() => setSaveStatus(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none overflow-hidden animate-in fade-in duration-200"
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-full transition-colors text-white cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="hidden sm:inline text-xs font-bold text-slate-300">{title}</span>
        </div>

        <div className="px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-amber-400 text-xs font-black">
          {Math.round(scale * 100)}%
        </div>

        <button
          type="button"
          onClick={handleSaveImage}
          disabled={isSaving}
          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition disabled:opacity-50 cursor-pointer"
          title="حفظ الصورة"
        >
          <Download className="w-4 h-4" />
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ الصورة'}</span>
        </button>
      </div>

      {saveStatus && (
        <div
          className={`absolute top-20 z-20 px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-xl ${
            saveStatus.isError
              ? 'bg-red-950/90 border-red-500 text-red-200'
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          }`}
        >
          {saveStatus.isError ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{saveStatus.text}</span>
        </div>
      )}

      <div
        className={`w-full h-full flex items-center justify-center p-4 ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            pinchStartDistRef.current = getDistance(e.touches);
            pinchStartScaleRef.current = scale;
            setIsDragging(false);
          } else if (e.touches.length === 1) {
            const now = Date.now();
            if (now - lastTapRef.current < 280) {
              handleDoubleClick();
              lastTapRef.current = 0;
              return;
            }
            lastTapRef.current = now;
            if (scale > 1) {
              setIsDragging(true);
              dragStartRef.current = {
                x: e.touches[0].clientX - position.x,
                y: e.touches[0].clientY - position.y,
              };
            }
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
            const dist = getDistance(e.touches);
            const factor = dist / pinchStartDistRef.current;
            const next = clampScale(pinchStartScaleRef.current * factor);
            setScale(next);
            if (next <= 1) setPosition({ x: 0, y: 0 });
          } else if (e.touches.length === 1 && isDragging && scale > 1) {
            setPosition({
              x: e.touches[0].clientX - dragStartRef.current.x,
              y: e.touches[0].clientY - dragStartRef.current.y,
            });
          }
        }}
        onTouchEnd={() => {
          pinchStartDistRef.current = null;
          setIsDragging(false);
        }}
      >
        <div
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="max-w-[95vw] max-h-[82vh] w-auto h-auto flex items-center justify-center origin-center select-none"
        >
          <CloudImage
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl pointer-events-none"
          />
        </div>
      </div>

      <div className="absolute bottom-6 z-20 flex items-center gap-3 px-4 py-2 rounded-3xl bg-slate-900/90 border border-slate-700 shadow-2xl">
        <button
          type="button"
          onClick={zoomIn}
          disabled={scale >= 5}
          className="p-2 rounded-full hover:bg-slate-800 text-amber-400 disabled:text-slate-600 transition cursor-pointer"
          title="تكبير"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          disabled={scale === 1 && position.x === 0 && position.y === 0}
          className="px-3 py-1.5 rounded-xl hover:bg-slate-800 text-white disabled:text-slate-600 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          title="إعادة الحجم الأصلي"
        >
          <RotateCcw className="w-4 h-4" />
          <span>إعادة الحجم</span>
        </button>
        <button
          type="button"
          onClick={zoomOut}
          disabled={scale <= 1}
          className="p-2 rounded-full hover:bg-slate-800 text-amber-400 disabled:text-slate-600 transition cursor-pointer"
          title="تصغير"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
