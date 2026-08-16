# Deployment River Station ke AWS EC2

Dokumen ini menjelaskan langkah deployment sistem River Station ke AWS EC2 menggunakan Docker Compose. Sistem terdiri dari frontend React yang dilayani Nginx, backend FastAPI, MQTT Broker Mosquitto, dan InfluxDB sebagai database time-series.

## 1. Arsitektur Deployment

Alur sistem setelah deployment adalah:

```text
ESP32 → MQTT Broker Mosquitto → Backend FastAPI → InfluxDB
                                      ↓
                              Frontend React/Nginx
```

Perangkat ESP32 mengirimkan data sensor ke EC2 melalui MQTT. Backend menerima dan memproses data, kemudian menyimpannya ke InfluxDB. Frontend mengambil data dari backend dan menampilkannya pada dashboard, halaman History Data, serta grafik monitoring.

## 2. Prasyarat

Siapkan hal berikut sebelum deployment:

- Akun AWS
- Repository project River Station
- AWS Key Pair berformat `.pem`
- Token Telegram dan Chat ID jika notifikasi digunakan
- Perangkat ESP32
- Komputer yang sudah memiliki SSH client

Project membutuhkan Docker dan Docker Compose. PlatformIO diperlukan untuk mengunggah firmware ke ESP32.

## 3. Membuat Instance EC2

1. Masuk ke AWS Management Console.
2. Buka layanan **EC2**.
3. Pilih **Launch instance**.
4. Gunakan konfigurasi berikut:

| Konfigurasi | Nilai |
|---|---|
| Name | `river-station-server` |
| AMI | Ubuntu Server 22.04 LTS |
| Instance type | `t2.small` atau lebih tinggi |
| Storage | Minimal 20 GB |
| Key pair | Buat atau pilih key pair yang tersedia |
| Public IP | Aktif |

Gunakan Elastic IP apabila alamat server harus tetap dan tidak berubah ketika instance dihentikan atau dijalankan kembali.

## 4. Konfigurasi Security Group

Tambahkan inbound rules berikut:

| Type | Port | Source | Keterangan |
|---|---:|---|---|
| SSH | 22 | IP komputer administrator | Akses terminal EC2 |
| HTTP | 80 | `0.0.0.0/0` atau ALB Security Group | Akses HTTP dan redirect ke HTTPS |
| HTTPS | 443 | `0.0.0.0/0` | Akses dashboard melalui HTTPS |
| Custom TCP | 1883 | IP atau jaringan ESP32 | Komunikasi MQTT |
| Custom TCP | 8000 | IP administrator | FastAPI dan Swagger |
| Custom TCP | 8086 | IP administrator | InfluxDB UI |

Jika menggunakan Application Load Balancer (ALB), buat Security Group terpisah untuk ALB dan izinkan port 80 serta 443 dari internet. Pada Security Group EC2, izinkan port 80 hanya dari Security Group ALB. Port 22 sebaiknya tidak dibuka untuk semua alamat. Port 8000 dan 8086 cukup dibuka untuk IP administrator. Untuk penggunaan produksi, MQTT sebaiknya dilengkapi autentikasi dan TLS.

## 5. Mengaktifkan HTTPS dengan Application Load Balancer

Cara yang direkomendasikan di AWS adalah menggunakan domain, AWS Certificate Manager (ACM), dan Application Load Balancer (ALB). ALB menerima koneksi HTTPS lalu meneruskannya ke container frontend pada port HTTP 80.

### 5.1 Menyiapkan domain dan sertifikat ACM

1. Siapkan domain, misalnya `river.example.com`, melalui Route 53 atau registrar lain.
2. Buka **AWS Certificate Manager (ACM)** pada region yang sama dengan EC2.
3. Pilih **Request a certificate**, masukkan domain, lalu pilih **DNS validation**.
4. Tambahkan record CNAME validasi ACM ke DNS domain. Jika DNS dikelola Route 53, gunakan **Create records in Route 53**.
5. Tunggu sampai status sertifikat menjadi **Issued**.

Sertifikat ACM harus dibuat pada region yang sama dengan ALB. Jangan mengubah `PUBLIC_IP_EC2` menjadi alamat HTTPS; HTTPS menggunakan nama domain.

