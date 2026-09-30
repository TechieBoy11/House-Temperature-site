#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include <math.h>
#include "secrets.h"

const int THERMISTOR_PIN = A0;
const int SUPPLY_PIN = A1;
const float ADC_MAX = 1023.0;
const float SERIES_RESISTOR_OHMS = 9950.0;
const float THERMISTOR_NOMINAL_OHMS = 10000.0;
const float NOMINAL_TEMPERATURE_K = 298.15;
const float BETA_COEFFICIENT = 3950.0;

#ifndef API_USE_TLS
#define API_USE_TLS 1
#endif

#ifndef USE_STATIC_IP
#define USE_STATIC_IP 1
#endif

#if API_USE_TLS
WiFiSSLClient wifi;
#else
WiFiClient wifi;
#endif

HttpClient client = HttpClient(wifi, API_HOST, API_PORT);

void connectWifi() {
  while (true) {
    Serial.println("WiFi: connecting");
#if USE_STATIC_IP
    WiFi.config(LOCAL_IP, DNS_IP, GATEWAY_IP, SUBNET_MASK);
#endif
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long connectionStart = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - connectionStart < 15000) {
      delay(500);
      Serial.print(".");
    }
    Serial.println();
    IPAddress address = WiFi.localIP();
    Serial.print("WiFi status: ");
    Serial.println(WiFi.status());
    Serial.print("WiFi IP: ");
    Serial.println(address);
    if (WiFi.status() == WL_CONNECTED && address[0] != 0) break;
    Serial.println("WiFi: no usable IP address");
    WiFi.disconnect();
    delay(5000);
  }
}

float readThermistorCelsius() {
  const float supplyVoltage = analogRead(SUPPLY_PIN) * 5.0 / ADC_MAX;
  const float dividerVoltage = analogRead(THERMISTOR_PIN) * supplyVoltage / ADC_MAX;
  if (supplyVoltage <= 0.1 || dividerVoltage <= 0.0 || dividerVoltage >= supplyVoltage) return NAN;

  const float resistance = (dividerVoltage * SERIES_RESISTOR_OHMS) / (supplyVoltage - dividerVoltage);
  const float temperatureKelvin = 1.0 / (1.0 / NOMINAL_TEMPERATURE_K + log(resistance / THERMISTOR_NOMINAL_OHMS) / BETA_COEFFICIENT);
  return temperatureKelvin - 273.15;
}

void setup() {
  Serial.begin(115200);
  Serial.println("Thermistor sensor2 starting");
  Serial.println("Thermistor node: A0; supply reference: A1");
  Serial.print("API host: ");
  Serial.print(API_HOST);
  Serial.print(":");
  Serial.println(API_PORT);
  connectWifi();
}

void loop() {
  const float temperature = readThermistorCelsius();
  if (isnan(temperature)) {
    Serial.println("Thermistor read failed: check divider wiring and A0/A1");
    delay(3000);
    return;
  }

  Serial.print("Temperature C: ");
  Serial.println(temperature, 2);

  StaticJsonDocument<192> payload;
  payload["sensor_id"] = SENSOR_ID;
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
  const int responseStatus = client.responseStatusCode();
  Serial.print("API response: ");
  Serial.println(responseStatus);
  client.stop();
  delay(60000);
}
