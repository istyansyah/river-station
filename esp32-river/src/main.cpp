#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>

#define MQTT_MAX_PACKET_SIZE 512

#include <AHT10.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
#include <time.h>

#define BOOT_BUTTON_PIN 0
#define ANEMOMETER_PIN 34
#define RAIN_ANALOG_PIN 35
#define ULTRASONIC_TRIG 5
#define ULTRASONIC_ECHO 18
#define I2C_SDA 21
#define I2C_SCL 22
#define STATUS_LED_PIN 2

// ============ KONFIGURASI ============
const char *mqtt_server = "10.135.230.175";
const int mqtt_port = 1883;
const char *weather_topic = "river/weather";
const char *heartbeat_topic = "river/heartbeat";
const char *command_topic = "riverstation/device/cmd";

const float timemeasure = 5.0;
const int publishInterval = 1;

const char *deviceLocation = "Sungai Batang Air Dingin, Kota Padang";

#define WDT_TIMEOUT_S 15
#define JSN_MEDIAN_SAMPLES 3

// ============ VARIABEL GLOBAL ============
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
AHT10 aht10(AHT10_ADDRESS_0X38);

volatile unsigned long pulseCount = 0;
volatile unsigned long lastPulseMicros = 0;
unsigned long lastMeasureMs = 0;
unsigned long lastHeartbeatMs = 0;
int countThing = 0;
float lastWindSpeed = 0;
float lastWaterLevel = 0;
String deviceId = "esp32-riverstation-01";
unsigned long publishIntervalDynamic = 2;
bool ntpSynced = false;

// WiFiManager state
bool wifiResetPending = false;
unsigned long wifiResetButtonStart = 0;
bool wifiReconnectNeeded = false;
unsigned long lastWifiReconnectMs = 0;

// MQTT non-blocking state
unsigned long lastMqttReconnectMs = 0;
int mqttRetryCount = 0;
bool mqttReconnectActive = false;

// LED state
unsigned long lastLedToggleMs = 0;
bool ledState = false;

// ============ FUNGSI HELPER ============
String formatFloat(float value, int precision = 2) {
  char buffer[16];
  dtostrf(value, 1, precision, buffer);
  return String(buffer);
}

// ============ HEAT INDEX (RUMUS TETAP 100%) ============
float calculateHeatIndex(float temp, float humidity) {
  float T = (temp * 9.0 / 5.0) + 32.0;
  float R = humidity;

  float HI = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R -
             0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R +
             0.00085282 * T * R * R - 0.00000199 * T * T * R * R;

  if (R < 13.0 && T >= 80.0 && T <= 112.0) {
    HI = HI - ((13.0 - R) * 0.25);
  }
  if (R > 85.0 && T >= 80.0 && T <= 112.0) {
    HI = HI + ((R - 85.0) * 0.1);
  }

  return (HI - 32.0) * 5.0 / 9.0;
}

// ============ FUNGSI INTERRUPT (RUMUS TETAP 100%) ============
void IRAM_ATTR countPulse() {
  unsigned long now = micros();
  if (now - lastPulseMicros > 5000) {
    pulseCount++;
    lastPulseMicros = now;
  }
}

float calculateWindSpeed(unsigned long pulses) {
  float rotationPerSecond = pulses / timemeasure;
  float speed = -0.0181 * rotationPerSecond * rotationPerSecond +
                1.3859 * rotationPerSecond + 1.4055;
  return speed < 1.5 ? 0 : speed;
}

// ============ ULTRASONIC (RUMUS TETAP 100%, + MEDIAN FILTER) ============
float measureWaterLevelSingle() {
  digitalWrite(ULTRASONIC_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG, LOW);
  long duration = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);
  if (duration == 0)
    return -1;
  return duration / 58.0;
}

float measureWaterLevel() {
  float samples[JSN_MEDIAN_SAMPLES];
  for (int i = 0; i < JSN_MEDIAN_SAMPLES; i++) {
    samples[i] = measureWaterLevelSingle();
    delay(20);
  }
  for (int i = 0; i < JSN_MEDIAN_SAMPLES - 1; i++) {
    for (int j = i + 1; j < JSN_MEDIAN_SAMPLES; j++) {
      if (samples[i] > samples[j]) {
        float tmp = samples[i];
        samples[i] = samples[j];
        samples[j] = tmp;
      }
    }
  }
  return samples[JSN_MEDIAN_SAMPLES / 2];
}

// ============ WIFI (WiFiManager TETAP, + NON-BLOCKING RESET + AUTO-RECONNECT)
// ============
void resetWifiIfRequested() {
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  if (digitalRead(BOOT_BUTTON_PIN) == LOW) {
    if (wifiResetButtonStart == 0) {
      wifiResetButtonStart = millis();
      Serial.println("Button pressed... hold 5 seconds to reset WiFi");
    }
    if (millis() - wifiResetButtonStart >= 5000) {
      Serial.println("Resetting WiFi settings...");
      WiFiManager wm;
      wm.resetSettings();
      Serial.println("WiFi reset, restarting ESP...");
      delay(100);
      ESP.restart();
    }
  } else {
    wifiResetButtonStart = 0;
  }
}

