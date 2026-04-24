import { JobInfo, StrokePayload, UploadResponse } from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/uploads`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('Sunucuya ulaşılamadı. Laptop ve telefon aynı ağda mı kontrol edin.');
  }

  if (!response.ok) {
    throw new Error('Görsel yüklenemedi. Lütfen tekrar deneyin.');
  }

  return response.json();
}

export async function submitJob(sessionId: string, payload: StrokePayload): Promise<{ job_id: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/sessions/${sessionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('İşlem başlatılamadı. Ağ bağlantısını kontrol edin.');
  }

  if (!response.ok) {
    throw new Error('İş kuyruğa alınamadı. Tekrar deneyin.');
  }

  return response.json();
}

export async function fetchJob(jobId: string): Promise<JobInfo> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
      cache: 'no-store',
    });
  } catch {
    throw new Error('İş durumu alınamadı. Bağlantı koptu.');
  }

  if (!response.ok) {
    throw new Error('İş durumu alınamadı.');
  }

  return response.json();
}
