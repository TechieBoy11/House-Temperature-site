#include <WiFiNINA.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#define DHT_PIN 2
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

const char WIFI_SSID[] = "YOUR_WIFI_NAME";
const char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";
const char API_HOST[] = "room-temperature-api.example.workers.dev";
const char SENSOR_TOKEN[] = "SET_IN_LOCAL_DEVICE_CONFIG";
const char SENSOR_ID[] = "SET_SENSOR_UUID";

WiFiSSLClient wifi;
HttpClient client = HttpClient(wifi, API_HOST, 443);

void setup() {
  Serial.begin(115200);
  dht.begin();
  while (WiFi.begin(WIFI_SSID, WIFI_PASSWORD) != WL_CONNECTED) delay(5000);
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
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
    client.responseStatusCode();
    client.stop();
  }
  delay(300000);
}
