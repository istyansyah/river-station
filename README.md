# 🌊 River Station — Sistem Monitoring & Early Warning IoT

> **Rancang Bangun Sistem Monitoring dan Early Warning Kawasan Wisata Sungai Berbasis Internet of Things (IoT)**

[![ESP32](https://img.shields.io/badge/Firmware-ESP32%20Arduino-blue?logo=espressif)](https://platformio.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react)](https://react.dev)
[![InfluxDB](https://img.shields.io/badge/Database-InfluxDB%20v2-22ADF6?logo=influxdb)](https://www.influxdata.com)
[![Docker](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED?logo=docker)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📋 Deskripsi Proyek

Sistem monitoring real-time dan peringatan dini (early warning) berbasis IoT untuk kawasan wisata sungai. Sistem ini mengumpulkan data lingkungan dari sensor ESP32, memproses data di backend FastAPI, menyimpannya di InfluxDB, dan menampilkan dashboard interaktif kepada operator melalui antarmuka web React.

**Ketika kondisi berbahaya terdeteksi, sistem otomatis mengirimkan notifikasi Telegram ke petugas.**

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                      SENSOR NODE (ESP32)                        │
│  JSN-SR04T  AHT10  Rain Sensor  Anemometer  WiFi                │
│         └──────────────────────────────┘                        │
│                        MQTT Publish                             │
│                   river/weather  (30s)                          │
│                   river/heartbeat (60s)                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ MQTT (port 1883)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MOSQUITTO MQTT BROKER                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Subscribe
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND                               │
│                                                                 │
│  MQTT Handler → Early Warning Engine → InfluxDB Write           │
│                      │                                          │
│                       ├──► Telegram Alert (Waspada/Siaga/Awas) │
│                       └──► WebSocket Broadcast                  │
│                                                                 │
│  REST API: /api/weather/latest  /api/weather/history            │
│            /api/weather/chart   /api/status  /api/health        │
└──────────┬────────────────────────┬─────────────────────────────┘
           │ Write/Query            │ WebSocket + REST
           ▼                        ▼
┌──────────────────┐    ┌───────────────────────────────────────┐
│    INFLUXDB v2   │    │        REACT DASHBOARD (Nginx)        │
│  river_monitoring│    │                                       │
│  retention: 30d  │    │  Dashboard  │  Grafik  │  Histori     │
└──────────────────┘    └───────────────────────────────────────┘
                                    │
                                    ▼
                           📱 Telegram Bot
                           (Siaga dan Awas only)
```

---

## 🔧 Hardware Sensor Node

| Komponen | Fungsi | Pin |
|---|---|---|
| ESP32 Dev Module | Mikrokontroler utama | — |
| JSN-SR04T | Tinggi muka air (ultrasonic) | TRIG: 5, ECHO: 18 |
| AHT10 | Suhu & kelembapan udara | SDA: 21, SCL: 22 |
| Rain Sensor | Intensitas hujan (ADC) | GPIO 35 |
| Anemometer | Kecepatan angin (pulse count) | GPIO 19 |
| BOOT Button | Factory reset WiFi | GPIO 0 |

### Payload MQTT (`river/weather`)
```json
{
  "device_id": "river-node-01",
  "location": "Lubuk Minturun",
  "temperature": 32.5,
  "humidity": 78.2,
  "heat_index": 38.7,
  "raw_distance": 145.0,
  "wind_speed": 11.52,
  "rain_raw": 2048,
  "rain_status": "Light Rain",
  "rssi": -62
}
```

---

## 🚦 Sistem Early Warning

Sistem memisahkan **Status Sungai** dan **Kelayakan Wisata**. Status sungai hanya menggunakan kenaikan muka air relatif; hujan, panas, dan angin digunakan untuk kelayakan wisata.

Sistem menggunakan **Relative Water Level Calculation**. JSN-SR04T mengukur jarak sensor ke muka air, lalu sistem menghitung kenaikan muka air relatif:

```text
ΔH = Dnormal − Dcurrent
```

| Status | Kondisi | Aksi |
|--------|---------|------|
| 🟢 **NORMAL** | ΔH < 30 cm | Wisata dibuka dan monitoring rutin |
| 🟡 **WASPADA** | 30 ≤ ΔH < 60 cm, atau hujan/panas/angin kencang terdeteksi | Batasi aktivitas dan tingkatkan pemantauan |
| 🟠 **SIAGA** | 60 ≤ ΔH < 90 cm | Hentikan aktivitas air dan siapkan evakuasi |
| 🔴 **AWAS** | ΔH ≥ 90 cm | Tutup lokasi dan evakuasi pengunjung |

`Dnormal` adalah jarak muka air pada kondisi normal, sedangkan `Dcurrent` adalah jarak pengukuran saat ini. `water_level` berarti kenaikan muka air relatif, bukan jarak mentah.

Parameter untuk kelayakan wisata:
- **Hujan** (`rain_raw < 3000`) → Wisata menjadi Hati-hati
- **Heat Index > 32.2°C** → Wisata menjadi Hati-hati
- **Kecepatan angin ≥ 45 km/jam** → Wisata menjadi Hati-hati
- Status sungai tetap hanya ditentukan oleh kenaikan muka air.
- Jika beberapa kondisi terjadi bersamaan, gunakan rekomendasi wisata yang paling ketat.
- Banjir, arus deras, petir, kabut, longsor, dan pohon tumbang tidak diklasifikasikan otomatis karena tidak tersedia sensornya.

Semua threshold dapat dikonfigurasi melalui `backend/.env`.

## 🌊 Relative Water Level

Sistem menggunakan metode **Relative Water Level Calculation**. Sensor JSN-SR04T mengukur jarak antara sensor dan permukaan air, kemudian sistem menghitung kenaikan muka air dibandingkan kondisi normal.

### Rumus

```text
ΔH = Dnormal − Dcurrent
```

| Variabel | Keterangan | Satuan |
|----------|------------|--------|
| `ΔH` | Kenaikan muka air relatif yang digunakan untuk klasifikasi | cm |
| `Dnormal` | Jarak sensor ke muka air pada kondisi normal | cm |
| `Dcurrent` | Jarak sensor ke muka air pada pengukuran saat ini | cm |

Contoh:

```text
Dnormal  = 180 cm
Dcurrent = 145 cm
ΔH       = 180 − 145 = 35 cm
```

Artinya, muka air naik **35 cm dibandingkan kondisi normal**. Sistem tidak menggunakan jarak mentah untuk menentukan status sungai.

### Konfigurasi

Konfigurasi ada pada backend:

```dotenv
NORMAL_DISTANCE_CM=180.0
MEASUREMENT_METHOD=relative
WARNING_WATER_LEVEL_INCREASE_CM=30.0
DANGER_WATER_LEVEL_INCREASE_CM=60.0
CRITICAL_WATER_LEVEL_INCREASE_CM=90.0
```

### Klasifikasi Kenaikan Muka Air

| Kenaikan relatif (`ΔH`) | Status sungai | Tindakan |
|-------------------------|---------------|----------|
| `< 30 cm` | **Normal** | Monitoring normal |
| `≥ 30 cm` dan `< 60 cm` | **Waspada** | Tingkatkan pemantauan |
| `≥ 60 cm` dan `< 90 cm` | **Siaga** | Hentikan aktivitas air dan siapkan evakuasi |
| `≥ 90 cm` | **Awas** | Tutup lokasi dan evakuasi pengunjung |

### Data yang Dikirim

Firmware mengirim **data mentah** `raw_distance` (jarak sensor ke muka air). Backend kemudian menghitung kenaikan muka air relatif `water_level`.

```json
{
  "raw_distance": 145.0,
  "measurement_method": "raw"
}
```

Backend menerima `raw_distance` sebagai field wajib, menghitung `water_level = Dnormal - raw_distance`, menyimpan keduanya ke InfluxDB, lalu melakukan seluruh klasifikasi sungai dan wisata.

### Prosedur Kalibrasi

1. Pasang sensor JSN-SR04T pada posisi tetap.
2. Pastikan sungai berada pada kondisi normal.
3. Ukur jarak sensor ke permukaan air.
4. Simpan hasil pengukuran sebagai `NORMAL_DISTANCE_CM`.
5. Uji sistem dengan membandingkan `Dcurrent` dan `Dnormal`.
6. Kalibrasi ulang jika posisi sensor berubah atau kondisi fisik sungai mengalami perubahan permanen.

Dokumentasi teknis lengkap mengenai metode, pseudocode, diagram, dan desain class tersedia pada `RELATIVE_WATER_LEVEL.md`.

---

## 📁 Struktur Proyek

Struktur aktual proyek menggunakan source firmware ESP32 yang terpusat pada `main.cpp`, sedangkan perhitungan relative water level dilakukan di backend (`SensorService`).

```
river-station/
├── 📂 esp32-river/                       # Firmware ESP32 PlatformIO
│   ├── platformio.ini                    # Board, framework, dan library
│   └── src/
│       └── main.cpp                      # Sensor, WiFi, MQTT, telemetry, heartbeat
│
├── 📂 mosquitto/
│   └── config/mosquitto.conf             # Listener, WebSocket, persistence, dan auth MQTT
│
├── 📂 backend/                           # FastAPI Backend
│   ├── app/
│   │   ├── config/settings.py            # Konfigurasi environment dan threshold
│   │   ├── core/                         # Dependency injection dan exception
│   │   ├── database/influxdb.py          # Factory dan health check InfluxDB
│   │   ├── logging/logger.py              # Konfigurasi logging
│   │   ├── middlewares/cors.py            # Konfigurasi CORS
│   │   ├── models/sensor_data.py          # Model sensor, status sungai, dan wisata
│   │   ├── mqtt/                         # MQTT client dan message handler
│   │   ├── repositories/weather_repository.py # Akses data measurement weather
│   │   ├── routers/                      # Endpoint weather, status, dan WebSocket
│   │   ├── schemas/weather.py             # Schema response API
│   │   ├── services/
│   │   │   ├── sensor_service.py          # Orkestrasi pemrosesan data
│   │   │   ├── warning_service.py         # Klasifikasi status sungai berbasis ΔH
│   │   │   ├── tourism_service.py        # Klasifikasi kelayakan wisata
│   │   │   └── telegram_service.py       # Notifikasi Siaga dan Awas
│   │   └── websocket/manager.py           # Broadcast data realtime
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env                              # Konfigurasi aktif lokal
│   └── .env.example                      # Template konfigurasi
│
├── 📂 frontend/                          # React + TypeScript Dashboard
│   ├── src/
│   │   ├── api/                          # Axios client dan fungsi API
│   │   ├── hooks/                        # Query data dan WebSocket realtime
│   │   ├── components/
│   │   │   ├── cards/                    # Water level, cuaca, status, dan health
│   │   │   ├── charts/                   # Grafik realtime
│   │   │   ├── history/                  # Tabel, filter, pagination, dan CSV
│   │   │   ├── layout/                   # Sidebar, header, footer, dan layout
│   │   │   └── ui/                       # Komponen UI umum
│   │   ├── pages/                        # DashboardPage, HistoryPage, AboutPage
│   │   ├── types/sensor.ts               # Interface data sensor dan response API
│   │   ├── App.tsx                       # Router dan QueryClient
│   │   └── index.css                     # Tailwind dan tema navy-teal
│   ├── .env                              # Konfigurasi API frontend
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── nginx.conf                        # Static hosting dan proxy API/WebSocket
│   └── Dockerfile
│
├── RELATIVE_WATER_LEVEL.md               # Rumus, kalibrasi, diagram, dan pseudocode
├── docker-compose.yml                    # Orkestrasi InfluxDB, MQTT, backend, frontend
├── README.md
└── .gitignore
```

---

## 🚀 Cara Menjalankan

### Prasyarat

| Software | Versi Minimum |
|---|---|
| Docker Desktop | 24.x |
| Docker Compose | v2.x (sudah bundled dengan Docker Desktop) |
| PlatformIO IDE | Untuk upload firmware |

### 1. Clone & Konfigurasi

```bash
git clone <url-repo> river-station
cd river-station

# Salin template environment ke .env aktif
cp backend/.env.example backend/.env
```

### 2. Isi Konfigurasi di `backend/.env`

Buka file `backend/.env` dan isi nilai berikut:

```dotenv
# Token Telegram Bot (dari @BotFather)
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_CHAT_ID=-987654321
TELEGRAM_ENABLED=true

# Token InfluxDB — salin dari langkah 3
INFLUXDB_TOKEN=river-station-super-secret-token-change-in-production
```

### 3. Jalankan Docker Compose

```bash
docker compose up -d
```

> Pada **pertama kali** dijalankan, InfluxDB akan otomatis dibuat dengan:
> - **Org:** `river-station`
> - **Bucket:** `river_monitoring`
> - **Token:** `river-station-super-secret-token-change-in-production`
>
> ⚠️ **Ganti token ini di production!**

### 4. Verifikasi Layanan

| Layanan | URL | Keterangan |
|---|---|---|
| Dashboard | http://localhost | Antarmuka utama |
| Backend API | http://localhost:8000/docs | Swagger UI |
| InfluxDB UI | http://localhost:8086 | Username: `admin`, Password: `adminpassword123` |
| Health Check | http://localhost:8000/api/health | Status backend |

```bash
# Cek status semua container
docker compose ps

# Lihat log backend
docker compose logs -f backend

# Lihat log MQTT broker
docker compose logs -f mosquitto
```

### 5. Upload Firmware ke ESP32

```bash
cd esp32-river

# Edit konfigurasi WiFi dan MQTT di src/config/Config.h
# Ubah:
#   MQTT_BROKER → IP address mesin yang menjalankan Docker
#   WIFI_SSID / WIFI_PASSWORD → Kredensial WiFi lokal

# Build dan upload
pio run -t upload -e esp32dev

# Monitor serial output
pio device monitor
```

**Reset WiFi (jika ganti jaringan):** Tahan tombol BOOT selama >3 detik → Captive portal aktif.

---

## 📊 API Endpoints

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/status` | Status infrastruktur (MQTT, DB, Telegram) |
| `GET` | `/api/weather/latest` | Data sensor terbaru |
| `GET` | `/api/weather/history` | Histori data (paginasi) |
| `GET` | `/api/weather/chart` | Data agregasi untuk grafik |
| `WS` | `/ws/weather` | WebSocket realtime stream |

**Contoh request:**
```bash
# Data terbaru
curl http://localhost:8000/api/weather/latest

# Histori 1 jam terakhir, halaman 1
curl "http://localhost:8000/api/weather/history?page=1&page_size=50"

# Grafik tinggi air per 1 menit (1 jam terakhir)
curl "http://localhost:8000/api/weather/chart?field=water_level&start=-1h&window=1m"
```

---

## ⚙️ Konfigurasi Threshold Early Warning

Edit `backend/.env` untuk mengkalibrasi threshold sesuai kondisi fisik sungai:

```dotenv
# Relative water-level increase from normal condition (cm)
NORMAL_DISTANCE_CM=180.0
MEASUREMENT_METHOD=relative
WARNING_WATER_LEVEL_INCREASE_CM=30.0
DANGER_WATER_LEVEL_INCREASE_CM=60.0
CRITICAL_WATER_LEVEL_INCREASE_CM=90.0

# Heat Index (°C)
WARNING_HEAT_INDEX_C=32.2
DANGER_HEAT_INDEX_C=39.4
CRITICAL_HEAT_INDEX_C=51.7

# Kecepatan angin (km/h)
WARNING_WIND_SPEED_KMH=45.0
DANGER_WIND_SPEED_KMH=65.0
```

Setelah mengubah `.env`, restart backend:
```bash
docker compose restart backend
```

---

## 🛠️ Development Lokal (Tanpa Docker)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # Buka http://localhost:5173
```

> Dev server Vite sudah dikonfigurasi proxy ke `localhost:8000` untuk `/api` dan `/ws`.

---

## 📄 Ekspor Data CSV

Data histori dapat diunduh melalui tombol **Ekspor CSV** pada halaman **History Data** di dashboard.

File CSV menggunakan format yang kompatibel dengan Excel Indonesia:

- Pemisah kolom: titik koma (`;`)
- Encoding: UTF-8 dengan BOM
- Pemisah baris: CRLF (`\\r\\n`)
- Semua nilai diapit tanda kutip untuk mencegah kolom bergeser
- Tanda kutip di dalam nilai di-escape secara otomatis
- Timestamp menggunakan UTC ISO 8601

Kolom yang tersedia:

| Kolom | Keterangan |
|---|---|
| `Timestamp UTC` | Waktu pengukuran dalam UTC |
| `Device ID` | Identitas perangkat ESP32 |
| `Location` | Lokasi stasiun sensor |
| `Temperature (°C)` | Suhu udara dari AHT10 |
| `Humidity (%)` | Kelembapan relatif dari AHT10 |
| `Heat Index (°C)` | Indeks panas |
| `Water Level Increase (cm)` | Kenaikan muka air relatif (`ΔH`) |
| `Raw Distance (cm)` | Jarak mentah sensor ke muka air, jika tersedia |
| `Wind Speed (km/h)` | Kecepatan angin |
| `Rain Raw (ADC)` | Nilai ADC mentah sensor hujan |
| `Rain Status` | Status hujan hasil klasifikasi |
| `River Status` | Status sungai: Normal, Waspada, Siaga, atau Awas |
| `Tourism Status` | Status wisata: Suitable, Caution, atau Not Recommended |
| `RSSI (dBm)` | Kekuatan sinyal WiFi |

CSV menyimpan data dalam bentuk baris dan kolom, tetapi tidak menyimpan border, warna, filter, atau format Excel Table. Untuk tampilan tabel dengan format visual, gunakan tabel histori langsung di dashboard.

---

## 🧪 Testing

```bash
# Simulasi MQTT message tanpa ESP32 (perlu mosquitto_pub)
mosquitto_pub -h localhost -t river/weather -m '{
  "device_id": "test-node",
  "location": "Test Location",
  "temperature": 32.5,
  "humidity": 78.2,
  "heat_index": 38.7,
  "raw_distance": 145.0,
  "wind_speed": 11.52,
  "rain_raw": 2048,
  "rain_status": "Light Rain",
  "rssi": -62
}'
```

> Dengan `NORMAL_DISTANCE_CM=180.0`, `raw_distance: 145.0` menghasilkan kenaikan muka air `180 - 145 = 35 cm` (status **WASPADA**). `raw_distance: 120.0` menghasilkan `60 cm` dan memicu status **SIAGA** serta notifikasi Telegram.

---

## 📱 Format Notifikasi Telegram

```
🔴 PERINGATAN - RIVER STATION
━━━━━━━━━━━━━━━━━━━━
📍 Lokasi      : Lubuk Minturun
🕐 Waktu       : 2024-01-15 14:30:22 WIB
⚠️ Status      : SIAGA
━━━━━━━━━━━━━━━━━━━━
💧 Kenaikan Air : 60.0 cm
🌡️ Suhu        : 32.5 °C
💦 Kelembapan  : 78.2 %
🌤️ Heat Index  : 38.7 °C
💨 Kec. Angin  : 3.2 m/s
🌧️ Hujan       : Light Rain
📶 Sinyal      : -62 dBm
━━━━━━━━━━━━━━━━━━━━
Device: test-node
```

---

## 🔒 Catatan Keamanan (Production)

- [ ] Ganti `INFLUXDB_TOKEN` dari nilai default
- [ ] Ganti `DOCKER_INFLUXDB_INIT_PASSWORD` dari `adminpassword123`
- [ ] Aktifkan password authentication di `mosquitto.conf`
- [ ] Tambahkan HTTPS/TLS (gunakan Nginx reverse proxy + Certbot)
- [ ] Batasi `CORS_ORIGINS` ke domain spesifik

---

## 🛑 Menghentikan Sistem

```bash
# Hentikan semua container (data tetap tersimpan)
docker compose down

# Hentikan dan hapus semua data (reset total)
docker compose down -v
```

---

## 📚 Teknologi yang Digunakan

| Layer | Teknologi |
|---|---|
| Firmware | C++ (Arduino), PlatformIO, ESP-IDF |
| MQTT Broker | Eclipse Mosquitto 2.0 |
| Backend | Python 3.11, FastAPI, paho-mqtt, httpx |
| Database | InfluxDB v2.7 (time-series) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v3, Recharts |
| Deployment | Docker, Docker Compose, Nginx |

---

## 👤 Penulis

Proyek Tugas Akhir — Jurusan Teknik Komputer Politeknik Negeri Padang

---

## 📄 Lisensi

[MIT License](LICENSE)  
