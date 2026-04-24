# Deploy Notes

## Hedef Mimari
- Frontend: ayrı deploy
- Backend: ayrı deploy
- Media dosyaları: production ortamında local disk yerine kalıcı storage düşünülmeli

## Önerilen İlk Deploy
- Frontend: Vercel veya benzeri platform
- Backend: Linux VPS / cloud sunucu / container tabanlı ortam
- Reverse proxy: Nginx
- Domain: frontend ve backend için ayrı subdomain düşünülebilir

## Local -> Production Farkları
- NEXT_PUBLIC_API_BASE production backend adresine dönecek
- backend CORS_ORIGINS production frontend adresine göre güncellenecek
- storage_dir local disk yerine kalıcı disk veya object storage olabilir
- debug / reload kapatılacak

## Production İçin Gerekli Maddeler
- HTTPS
- sabit domain
- CORS temizliği
- log saklama
- otomatik restart
- environment secret yönetimi
- media retention / cleanup planı

## Riskler
- Şu an storage local ve sınırsız büyüyebilir
- Laptop bağımlılığı production için uygun değil
- Auth olmadığı için herkes erişebilir
- Çoklu kullanıcı ve yüksek trafik testi yok

## Sonraki Teknik Adımlar
1. Backend için production config hazırlamak
2. Frontend build almak
3. API base ve CORS ayarlarını production’a göre ayırmak
4. Media storage kararını vermek
5. Cleanup script eklemek
6. Basit health + monitoring planı eklemek