### 5.2 Membuat target group

1. Buka **EC2 → Target Groups → Create target group**.
2. Pilih target type **Instances**, protocol **HTTP**, dan port `80`.
3. Atur health check path ke `/`.
4. Daftarkan instance EC2 sebagai target pada port `80`.

### 5.3 Membuat dan mengatur ALB

1. Buka **EC2 → Load Balancers → Create Application Load Balancer**.
2. Pilih **Internet-facing** dan IPv4.
3. Pilih minimal dua Availability Zone dan buat atau pilih Security Group ALB.
4. Tambahkan listener **HTTPS : 443**, pilih sertifikat ACM, dan arahkan ke target group frontend.
5. Tambahkan listener **HTTP : 80** dengan action **Redirect** ke HTTPS pada port `443`.
6. Pada Route 53, buat record **A (Alias)** untuk `river.example.com` yang menunjuk ke ALB.

Setelah target berstatus **healthy**, akses dashboard melalui `https://river.example.com`. Container frontend tetap berjalan pada port HTTP 80; TLS dihentikan di ALB.

### 5.4 Penyesuaian environment variable

Setelah domain aktif, ubah `backend/.env`:

```env
CORS_ORIGINS=["https://river.example.com"]
```

Kemudian jalankan ulang backend:

```bash
docker compose up -d --build backend
```

## 6. Masuk ke Server EC2

Dari komputer lokal, buka terminal pada folder yang berisi file key pair, kemudian jalankan:

```bash
ssh -i "nama-key.pem" ubuntu@PUBLIC_IP_EC2
```

Ganti `nama-key.pem` dengan nama file key pair dan `PUBLIC_IP_EC2` dengan Public IPv4 atau Elastic IP instance.

Jika permission key bermasalah pada Linux atau macOS, jalankan:

```bash
chmod 400 nama-key.pem
```

## 7. Memperbarui Ubuntu

Jalankan perintah berikut pada server EC2:

```bash
sudo apt update
sudo apt upgrade -y
```

## 8. Menginstal Docker, Compose, dan Git

```bash
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
```

Tambahkan user Ubuntu ke grup Docker:

```bash
sudo usermod -aG docker ubuntu
```

Keluar dari server dan masuk kembali agar perubahan grup diterapkan:

```bash
exit
ssh -i "nama-key.pem" ubuntu@PUBLIC_IP_EC2
```

Periksa instalasi:

```bash
docker --version
docker compose version
git --version
```

## 9. Mengambil Source Code

Clone repository project ke server:

```bash
git clone URL_REPOSITORY river-station
cd river-station
```

Ganti `URL_REPOSITORY` dengan alamat repository project. Pastikan struktur project terlihat seperti berikut:

```text
backend/
frontend/
esp32-river/
mosquitto/
 docker-compose.yml
```

## 10. Menyiapkan Environment Variable

Jangan menyimpan password, token, atau secret langsung pada repository. Buat file `.env` pada folder utama project:

```bash
nano .env
```

Isi dengan konfigurasi berikut dan ganti nilainya:

```env
INFLUXDB_INIT_PASSWORD=PASSWORD_INFLUXDB_KUAT
INFLUXDB_TOKEN=TOKEN_INFLUXDB_KUAT
INFLUXDB_ORG=river-station
INFLUXDB_BUCKET=river_monitoring
INFLUXDB_RETENTION=30d
```

Buat konfigurasi backend berdasarkan template:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Sesuaikan nilai penting berikut:

```env
DEBUG=false

MQTT_BROKER=mosquitto
MQTT_PORT=1883
MQTT_TOPIC_WEATHER=river/weather
MQTT_TOPIC_HEARTBEAT=river/heartbeat

INFLUXDB_URL=http://influxdb:8086
INFLUXDB_TOKEN=TOKEN_INFLUXDB_KUAT
INFLUXDB_ORG=river-station
INFLUXDB_BUCKET=river_monitoring

TELEGRAM_BOT_TOKEN=TOKEN_BOT_TELEGRAM
TELEGRAM_CHAT_ID=ID_CHAT_TELEGRAM
TELEGRAM_ENABLED=true

CORS_ORIGINS=["http://PUBLIC_IP_EC2"]
```

