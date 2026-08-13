# BAB IV
# IMPLEMENTASI DAN PENGUJIAN

## 4.1 Implementasi

Implementasi sistem dilakukan berdasarkan rancangan pada Bab III. Sistem terdiri atas perangkat keras ESP32 dan sensor, perangkat lunak firmware, komunikasi MQTT, backend FastAPI, basis data InfluxDB, dashboard React, serta notifikasi Telegram. Seluruh bagian tersebut diintegrasikan agar data kondisi sungai dan lingkungan dapat dibaca, dikirim, diolah, disimpan, dan ditampilkan kepada pengelola.

### 4.1.1 Implementasi Perangkat Keras

Perangkat keras yang digunakan terdiri atas ESP32, sensor JSN-SR04T, sensor AHT10, sensor hujan, anemometer, tombol reset, LED indikator, dan catu daya. ESP32 berfungsi sebagai pusat kendali untuk membaca data sensor dan mengirimkannya ke server.

| Komponen | Pin ESP32 | Implementasi |
|---|---|---|
| JSN-SR04T Trigger | GPIO 5 | Mengirim sinyal pemicu pengukuran |
| JSN-SR04T Echo | GPIO 18 | Menerima sinyal pantulan |
| AHT10 SDA | GPIO 21 | Komunikasi data I2C |
| AHT10 SCL | GPIO 22 | Sinyal clock I2C |
| Sensor hujan | GPIO 35 | Membaca nilai analog |
| Anemometer | GPIO 34 | Membaca pulsa angin |
| Tombol reset | GPIO 0 | Mengatur ulang konfigurasi WiFi |
| LED indikator | GPIO 2 | Menunjukkan kondisi perangkat |

Sensor JSN-SR04T mem    baca jarak antara sensor dan permukaan air. Sensor AHT10 membaca suhu dan kelembapan udara. Sensor hujan membaca nilai analog untuk menentukan kondisi hujan, sedangkan anemometer membaca jumlah pulsa untuk menghitung kecepatan angin.

### 4.1.2 Implementasi Program ESP32

Program ESP32 dikembangkan menggunakan Arduino Framework dan dikelola melalui PlatformIO. Program melakukan inisialisasi sensor, koneksi WiFi, koneksi MQTT, pembacaan sensor, pengolahan awal, dan pengiriman payload data.

Pengukuran sensor dilakukan secara berkala dengan interval sekitar lima detik. Data cuaca dikirimkan sekitar setiap sepuluh detik, sedangkan data heartbeat dikirimkan sekitar setiap enam puluh detik. ESP32 juga memiliki mekanisme koneksi ulang WiFi dan MQTT, watchdog, LED indikator, sinkronisasi waktu NTP, serta tombol untuk mengatur ulang konfigurasi jaringan.

Heat index dihitung pada ESP32 berdasarkan nilai suhu dan kelembapan menggunakan metode Rothfusz regression. Kecepatan angin dihitung berdasarkan jumlah pulsa anemometer selama lima detik menggunakan persamaan kalibrasi. Hasil kecepatan angin dikirimkan dalam satuan kilometer per jam.

Payload data cuaca yang dikirimkan melalui MQTT berisi identitas perangkat, suhu, kelembapan, heat index, kecepatan angin, jarak permukaan air, nilai sensor hujan, RSSI, lokasi, metode pengukuran, dan timestamp apabila waktu NTP telah tersedia.

### 4.1.3 Implementasi Komunikasi MQTT

Komunikasi antara ESP32 dan backend menggunakan protokol MQTT dengan Mosquitto sebagai MQTT Broker. ESP32 mengirimkan data cuaca pada topic `river/weather` dan data heartbeat pada topic `river/heartbeat`.

| Topic | Fungsi |
|---|---|
| `river/weather` | Mengirimkan data sensor kondisi sungai dan lingkungan |
| `river/heartbeat` | Mengirimkan informasi aktivitas perangkat |
| `riverstation/device/cmd` | Menerima perintah perangkat |

Backend berlangganan topic MQTT dan meneruskan payload yang diterima ke proses pengolahan. Apabila koneksi MQTT terputus, ESP32 menjalankan proses koneksi ulang agar pengiriman data dapat dilanjutkan.

