# Arduino UNO R4 WiFi sensor

The firmware targets an Arduino UNO R4 WiFi and a DHT11 temperature/humidity sensor.

## Wiring

- DHT11 `VCC` -> UNO R4 WiFi `5V`
- DHT11 `GND` -> UNO R4 WiFi `GND`
- DHT11 `DATA` -> UNO R4 WiFi digital pin `D2`
- Add a 10k ohm pull-up resistor between `DATA` and `5V` if the sensor module does not include one.

## Arduino IDE libraries

Install these libraries through the Arduino IDE Library Manager:

- DHT sensor library by Adafruit
- Adafruit Unified Sensor
- ArduinoHttpClient
- ArduinoJson

The UNO R4 WiFi board package provides `WiFiS3`.

## Device configuration

Copy `src/secrets.h.example` to `src/secrets.h`, then set the Wi-Fi credentials, API hostname, sensor token, sensor UUID, and a reserved local IP in `secrets.h`. That file is ignored by Git and must never be committed. The firmware sends one reading every minute with both `temperature_c` and `humidity_percent`.

For local testing, the example uses plain HTTP to `http://192.168.1.148:8787` and `API_USE_TLS 0`; replace the IP address with the computer running the API. For deployment, set `API_USE_TLS 1`, use port `443`, and set `API_HOST` to the HTTPS Worker hostname.