void connectWifi() {
  Serial.println("Connecting to WiFi...");
  WiFiManager wm;
  wm.autoConnect("ESP32_River_AP");
  Serial.print("WiFi connected! IP address: ");
  Serial.println(WiFi.localIP());

  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov", "time.google.com");
  Serial.println("NTP sync requested (UTC+7 / WIB)");
}

void checkNtpSync() {
  if (ntpSynced)
    return;
  time_t now = time(nullptr);
  if (now > 1700000000) {
    ntpSynced = true;
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);
    char buf[32];
    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);
    Serial.print("NTP synced: ");
    Serial.println(buf);
  }
}

time_t getEpoch() {
  time_t now = time(nullptr);
  if (now > 1700000000)
    return now;
  return 0;
}

// ============ MQTT (RECONNECT NON-BLOCKING, + COMMAND SUBSCRIBE) ============
void handleCommand(char *topic, byte *payload, unsigned int length) {
  char buf[256];
  unsigned int len = length < sizeof(buf) - 1 ? length : sizeof(buf) - 1;
  memcpy(buf, payload, len);
  buf[len] = '\0';

  Serial.print("CMD received: ");
  Serial.println(buf);

  if (strstr(buf, "\"reboot\"") != nullptr) {
    Serial.println("Rebooting...");
    delay(100);
    ESP.restart();
  }

  if (strstr(buf, "\"set_interval\"") != nullptr) {
    char *val = strstr(buf, "\"value\"");
    if (val) {
      val = strchr(val, ':');
      if (val) {
        unsigned long ms = strtoul(val + 1, nullptr, 10);
        if (ms >= 1 && ms <= 60) {
          publishIntervalDynamic = ms;
          Serial.print("Publish interval set to ");
          Serial.print(publishIntervalDynamic);
          Serial.println(" measurements");
        }
      }
    }
  }
}

void connectMqttStart() {
  if (mqtt.connected())
    return;
  if (WiFi.status() != WL_CONNECTED)
    return;

  const unsigned long now = millis();
  if (now - lastMqttReconnectMs < 5000)
    return;
  lastMqttReconnectMs = now;

  String clientId = deviceId + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  Serial.print("MQTT connecting... ");

  if (mqtt.connect(clientId.c_str())) {
    Serial.println("connected!");
    mqttRetryCount = 0;
    mqtt.subscribe(command_topic);
    Serial.print("Subscribed to ");
    Serial.println(command_topic);
  } else {
    mqttRetryCount++;
    Serial.print("failed, rc=");
    Serial.println(mqtt.state());
    if (mqttRetryCount >= 10) {
      Serial.println("MQTT max retries, restarting...");
      delay(100);
      ESP.restart();
    }
  }
}

// ============ HEARTBEAT ============
void sendHeartbeat() {
  StaticJsonDocument<192> doc;
  doc["device_id"] = deviceId;
  doc["type"] = "heartbeat";
  doc["rssi"] = WiFi.RSSI();
  doc["uptime"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();

  time_t epoch = getEpoch();
  if (epoch > 0)
    doc["timestamp"] = (long long)epoch;

  char payload[192];
  serializeJson(doc, payload);

  if (mqtt.publish(heartbeat_topic, payload)) {
    Serial.println("Heartbeat sent");
  }
}

// ============ PUBLISH DATA (JSON KEYS ENGLISH) ============
void publishWeather() {
  Serial.println("\n=== Publishing Weather Data ===");

  float temperature = aht10.readTemperature();
  float humidity = aht10.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Sensor error! Skipping publish...");
    return;
  }

  float heatIndex = calculateHeatIndex(temperature, humidity);

  float tempRounded = round(temperature * 100) / 100.0;
  float humRounded = round(humidity * 100) / 100.0;
  float windRounded = round(lastWindSpeed * 100) / 100.0;
  float hiRounded = round(heatIndex * 100) / 100.0;

  int rainAnalog = analogRead(RAIN_ANALOG_PIN);

  float rawDistance = measureWaterLevel();
  if (rawDistance < 0) {
    Serial.println("Ultrasonic sensor error! Using last known value...");
    rawDistance = lastWaterLevel;
  } else {
    lastWaterLevel = rawDistance;
  }
  Serial.print("Water level: ");
  Serial.print(rawDistance, 1);
  Serial.println(" cm");

  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceId;
  doc["temperature"] = tempRounded;
  doc["humidity"] = humRounded;
  doc["heat_index"] = hiRounded;
  doc["wind_speed"] = round(windRounded * 3.6 * 100) / 100.0;
  doc["raw_distance"] = round(rawDistance * 100) / 100.0;
  doc["rain_analog"] = rainAnalog;
  doc["rssi"] = WiFi.RSSI();
  doc["location"] = deviceLocation;
  doc["rain_raw"] = rainAnalog;
  doc["measurement_method"] = "raw";

  time_t epoch = getEpoch();
  if (epoch > 0)
    doc["timestamp"] = (long long)epoch;

  char payload[512];
  int len = serializeJson(doc, payload);

  Serial.print("Payload (");
  Serial.print(len);
  Serial.print(" bytes): ");
  Serial.println(payload);

  if (!mqtt.connected()) {
    Serial.println("MQTT DISCONNECTED during publish!");
    return;
  }

  if (mqtt.publish(weather_topic, payload)) {
    Serial.println("Weather published!");
  } else {
    Serial.println("Failed to publish!");
  }

  Serial.println("=== Publishing Complete ===\n");
}

