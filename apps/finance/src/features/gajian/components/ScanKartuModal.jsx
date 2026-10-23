import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function ScanKartuModal({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    let cancelled = false;

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          onDetectRef.current(code.data);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch (err) {
        if (!cancelled) setError("Tidak bisa akses kamera: " + err.message);
      }
    }

    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div className="relative bg-skin-card w-full max-w-sm border-2 border-skin-bdr p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-editorial text-sm tracking-[0.15em] uppercase text-skin-text2">Scan Kartu Jahit</p>
          <button
            type="button"
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text text-xl leading-none"
          >
            ×
          </button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        ) : (
          <video ref={videoRef} className="w-full bg-black" muted playsInline aria-label="Kamera scan barcode" />
        )}
        <p className="mt-3 text-[11px] text-skin-text3 text-center">
          Arahkan kamera ke barcode di kartu jahit fisik.
        </p>
      </div>
    </div>
  );
}
