#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include "secrets.h"

//#include <wire.h>
#include "Adafruit_SHT31.h"

Adafruit_SHT31 sht31 = Adafruit_SHT31();

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

void setup() {
  Serial.begin(115200);
  Serial.println("sht13 sensor starting");
  if (! sht31.begin(0x44)) {   // Set to 0x45 if your ADDR pin is pulled high
    Serial.println("Couldn't find SHT31 sensor!");
    while (1) delay(1);
  }
  delay(2000);
  Serial.print("API host: ");
  Serial.print(API_HOST);
  Serial.print(":");
  Serial.println(API_PORT);
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
    Serial.println("WiFi: connected without an IP address; check DHCP/router");
    WiFi.disconnect();
    delay(5000);
  }
  Serial.print("WiFi ready, IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  Serial.println("Reading SHT31...");
  float temperature = sht31.readTemperature();
  float humidity = sht31.readHumidity();
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("SHT31 read failed: NaN");
    Serial.println("Check VCC, GND, DATA pin D2, pull-up resistor, and DHT type");
    delay(3000);
    return;
  }
  Serial.print("Temperature C: ");
  Serial.println(temperature, 1);
  Serial.print("Humidity %: ");
  Serial.println(humidity, 1);
  if (!isnan(temperature) && !isnan(humidity)) {
    StaticJsonDocument<192> payload;
    payload["sensor_id"] = SENSOR_ID;
    payload["temperature_c"] = temperature;
    payload["humidity_percent"] = humidity;
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
    int responseStatus = client.responseStatusCode();
    Serial.print("API response: ");
    Serial.println(responseStatus);
    client.stop();
  }
  delay(60000);
}