// ============ LED STATUS ============
void updateStatusLED() {
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastLedToggleMs >= 200) {
      lastLedToggleMs = millis();
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
    }
  } else if (!mqtt.connected()) {
    if (millis() - lastLedToggleMs >= 500) {
      lastLedToggleMs = millis();
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
    }
  }
}

// ============ SETUP ============
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== ESP32 River Monitoring Station Starting ===");
  Serial.println("Firmware version: 1.0 (JSN-SR04T)");
  Serial.println("-----------------------------------");

  // NTP timezone di-set ulang di connectWifi() setelah WiFi connect
  setenv("TZ", "WIB-7", 1);
  tzset();

  esp_task_wdt_init(WDT_TIMEOUT_S, true);
  esp_task_wdt_add(nullptr);

  resetWifiIfRequested();

  Serial.println("Initializing I2C...");
  Wire.begin(I2C_SDA, I2C_SCL);
  Serial.println("I2C initialized at SDA=21, SCL=22");

  Serial.println("Initializing AHT10 sensor...");
  if (aht10.begin()) {
    Serial.println("AHT10 sensor found!");
  } else {
    Serial.println("AHT10 sensor not found!");
  }

  Serial.println("Setting up pins...");
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
  pinMode(RAIN_ANALOG_PIN, INPUT);
  pinMode(ANEMOMETER_PIN, INPUT);
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);
  Serial.println("Ultrasonic sensor configured (TRIG=5, ECHO=18)");

  Serial.println("Setting up anemometer interrupt...");
  attachInterrupt(digitalPinToInterrupt(ANEMOMETER_PIN), countPulse, RISING);
  Serial.println("Interrupt configured");

  connectWifi();

  Serial.println("Setting up MQTT...");
  mqtt.setServer(mqtt_server, mqtt_port);
  mqtt.setBufferSize(512);
  mqtt.setCallback(handleCommand);

  lastMeasureMs = millis();
  lastHeartbeatMs = millis();

  Serial.println("Setup complete!");
  Serial.print("Measurement interval: ");
  Serial.print(timemeasure);
  Serial.println(" seconds");
  Serial.print("Publishing interval: ");
  Serial.print(timemeasure * publishIntervalDynamic);
  Serial.println(" seconds");
  Serial.println("===================================\n");
}

// ============ LOOP (NON-BLOCKING) ============
void loop() {
  esp_task_wdt_reset();

  mqtt.loop();

  // Auto-reconnect WiFi
  if (WiFi.status() != WL_CONNECTED) {
    wifiReconnectNeeded = true;
    ntpSynced = false;
  }

  if (wifiReconnectNeeded) {
    unsigned long now = millis();
    if (now - lastWifiReconnectMs >= 10000) {
      lastWifiReconnectMs = now;
      Serial.println("WiFi disconnected, reconnecting...");
      connectWifi();
      if (WiFi.status() == WL_CONNECTED) {
        wifiReconnectNeeded = false;
      }
    }
  }

  // Non-blocking WiFi reset check
  resetWifiIfRequested();

  // NTP sync check
  if (WiFi.status() == WL_CONNECTED && !ntpSynced) {
    checkNtpSync();
  }

  // Non-blocking MQTT reconnect
  if (!mqtt.connected()) {
    connectMqttStart();
  }

  // LED status
  updateStatusLED();

  // Measurement & publish (only if WiFi AND MQTT connected)
  if (WiFi.status() == WL_CONNECTED && mqtt.connected()) {
    if (millis() - lastMeasureMs >= timemeasure * 1000) {
      Serial.println("\n--- Measurement Interval ---");

      noInterrupts();
      unsigned long pulses = pulseCount;
      pulseCount = 0;
      interrupts();

      Serial.print("Pulses: ");
      Serial.println(pulses);

      lastWindSpeed = calculateWindSpeed(pulses);
      Serial.print("Wind speed: ");
      Serial.print(lastWindSpeed, 2);
      Serial.println(" m/s (" + String(lastWindSpeed * 3.6, 2) + " km/jam)");

      lastMeasureMs = millis();
      countThing++;

      Serial.print("Measurement count: ");
      Serial.println(countThing);

      if (countThing >= (int)publishIntervalDynamic) {
        Serial.println("Publishing data...");
        publishWeather();
        countThing = 0;
      }
      Serial.println("--- End Measurement ---\n");
    }

    // Heartbeat
    if (millis() - lastHeartbeatMs >= 60000) {
      sendHeartbeat();
      lastHeartbeatMs = millis();
    }
  }

  delay(10);
}
