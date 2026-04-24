'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Stroke, StrokePayload } from '../lib/types';

type Props = {
  imageUrl: string;
  previewWidth: number;
  previewHeight: number;
  onPayloadChange: (payload: StrokePayload) => void;
};

export default function CanvasEditor({ imageUrl, previewWidth, previewHeight, onPayloadChange }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const [brush, setBrush] = useState(24);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const currentRef = useRef<Stroke | null>(null);

  const payload = useMemo<StrokePayload>(() => ({
    preview_w: previewWidth,
    preview_h: previewHeight,
    strokes,
    inpaint_radius: 5,
  }), [previewHeight, previewWidth, strokes]);

  useEffect(() => {
    onPayloadChange(payload);
  }, [payload, onPayloadChange]);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    const resize = () => {
      const rect = img.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      redraw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(img);
    if (img.complete) resize();

    function getPoint(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
      const normalized: [number, number] = [x / rect.width, y / rect.height];
      return normalized;
    }

    function drawStroke(stroke: Stroke) {
      const rect = canvas!.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      ctx.strokeStyle = 'rgba(255, 40, 40, 0.62)';
      ctx.fillStyle = 'rgba(255, 40, 40, 0.62)';
      ctx.lineWidth = stroke.brush;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const points = stroke.points.map(([nx, ny]) => [nx * rect.width, ny * rect.height] as const);
      if (points.length === 1) {
        const [x, y] = points[0];
        ctx.beginPath();
        ctx.arc(x, y, stroke.brush / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.stroke();
    }

    function redraw() {
      const rect = canvas!.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (const stroke of strokesRef.current) drawStroke(stroke);
      if (currentRef.current) drawStroke(currentRef.current);
    }

    function onPointerDown(e: PointerEvent) {
      e.preventDefault();
      const point = getPoint(e);
      drawingRef.current = true;
      currentRef.current = { brush, points: [point] };
      redraw();
      canvas.setPointerCapture?.(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (!drawingRef.current || !currentRef.current) return;
      e.preventDefault();
      const point = getPoint(e);
      const prev = currentRef.current.points[currentRef.current.points.length - 1];
      const dx = point[0] - prev[0];
      const dy = point[1] - prev[1];
      if ((dx * dx + dy * dy) < 0.000008) return;
      currentRef.current.points.push(point);
      redraw();
    }

    function endStroke(e?: PointerEvent) {
      e?.preventDefault();
      if (!drawingRef.current || !currentRef.current) return;
      drawingRef.current = false;
      const finished = currentRef.current;
      currentRef.current = null;
      setStrokes((prev) => [...prev, finished]);
    }

    const pointerDown = (e: Event) => onPointerDown(e as PointerEvent);
    const pointerMove = (e: Event) => onPointerMove(e as PointerEvent);
    const pointerUp = (e: Event) => endStroke(e as PointerEvent);

    canvas.addEventListener('pointerdown', pointerDown, { passive: false });
    canvas.addEventListener('pointermove', pointerMove, { passive: false });
    canvas.addEventListener('pointerup', pointerUp, { passive: false });
    canvas.addEventListener('pointercancel', pointerUp, { passive: false });
    canvas.addEventListener('pointerleave', pointerUp, { passive: false });

    return () => {
      observer.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
      canvas.removeEventListener('pointerleave', pointerUp);
    };
  }, [brush, onPayloadChange]);

  function clearAll() {
    setStrokes([]);
    strokesRef.current = [];
    currentRef.current = null;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && rect) ctx.clearRect(0, 0, rect.width, rect.height);
  }

  function undo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  return (
    <div className="stack">
      <div className="canvas-shell">
        <div ref={frameRef} className="canvas-frame">
          <img ref={imgRef} src={imageUrl} alt="Preview" />
          <canvas ref={canvasRef} />
        </div>
      </div>
      <div className="toolbar">
        <label className="label">
          Fırça {brush}px
          <br />
          <input type="range" min={6} max={72} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
        </label>
        <button className="btn" type="button" onClick={undo}>Geri Al</button>
        <button className="btn" type="button" onClick={clearAll}>Temizle</button>
        <div className="small">{strokes.length} stroke</div>
      </div>
    </div>
  );
}
