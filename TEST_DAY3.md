# Gün 3 Test / Yapı Sonuçları

## Yapılan Düzenlemeler
- Klasör yapısı netleştirildi
- Deploy hazırlık notları oluşturuldu
- Test görselleri ayrı klasöre taşındı
- README ürün mantığıyla güncellendi
- Environment ayarları belgelendi

## Klasör Yapısı
- backend/app -> API ve işlem mantığı
- backend/storage -> upload, preview, mask, result çıktıları
- backend/logs -> çalışma logları
- frontend -> Next.js arayüzü
- test_assets -> sabit test görselleri

## Config Ayrımı
- backend/.env local geliştirme için kullanılıyor
- frontend/.env.local frontend API adresini tutuyor
- deploy sırasında production env ayrı olacak
- CORS origin’leri local ve ağ testine göre ayarlanıyor

## Deploy Hazırlık Notları
- frontend ayrı deploy edilebilir
- backend ayrı deploy edilebilir
- storage şu an local disk üzerinde
- production’da media storage ayrı düşünülmeli
- laptop bağımlılığı halen var

## Bilinen Sınırlamalar
- otomatik cleanup yok
- storage büyüyebilir
- kullanıcı hesabı / auth yok
- çoklu kullanıcı yük testi yapılmadı
- deploy edilmediği için sistem laptop açıkken çalışıyor

## Gün Sonu Özeti
- Proje yerel ağda stabil çalışıyor
- Desktop ve telefonda temel akış başarılı
- Dosya yapısı ve notlar ürünleşme için hazırlandı
- Sonraki adım deploy hazırlığını uygulamaya geçirmek