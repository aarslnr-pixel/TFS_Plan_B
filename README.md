# Object Eraser Starter

Mobil öncelikli nesne silme aracı. Kullanıcı görsel yükler, preview üstünde kaldırmak istediği alanı boyar, backend orijinal görsel üzerinde maske üretip inpaint uygular.

## Temel Akış
1. Kullanıcı görsel yükler
2. Backend orijinal dosyayı saklar ve preview üretir
3. Kullanıcı preview üstünde boyama yapar
4. Stroke verisi backend'e gönderilir
5. Backend maskeyi üretir ve orijinal görselde işlem yapar
6. Sonuç ve maske kullanıcıya gösterilir

## Klasör Yapısı
- `backend/app` -> API ve işlem mantığı
- `backend/storage` -> session çıktı dosyaları
- `backend/logs` -> çalışma logları
- `frontend` -> Next.js arayüzü
- `test_assets` -> tekrar test için saklanan görseller

## Local Kurulum

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000