### 4.1.4 Implementasi Backend FastAPI

Backend dibangun menggunakan FastAPI. Backend menerima payload dari MQTT, mengubah data JSON menjadi struktur yang dapat diproses, melakukan normalisasi status hujan, dan memvalidasi data menggunakan model Pydantic.

Setelah data divalidasi, backend menghitung kenaikan muka air menggunakan persamaan:

```text
water_level = normal_distance_cm - raw_distance
```

Apabila hasil perhitungan bernilai negatif, nilai tersebut diubah menjadi nol. Pada konfigurasi aktif, nilai `NORMAL_DISTANCE_CM` yang digunakan adalah 250 cm.

Backend kemudian menentukan status sungai berdasarkan kenaikan muka air:

| Kenaikan Muka Air | Status Sungai |
|---:|---|
| < 30 cm | Normal |
| 30 cm sampai < 60 cm | Waspada |
| 60 cm sampai < 90 cm | Siaga |
| ≥ 90 cm | Awas |

Selain status sungai, backend menentukan status kelayakan wisata. Status Siaga atau Awas menghasilkan `Not Recommended`, status Waspada menghasilkan `Caution`, sedangkan status Normal dapat menghasilkan `Suitable` atau `Caution` berdasarkan kondisi hujan, heat index, dan kecepatan angin.

Threshold lingkungan yang digunakan adalah heat index 32,2°C dan kecepatan angin 45 km/jam sebagai batas kondisi yang memengaruhi kelayakan wisata. Backend juga menggunakan threshold heat index 39,4°C dan 51,7°C sebagai batas Danger dan Critical pada konfigurasi sistem.

### 4.1.5 Implementasi Basis Data InfluxDB

Data hasil pengolahan disimpan menggunakan InfluxDB pada bucket `river_monitoring` dengan measurement `weather`. Data identitas dan kategori disimpan sebagai tag, sedangkan nilai hasil pengukuran disimpan sebagai field.

Tag yang digunakan adalah `device_id`, `location`, `rain_status`, `warning_status`, dan `tourism_status`. Field yang digunakan adalah `temperature`, `humidity`, `heat_index`, `water_level`, `wind_speed`, `rain_raw`, `rssi`, serta `raw_distance` apabila tersedia. Timestamp disimpan dalam zona waktu UTC dengan presisi nanosecond.

Penyimpanan data dilakukan setelah proses klasifikasi selesai. Dengan demikian, setiap data yang tersimpan telah memiliki nilai sensor, kenaikan muka air, status sungai, dan status kelayakan wisata.

### 4.1.6 Implementasi REST API dan WebSocket