Nilai `INFLUXDB_TOKEN` harus sama dengan token pada file `.env` utama. Jika Telegram tidak digunakan, ubah `TELEGRAM_ENABLED=false`.

## 11. Menjalankan Container

Pastikan berada pada folder utama project:

```bash
cd ~/river-station
```

Jalankan build dan semua service:

```bash
docker compose up -d --build
```

Service yang dijalankan adalah:

- `influxdb` untuk penyimpanan data sensor
- `mosquitto` untuk komunikasi MQTT
- `backend` untuk pemrosesan data dan REST API
- `frontend` untuk dashboard React melalui Nginx

Periksa status container:

```bash
docker compose ps
```

Semua service harus menunjukkan status berjalan atau `Up`.

## 12. Memeriksa Log

Lihat log seluruh service:

```bash
docker compose logs
```

Lihat log service tertentu:

```bash
docker compose logs -f backend
docker compose logs -f mosquitto
docker compose logs -f influxdb
docker compose logs -f frontend
```

Tekan `Ctrl+C` untuk menghentikan tampilan log. Perintah ini tidak menghentikan container.

## 13. Mengakses Layanan

Jika HTTPS dan domain sudah dikonfigurasi, gunakan alamat dashboard berikut:

| Layanan | Alamat |
|---|---|
| Dashboard production | `https://river.example.com` |
| Dashboard langsung ke EC2 | `http://PUBLIC_IP_EC2` |
| Backend Swagger | `http://PUBLIC_IP_EC2:8000/docs` |
| InfluxDB UI | `http://PUBLIC_IP_EC2:8086` |
| Health check | `http://PUBLIC_IP_EC2:8000/api/health` |

Ganti `river.example.com` dengan domain milik sendiri. Backend dan InfluxDB sebaiknya tidak dipublikasikan langsung melalui internet; akses port 8000 dan 8086 hanya dari IP administrator.

Login InfluxDB menggunakan username `admin` dan password yang ditentukan pada `INFLUXDB_INIT_PASSWORD`.

## 14. Mengonfigurasi ESP32

ESP32 tidak boleh menggunakan `localhost` sebagai alamat MQTT karena `localhost` mengarah ke perangkat ESP32. Ubah konfigurasi firmware agar broker menunjuk ke alamat EC2:

```text
MQTT_BROKER=PUBLIC_IP_EC2
MQTT_PORT=1883
```

Konfigurasikan SSID dan password WiFi pada firmware, lalu unggah menggunakan PlatformIO:

```bash
pio run -t upload -e esp32dev
pio device monitor
```

ESP32 mengirimkan data melalui topic:

```text
river/weather
river/heartbeat
```

## 15. Memverifikasi Data MQTT

Pantau pesan weather yang diterima broker:

```bash
docker compose exec mosquitto mosquitto_sub -h localhost -t river/weather -v
```

Pantau heartbeat perangkat:

```bash
docker compose exec mosquitto mosquitto_sub -h localhost -t river/heartbeat -v
```

Jika pesan tidak muncul, periksa alamat IP broker pada ESP32, koneksi WiFi, port 1883, dan log Mosquitto.

## 16. Memverifikasi Data InfluxDB

Buka InfluxDB melalui:

```text
http://PUBLIC_IP_EC2:8086
```

Masuk ke menu **Data Explorer**, kemudian jalankan query berikut:

```flux
from(bucket: "river_monitoring")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "weather")
```

Query tersebut mengambil data dari bucket `river_monitoring`, membatasi waktu pengamatan pada 24 jam terakhir, dan hanya menampilkan measurement `weather`.

Jika hasil query menampilkan data, berarti proses berikut telah berhasil:

```text
ESP32 → MQTT → FastAPI → InfluxDB
```

## 17. Memverifikasi Backend dan Dashboard

Uji health check dari server:

```bash
curl http://localhost:8000/api/health
```

Uji endpoint data terbaru:

```bash
curl http://localhost:8000/api/weather/latest
```

Kemudian buka dashboard melalui browser:

```text
http://PUBLIC_IP_EC2
```

Periksa status ESP32, informasi sensor, status peringatan sungai, grafik real-time, halaman History Data, dan halaman About System.

