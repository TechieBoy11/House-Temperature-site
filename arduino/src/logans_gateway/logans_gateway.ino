#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include <RFM69.h>
#include <SPI.h>
#include <math.h>
#include "secrets.h"

#define RADIO_NETWORK_ID 100
#define RADIO_GATEWAY_ID 3
#define RADIO_FREQUENCY RF69_915MHZ
#define RADIO_CS_PIN 4
#define RADIO_IRQ_PIN 3
#define RADIO_RESET_PIN 2
#define RADIO_HIGH_POWER true

const int THERMISTOR_PIN = A0;
const int SUPPLY_PIN = A1;
const float ADC_MAX = 1023.0;
const float SERIES_RESISTOR_OHMS = 9950.0;
const float THERMISTOR_NOMINAL_OHMS = 10000.0;
const float NOMINAL_TEMPERATURE_K = 298.15;
const float BETA_COEFFICIENT = 3950.0;

#if API_USE_TLS
WiFiSSLClient wifi;
#else
WiFiClient wifi;
#endif

RFM69 radio(RADIO_CS_PIN, RADIO_IRQ_PIN, RADIO_HIGH_POWER);
HttpClient client = HttpClient(wifi, API_HOST, API_PORT);
unsigned long lastLocalReading = 0;

float readThermistorCelsius() {
  const float supplyVoltage = analogRead(SUPPLY_PIN) * 5.0 / ADC_MAX;
  const float dividerVoltage = analogRead(THERMISTOR_PIN) * supplyVoltage / ADC_MAX;
  if (supplyVoltage <= 0.1 || dividerVoltage <= 0.0 || dividerVoltage >= supplyVoltage) return NAN;
  const float resistance = (dividerVoltage * SERIES_RESISTOR_OHMS) / (supplyVoltage - dividerVoltage);
  const float temperatureKelvin = 1.0 / (1.0 / NOMINAL_TEMPERATURE_K + log(resistance / THERMISTOR_NOMINAL_OHMS) / BETA_COEFFICIENT);
  return temperatureKelvin - 273.15;
}

void connectWifi() {
  while (true) {
    Serial.println("WiFi: connecting");
#if USE_STATIC_IP
    WiFi.config(LOCAL_IP, DNS_IP, GATEWAY_IP, SUBNET_MASK);
#endif
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long started = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - started < 15000) delay(500);
    IPAddress address = WiFi.localIP();
    Serial.print("WiFi status: ");
    Serial.println(WiFi.status());
    Serial.print("WiFi IP: ");
    Serial.println(address);
    if (WiFi.status() == WL_CONNECTED && address[0] != 0) return;
    WiFi.disconnect();
    delay(5000);
  }
}

void postTemperature(const char* sensorId, float temperature) {
  StaticJsonDocument<192> payload;
  payload["sensor_id"] = sensorId;
  payload["temperature_c"] = temperature;
  String body;
  serializeJson(payload, body);

  client.beginRequest();
  client.post("/readings");
  client.sendHeader("Content-Type", "application/json");
  client.sendHeader("x-sensor-token", SENSOR_TOKEN);
  client.sendHeader("Content-Length", body.length());
  client.beginBody();
  client.print(body);
  client.endRequest();
  const int status = client.responseStatusCode();
  Serial.print("API response for ");
  Serial.print(sensorId);
  Serial.print(": ");
  Serial.println(status);
  client.stop();
}

void setup() {
  Serial.begin(115200);
  unsigned long serialStart = millis();
  while (!Serial && millis() - serialStart < 5000) delay(10);
  delay(500);
  Serial.println("Logan gateway: thermistor + RFM69 starting");
  Serial.println("Radio: configuring reset pin");
  pinMode(RADIO_RESET_PIN, OUTPUT);
  digitalWrite(RADIO_RESET_PIN, HIGH);
  delay(100);
  digitalWrite(RADIO_RESET_PIN, LOW);
  delay(100);
  Serial.println("Radio: calling initialize");
  radio.initialize(RADIO_FREQUENCY, RADIO_GATEWAY_ID, RADIO_NETWORK_ID);
  Serial.println("Radio: initialize complete");
  Serial.println("Radio: using UNO R4 initialize defaults");
  Serial.println("Radio: ready");
  connectWifi();
}

void loop() {
  Serial.println("Loop: checking radio");
  if (radio.receiveDone()) {
    Serial.println("Loop: radio packet received");
    String packet = String((char*)radio.DATA);
    const int separator = packet.indexOf('|');
    if (separator > 0) {
      const String sensorId = packet.substring(0, separator);
      const float temperature = packet.substring(separator + 1).toFloat();
      Serial.print("Radio reading from ");
      Serial.print(sensorId);
      Serial.print(": ");
      Serial.println(temperature, 2);
      postTemperature(sensorId.c_str(), temperature);
    }
    radio.readAllRegs();
  }

  Serial.println("Loop: reading local thermistor");
  if (millis() - lastLocalReading >= 60000 || lastLocalReading == 0) {
    lastLocalReading = millis();
    const float localTemperature = readThermistorCelsius();
    if (!isnan(localTemperature)) postTemperature(SENSOR_ID, localTemperature);
    else Serial.println("Local thermistor read failed");
  }
  Serial.println("Loop: complete");
  delay(1000);
}
