'use client';

import { useEffect, useMemo, useState } from 'react';
import CanvasEditor from '../components/CanvasEditor';
import { API_BASE, fetchJob, submitJob, uploadImage } from '../lib/api';
import type { JobInfo, StrokePayload, UploadResponse } from '../lib/types';

type Step = 1 | 2 | 3;

export default function HomePage() {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadResponse | null>(null);
  const [strokePayload, setStrokePayload] = useState<StrokePayload | null>(null);
  const [job, setJob] = useState<JobInfo | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [processSeconds, setProcessSeconds] = useState<number | null>(null);

  async function handleUpload() {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setStatusMessage('Görsel yükleniyor...');
    setProcessSeconds(null);

    try {
      const response = await uploadImage(file);
      setUploadMeta(response);
      setStep(2);
      setStatusMessage('Önizleme hazır. Nesneyi boyayarak işaretleyin.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Görsel yüklenemedi. Lütfen tekrar deneyin.');
      setStatusMessage(null);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleProcess() {
    if (!uploadMeta || !strokePayload || !strokePayload.strokes.length) {
      setError('İşaretleme bulunamadı. Nesnenin üstünü boyayıp tekrar deneyin.');
      return;
    }

    const startedAt = performance.now();

    setIsSubmitting(true);
    setIsPolling(false);
    setError(null);
    setStatusMessage('İş kuyruğa alınıyor...');

    try {
      const response = await submitJob(uploadMeta.session_id, strokePayload);
      const firstState = await fetchJob(response.job_id);

      setJob(firstState);
      setStep(3);

      if (firstState.status === 'done') {
        setProcessSeconds((performance.now() - startedAt) / 1000);
        setStatusMessage('İşlem tamamlandı.');
        setIsPolling(false);
      } else if (firstState.status === 'failed') {
        setStatusMessage(null);
        setError(firstState.error ?? 'İşlem tamamlanamadı.');
        setIsPolling(false);
      } else {
        setStatusMessage('Nesne kaldırılıyor...');
        setIsPolling(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İş başlatılamadı.');
      setStatusMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'failed') return;

    setIsPolling(true);

    const startedAt = performance.now();

    const timer = window.setInterval(async () => {
      try {
        const fresh = await fetchJob(job.job_id);
        setJob(fresh);

        if (fresh.status === 'done') {
          setIsPolling(false);
          setStatusMessage('Sonuç hazır.');
          setProcessSeconds((performance.now() - startedAt) / 1000);
          window.clearInterval(timer);
        }

        if (fresh.status === 'failed') {
          setIsPolling(false);
          setStatusMessage(null);
          setError(fresh.error ?? 'İşlem tamamlanamadı.');
          window.clearInterval(timer);
        }
      } catch {
        setError('İş durumu alınamadı. Ağ bağlantınızı kontrol edin.');
        setIsPolling(false);
        window.clearInterval(timer);
      }
    }, 1200);

    return () => window.clearInterval(timer);
  }, [job]);

  const previewUrl = useMemo(() => {
    if (!uploadMeta) return '';
    return `${API_BASE}${uploadMeta.preview_url}`;
  }, [uploadMeta]);

  const resultUrl = job?.result_url ? `${API_BASE}${job.result_url}` : null;
  const maskUrl = job?.mask_url ? `${API_BASE}${job.mask_url}` : null;

  return (
    <main>
      <div className="page stack">
        <section className="hero">
          <div className="badge">Mobil-first object eraser</div>
          <h1>Preview üstünde boya, backend orijinal dosyada çalışsın</h1>
          <p>
            Next.js App Router arayüzü ve FastAPI API ile kurulan başlangıç proje iskeleti.
          </p>
        </section>

        {error ? (
          <div className="card" style={{ borderColor: '#ef4444', color: '#fecaca' }}>
            <strong>Hata:</strong> {error}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="card" style={{ borderColor: '#334155' }}>
            <strong>Durum:</strong> {statusMessage}
          </div>
        ) : null}

        {step === 1 && (
          <section className="card stack">
            <h2>Adım 1 — Görsel yükle</h2>
            <input
              className="input-file"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="toolbar">
              <button className="btn primary" type="button" onClick={handleUpload} disabled={!file || isUploading}>
                {isUploading ? 'Yükleniyor...' : 'Devam et'}
              </button>
              <div className="small">Orijinal dosya backend’e gider. Telefonda sadece preview açılır.</div>
            </div>
          </section>
        )}

        {step === 2 && uploadMeta && (
          <section className="card stack">
            <h2>Adım 2 — Nesneyi boyayarak işaretle</h2>
            <CanvasEditor
              imageUrl={previewUrl}
              previewWidth={uploadMeta.preview_w}
              previewHeight={uploadMeta.preview_h}
              onPayloadChange={setStrokePayload}
            />
            <hr className="sep" />
            <div className="toolbar">
              <button className="btn" type="button" onClick={() => setStep(1)}>Geri</button>
              <button className="btn primary" type="button" onClick={handleProcess} disabled={isSubmitting || isPolling}>
                {isSubmitting ? 'Kuyruğa alınıyor...' : isPolling ? 'İşleniyor...' : 'İşle'}
              </button>
              <div className="small">
                Preview: {uploadMeta.preview_w}×{uploadMeta.preview_h} · Orijinal: {uploadMeta.original_w}×{uploadMeta.original_h}
              </div>
            </div>
          </section>
        )}

        {step === 3 && job && (
          <section className="card stack">
            <h2>Adım 3 — Sonuç</h2>
            <div className="small">
              İş durumu: <strong>{job.status}</strong>
              {processSeconds !== null ? ` · Süre: ${processSeconds.toFixed(2)} sn` : ''}
            </div>
            {job.status === 'failed' ? <div>{job.error}</div> : null}
            {job.status !== 'done' ? <div>İşleniyor… sayfayı açık tutmana gerek yok, polling devam ediyor.</div> : null}
            {job.status === 'done' && resultUrl && uploadMeta && (
              <>
                <div className="preview-grid">
                  <div>
                    <div className="label">Önce</div>
                    <img src={previewUrl} alt="Preview before" />
                  </div>
                  <div>
                    <div className="label">Sonra</div>
                    <img src={resultUrl} alt="Result" />
                  </div>
                </div>
                <div className="toolbar">
                  <a className="btn success" href={resultUrl} download>
                    Sonucu indir
                  </a>
                  {maskUrl ? (
                    <a className="btn" href={maskUrl} target="_blank" rel="noreferrer">
                      Maskeyi aç
                    </a>
                  ) : null}
                  <button className="btn" type="button" onClick={() => {
                    setJob(null);
                    setError(null);
                    setStrokePayload(null);
                    setStep(2);
                    setStatusMessage('Aynı görsel için yeni işaretleme yapabilirsiniz.');
                    setProcessSeconds(null);
                  }}>
                    Aynı görselde tekrar dene
                  </button>
                  <button className="btn" type="button" onClick={() => {
                    setFile(null);
                    setUploadMeta(null);
                    setStrokePayload(null);
                    setJob(null);
                    setError(null);
                    setStatusMessage(null);
                    setProcessSeconds(null);
                    setStep(1);
                  }}>
                    Yeni görsel
                  </button>
                </div>
                <div className="small">
                  Kalite kontrol: <strong>{job.passed_qc ? 'geçti' : 'uyarı'}</strong>
                  {' · '}
                  Maske dışı fark: {job.outside_diff ?? 0}
                  {processSeconds !== null ? ` · İşlem süresi: ${processSeconds.toFixed(2)} sn` : ''}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