Backend menyediakan REST API untuk mengambil data terbaru, data histori, data grafik, dan status sistem. Endpoint yang digunakan adalah sebagai berikut:

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/weather/latest` | Mengambil data pengukuran terbaru |
| GET | `/api/weather/history` | Mengambil data historis |
| GET | `/api/weather/chart` | Mengambil data grafik |
| GET | `/api/status` | Menampilkan status layanan dan perangkat |
| GET | `/api/health` | Memeriksa kondisi backend |

Selain REST API, backend menyediakan WebSocket pada endpoint `/ws/weather`. WebSocket digunakan untuk mengirimkan data terbaru ke dashboard secara real-time setelah backend menerima dan menyimpan data dari ESP32.

### 4.1.7 Implementasi Dashboard React

Dashboard dikembangkan menggunakan React. Dashboard menampilkan status sungai, status kelayakan wisata, kenaikan muka air, jarak permukaan air, suhu, kelembapan, heat index, kecepatan angin, kondisi hujan, waktu data terakhir, status koneksi perangkat, dan grafik monitoring.

Dashboard menggunakan WebSocket untuk memperoleh pembaruan data secara real-time dan menggunakan REST API sebagai sumber data terbaru atau fallback. Halaman histori menyediakan filter tanggal, filter status sungai, pagination, tabel pengukuran, dan fitur ekspor data ke CSV. Halaman informasi menampilkan penjelasan mengenai sistem dan parameter pemantauan.

### 4.1.8 Implementasi Notifikasi Telegram

Notifikasi Telegram digunakan untuk menyampaikan peringatan kepada pengelola ketika status sungai berada pada kondisi Siaga atau Awas. Pesan notifikasi memuat lokasi, waktu pengukuran, status sungai, kenaikan muka air, status kelayakan wisata, kondisi cuaca, dan rekomendasi tindakan.

Notifikasi tidak dikirimkan untuk status Normal dan Waspada. Pada kedua status tersebut, informasi tetap ditampilkan pada dashboard untuk keperluan pemantauan.

### 4.1.9 Implementasi Deployment Sistem

Sistem dijalankan menggunakan Docker Compose yang terdiri atas service InfluxDB, Mosquitto, backend FastAPI, dan frontend React yang dilayani oleh Nginx. InfluxDB digunakan untuk menyimpan data, Mosquitto digunakan sebagai MQTT Broker, backend digunakan untuk mengolah data, dan frontend digunakan untuk menampilkan dashboard.

Konfigurasi sistem disimpan melalui variabel lingkungan. Penggunaan variabel lingkungan bertujuan memisahkan konfigurasi seperti alamat layanan, bucket, token, dan status Telegram dari kode program.

## 4.2 Pengujian

Pengujian dilakukan untuk memastikan setiap bagian sistem dapat bekerja sesuai rancangan. Pengujian meliputi pembacaan sensor, koneksi komunikasi, pengiriman data, pengolahan dan klasifikasi, penyimpanan basis data, dashboard, notifikasi, serta pengujian sistem secara keseluruhan.

Karena hasil pengukuran lapangan belum tersedia di dalam project, kolom hasil yang membutuhkan nilai aktual disediakan untuk diisi berdasarkan pengujian langsung. Nilai akurasi, waktu pengiriman, dan persentase keberhasilan tidak ditentukan berdasarkan perkiraan.

### 4.2.1 Pengujian Pembacaan Sensor

Pengujian pembacaan sensor dilakukan untuk mengetahui apakah setiap sensor dapat menghasilkan data dan mengirimkan nilai dengan format yang sesuai. Pengujian dilakukan dengan menjalankan perangkat dan mengamati data pada Serial Monitor atau payload MQTT.

| No. | Sensor | Parameter yang diuji | Satuan | Hasil yang diharapkan | Hasil pengujian |
|---|---|---|---|---|---|
| 1 | JSN-SR04T | Jarak permukaan air | cm | Nilai jarak terbaca | Diisi berdasarkan pengujian |
| 2 | AHT10 | Suhu | °C | Nilai suhu terbaca | Diisi berdasarkan pengujian |
| 3 | AHT10 | Kelembapan | % | Nilai kelembapan terbaca | Diisi berdasarkan pengujian |
| 4 | Sensor hujan | Nilai analog | ADC | Nilai `rain_raw` terbaca | Diisi berdasarkan pengujian |
| 5 | Anemometer | Kecepatan angin | km/jam | Nilai kecepatan terbaca | Diisi berdasarkan pengujian |

Pengujian sensor dapat dilengkapi dengan alat pembanding. Nilai akurasi dapat dihitung menggunakan persamaan:

```text
Akurasi = (1 - |Nilai sensor - Nilai pembanding| / Nilai pembanding) × 100%
```

Apabila tidak tersedia alat pembanding, hasil pengujian ditulis berdasarkan keberhasilan sensor membaca data, kestabilan nilai, dan kesesuaian format payload.

### 4.2.2 Pengujian Koneksi WiFi dan MQTT

Pengujian koneksi dilakukan untuk memastikan ESP32 dapat terhubung ke jaringan WiFi dan MQTT Broker. Selain itu, pengujian dilakukan dengan memutuskan koneksi secara sementara untuk melihat kemampuan perangkat melakukan koneksi ulang.

| No. | Skenario | Hasil yang diharapkan | Hasil pengujian |
|---|---|---|---|
| 1 | ESP32 dinyalakan | ESP32 melakukan inisialisasi | Diisi berdasarkan pengujian |
| 2 | WiFi tersedia | ESP32 terhubung ke WiFi | Diisi berdasarkan pengujian |
| 3 | MQTT Broker tersedia | ESP32 terhubung ke MQTT Broker | Diisi berdasarkan pengujian |
| 4 | WiFi terputus | ESP32 mencoba koneksi ulang | Diisi berdasarkan pengujian |
| 5 | MQTT terputus | ESP32 mencoba koneksi ulang | Diisi berdasarkan pengujian |

### 4.2.3 Pengujian Pengiriman Data

Pengujian pengiriman data dilakukan untuk mengetahui keberhasilan pengiriman payload dari ESP32 menuju backend melalui MQTT. Data yang diamati meliputi waktu pengiriman, waktu penerimaan, jumlah data terkirim, jumlah data diterima, dan data yang gagal diterima.

Secara rancangan, proses pengukuran sensor dilakukan setiap lima detik dan pengiriman weather dilakukan sekitar setiap sepuluh detik. Heartbeat dikirimkan sekitar setiap enam puluh detik.

| Parameter | Nilai hasil pengujian |
|---|---:|
| Jumlah payload yang dikirim | Diisi |
| Jumlah payload yang diterima backend | Diisi |
| Jumlah payload gagal | Diisi |
| Persentase keberhasilan | Diisi |
| Rata-rata waktu pengiriman | Diisi |
| Waktu pengiriman tercepat | Diisi |
| Waktu pengiriman terlama | Diisi |

Persentase keberhasilan pengiriman dihitung dengan persamaan:

```text
Persentase keberhasilan = (Jumlah data diterima / Jumlah data dikirim) × 100%
```

Waktu pengiriman dapat dihitung dari selisih timestamp ketika payload dikirim oleh ESP32 dan ketika payload diterima oleh backend.

### 4.2.4 Pengujian Perhitungan Kenaikan Muka Air

Pengujian dilakukan untuk memastikan backend dapat menghitung kenaikan muka air berdasarkan jarak normal dan jarak saat ini. Persamaan yang digunakan adalah:

```text
water_level = normal_distance_cm - raw_distance
```

| No. | Jarak normal (cm) | Jarak saat ini (cm) | Hasil yang diharapkan |
|---|---:|---:|---:|
| 1 | 250 | 250 | 0 cm |
| 2 | 250 | 230 | 20 cm |
| 3 | 250 | 220 | 30 cm |
| 4 | 250 | 190 | 60 cm |
| 5 | 250 | 160 | 90 cm |
| 6 | 250 | 270 | 0 cm karena hasil negatif dibatasi menjadi nol |

### 4.2.5 Pengujian Klasifikasi Status Sungai

Pengujian klasifikasi dilakukan menggunakan nilai batas status sungai. Hasil pengujian dibandingkan dengan status yang seharusnya dihasilkan oleh backend.

| No. | Kenaikan muka air | Status yang diharapkan |
|---|---:|---|
| 1 | 0 cm sampai 29,9 cm | Normal |
| 2 | 30 cm sampai 59,9 cm | Waspada |
| 3 | 60 cm sampai 89,9 cm | Siaga |
| 4 | 90 cm atau lebih | Awas |

Status sungai hanya ditentukan berdasarkan kenaikan muka air. Parameter hujan, heat index, dan kecepatan angin tidak mengubah status sungai.

### 4.2.6 Pengujian Kelayakan Wisata

Pengujian kelayakan wisata dilakukan dengan memberikan kombinasi status sungai dan kondisi lingkungan. Sistem harus memberikan status wisata sesuai prioritas kondisi yang telah dirancang.

| Status sungai | Kondisi lingkungan | Status yang diharapkan |
|---|---|---|
| Normal | Tidak hujan, heat index <32,2°C, angin <45 km/jam | Suitable |
| Normal | Hujan | Caution |
| Normal | Heat index ≥32,2°C | Caution |
| Normal | Angin ≥45 km/jam | Caution |
| Waspada | Kondisi apa pun | Caution |
| Siaga | Kondisi apa pun | Not Recommended |
| Awas | Kondisi apa pun | Not Recommended |

Threshold konfigurasi heat index yang tersedia adalah 32,2°C untuk Warning, 39,4°C untuk Danger, dan 51,7°C untuk Critical. Pada implementasi kelayakan wisata, kondisi panas mulai memengaruhi rekomendasi ketika heat index melewati threshold warning. Kecepatan angin mulai memengaruhi rekomendasi ketika mencapai 45 km/jam.

### 4.2.7 Pengujian Penyimpanan Basis Data

Pengujian basis data dilakukan untuk memastikan data yang telah diproses dapat disimpan ke InfluxDB dengan measurement, tag, field, dan timestamp yang sesuai.

| Komponen | Hasil yang diharapkan | Hasil pengujian |
|---|---|---|
| Bucket | Data tersimpan pada `river_monitoring` | Diisi |
| Measurement | Data tersimpan pada `weather` | Diisi |
| Tags | Identitas dan status tersimpan sebagai tag | Diisi |
| Fields | Nilai sensor tersimpan sebagai field | Diisi |
| Timestamp | Data memiliki timestamp UTC | Diisi |
| Query latest | Data terbaru dapat diambil | Diisi |
| Query history | Data histori dapat diambil | Diisi |
| Query chart | Data grafik dapat diambil | Diisi |

### 4.2.8 Pengujian REST API dan WebSocket

Pengujian API dilakukan untuk memastikan endpoint backend dapat memberikan data sesuai kebutuhan dashboard. Pengujian WebSocket dilakukan untuk memastikan data baru dapat diteruskan secara real-time setelah backend menerima data dari ESP32.

| No. | Endpoint atau layanan | Pengujian | Hasil yang diharapkan |
|---|---|---|---|
| 1 | `/api/weather/latest` | Mengambil data terbaru | Data terbaru ditampilkan |
| 2 | `/api/weather/history` | Mengambil data histori | Data histori ditampilkan |
| 3 | `/api/weather/chart` | Mengambil data grafik | Data grafik tersedia |
| 4 | `/api/status` | Memeriksa status sistem | Status layanan ditampilkan |
| 5 | `/api/health` | Memeriksa kesehatan backend | Backend memberikan respons |
| 6 | `/ws/weather` | Menerima pembaruan data | Dashboard menerima data real-time |

### 4.2.9 Pengujian Dashboard

Pengujian dashboard dilakukan untuk memastikan informasi yang diterima dari backend ditampilkan dengan benar. Pengujian meliputi tampilan data terbaru, status sungai, kelayakan wisata, grafik, histori, status perangkat, dan ekspor CSV.

| No. | Fitur | Hasil yang diharapkan | Hasil pengujian |
|---|---|---|---|
| 1 | Status sungai | Status Normal, Waspada, Siaga, atau Awas tampil | Diisi |
| 2 | Kelayakan wisata | Suitable, Caution, atau Not Recommended tampil | Diisi |
| 3 | Data sensor | Nilai sensor tampil sesuai backend | Diisi |
| 4 | Grafik | Perubahan data berdasarkan waktu tampil | Diisi |
| 5 | Histori | Data sebelumnya dapat ditampilkan | Diisi |
| 6 | Filter histori | Data dapat difilter berdasarkan tanggal/status | Diisi |
| 7 | Pagination | Halaman data dapat berpindah | Diisi |
| 8 | Ekspor CSV | Data histori dapat diekspor | Diisi |
| 9 | Status offline | Status offline tampil saat perangkat tidak aktif | Diisi |

### 4.2.10 Pengujian Notifikasi Telegram

Pengujian notifikasi dilakukan untuk memastikan Telegram hanya mengirimkan pemberitahuan pada kondisi yang telah ditentukan. Pengujian dilakukan dengan memberikan data pada setiap status sungai.

| Status sungai | Hasil yang diharapkan |
|---|---|
| Normal | Tidak mengirim notifikasi bahaya |
| Waspada | Tidak mengirim notifikasi bahaya |
| Siaga | Mengirim notifikasi Telegram |
| Awas | Mengirim notifikasi Telegram |

Isi notifikasi diperiksa untuk memastikan informasi lokasi, waktu, status sungai, kenaikan muka air, kondisi lingkungan, dan tindakan yang disarankan tercantum dengan benar.

### 4.2.11 Pengujian Heartbeat dan Status Perangkat

Pengujian heartbeat dilakukan untuk memastikan backend dapat mengetahui aktivitas perangkat. Heartbeat dikirimkan sekitar setiap enam puluh detik. Status perangkat dinyatakan online apabila aktivitas weather atau heartbeat terakhir masih berada dalam batas waktu yang ditentukan sistem, yaitu maksimal sembilan puluh detik.

| Skenario | Hasil yang diharapkan | Hasil pengujian |
|---|---|---|
| Heartbeat diterima | Perangkat terdeteksi aktif | Diisi |
| Data weather diterima | Waktu aktivitas perangkat diperbarui | Diisi |
| Tidak ada data lebih dari batas waktu | Perangkat ditampilkan offline | Diisi |

### 4.2.12 Pengujian Keseluruhan Sistem

Pengujian keseluruhan dilakukan dengan menjalankan seluruh alur sistem mulai dari pembacaan sensor hingga informasi ditampilkan pada dashboard dan notifikasi dikirimkan. Pengujian ini bertujuan memastikan setiap komponen dapat bekerja secara terintegrasi.

| Tahap | Hasil yang diharapkan | Hasil pengujian |
|---|---|---|
| Sensor membaca data | Data sensor tersedia | Diisi |
| ESP32 mengirim data | Payload diterima MQTT Broker | Diisi |
| Backend menerima data | Data diproses | Diisi |
| Status sungai dihitung | Status sesuai nilai kenaikan air | Diisi |
| Kelayakan wisata dihitung | Rekomendasi sesuai kondisi | Diisi |
| Data disimpan | Data tersedia di InfluxDB | Diisi |
| Dashboard diperbarui | Informasi tampil | Diisi |
| Telegram dikirim | Notifikasi diterima untuk Siaga/Awas | Diisi |

Berdasarkan pengujian keseluruhan, sistem dapat dinyatakan berhasil apabila seluruh tahapan dapat dijalankan sesuai hasil yang diharapkan dan tidak terdapat kegagalan pada proses utama.

## 4.3 Analisis Hasil Pengujian

Analisis hasil pengujian dilakukan berdasarkan data aktual yang diperoleh dari pengujian sensor, komunikasi, pengolahan, penyimpanan, dashboard, dan notifikasi. Analisis harus memuat perbandingan antara hasil yang diharapkan dan hasil yang diperoleh.

Aspek yang dianalisis meliputi kemampuan sensor membaca data, kestabilan koneksi WiFi dan MQTT, keberhasilan pengiriman payload, ketepatan perhitungan kenaikan muka air, kesesuaian klasifikasi status sungai, kesesuaian kelayakan wisata, keberhasilan penyimpanan data, kecepatan pembaruan dashboard, serta keberhasilan pengiriman Telegram.

Nilai akurasi sensor, rata-rata waktu pengiriman, persentase keberhasilan, dan jumlah data yang berhasil diproses harus diisi berdasarkan hasil pengukuran langsung. Penggunaan nilai hasil pengujian yang tidak berasal dari pengukuran aktual tidak dianjurkan karena dapat menyebabkan kesimpulan penelitian tidak sesuai dengan kondisi sistem.

## 4.4 Kesimpulan Pengujian

Kesimpulan pengujian disusun setelah seluruh tabel hasil pengujian diisi. Kesimpulan memuat apakah perangkat keras dapat membaca data, apakah komunikasi MQTT berjalan, apakah backend dapat mengolah data, apakah basis data dapat menyimpan data, apakah dashboard dapat menampilkan informasi, dan apakah notifikasi Telegram dapat dikirimkan sesuai status sungai.

Secara umum, sistem diharapkan dapat menjalankan proses monitoring secara terintegrasi mulai dari pembacaan sensor pada ESP32, pengiriman data melalui MQTT, pengolahan pada backend, penyimpanan pada InfluxDB, penampilan pada dashboard, hingga pengiriman notifikasi kepada pengelola.