## 18. Memperbarui Aplikasi

Jika terdapat perubahan pada repository:

```bash
cd ~/river-station
git pull
docker compose up -d --build
docker compose ps
```

## 19. Perintah Operasional

Menghentikan container tanpa menghapus data:

```bash
docker compose down
```

Menjalankan kembali container:

```bash
docker compose up -d
```

Membangun ulang image:

```bash
docker compose up -d --build
```

Melihat penggunaan resource:

```bash
docker stats
```

Menghapus container sekaligus volume dan data database:

```bash
docker compose down -v
```

Perintah `docker compose down -v` hanya digunakan jika seluruh data ingin dihapus.

## 20. Troubleshooting

### Container backend berhenti

Periksa log backend:

```bash
docker compose logs backend
```

Pastikan `backend/.env` tersedia dan token InfluxDB benar.

### Backend tidak terhubung ke InfluxDB

Periksa status service:

```bash
docker compose ps
```

Di dalam Docker network, backend harus menggunakan alamat:

```env
INFLUXDB_URL=http://influxdb:8086
```

### ESP32 tidak mengirim data

Periksa alamat broker pada firmware, koneksi WiFi, port MQTT pada Security Group, dan topic MQTT yang digunakan.

### HTTPS atau domain tidak dapat diakses

Periksa hal berikut:

- Sertifikat ACM berstatus **Issued** dan berada di region yang sama dengan ALB.
- Record DNS domain menunjuk ke ALB, bukan langsung ke Public IP EC2.
- Listener ALB pada port 443 menggunakan sertifikat ACM dan target group yang benar.
- Target EC2 berstatus **healthy**.
- Security Group ALB membuka port 443 dan Security Group EC2 mengizinkan trafik dari ALB.
- Listener port 80 dikonfigurasi untuk redirect ke port 443.

### Dashboard tidak menampilkan data

Uji backend melalui:

```bash
curl http://PUBLIC_IP_EC2:8000/api/health
curl http://PUBLIC_IP_EC2:8000/api/weather/latest
```

Kemudian periksa log frontend dan backend.

### Data belum terlihat di InfluxDB

Pastikan ESP32 sudah mengirim data, backend tidak mengalami error, dan rentang waktu Data Explorer mencakup waktu pengiriman data.

## 21. Keamanan Production

- Gunakan Elastic IP atau domain.
- Gunakan password InfluxDB yang kuat.
- Ganti token InfluxDB bawaan.
- Jangan commit file `.env`.
- Batasi akses SSH berdasarkan IP administrator.
- Batasi akses port 8000 dan 8086.
- Aktifkan autentikasi Mosquitto.
- Gunakan HTTPS melalui Application Load Balancer dan AWS Certificate Manager.
- Pastikan listener HTTP mengarahkan trafik ke HTTPS.
- Batasi `CORS_ORIGINS` ke domain HTTPS frontend.
- Lakukan backup volume InfluxDB secara berkala.
- Jangan menjalankan `docker compose down -v` tanpa memastikan data memang boleh dihapus.

## 22. Checklist Deployment

- [ ] Instance EC2 Ubuntu berhasil dibuat.
- [ ] Security Group telah dikonfigurasi.
- [ ] Docker dan Docker Compose berhasil diinstal.
- [ ] Repository berhasil di-clone.
- [ ] File `.env` utama telah dibuat.
- [ ] File `backend/.env` telah dikonfigurasi.
- [ ] Semua container berjalan.
- [ ] Health check backend berhasil.
- [ ] ESP32 terhubung ke broker MQTT.
- [ ] Data muncul pada topic `river/weather`.
- [ ] Data muncul pada Data Explorer InfluxDB.
- [ ] Dashboard dapat diakses melalui Public IP EC2.
- [ ] Domain telah diarahkan ke Application Load Balancer.
- [ ] Sertifikat ACM berstatus **Issued**.
- [ ] Listener ALB HTTPS port 443 aktif.
- [ ] HTTP otomatis diarahkan ke HTTPS.
- [ ] Dashboard dapat diakses melalui `https://DOMAIN`.
- [ ] `CORS_ORIGINS` menggunakan domain HTTPS.
- [ ] Halaman History Data menampilkan data sensor.
