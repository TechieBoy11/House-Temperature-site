#include <RFM69.h>
#include <SPI.h>
#include <math.h>

#define RADIO_NETWORK_ID 100
#define RADIO_NODE_ID 2
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
const char SENSOR_ID[] = "fac96f01-5ae9-4c81-b867-193ca4c6372d";

RFM69 radio(RADIO_CS_PIN, RADIO_IRQ_PIN, RADIO_HIGH_POWER);

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
  Serial.println("master_room RFM69 thermistor node starting");
  pinMode(RADIO_RESET_PIN, OUTPUT);
  digitalWrite(RADIO_RESET_PIN, HIGH);
  delay(100);
  digitalWrite(RADIO_RESET_PIN, LOW);
  delay(100);
  radio.initialize(RADIO_FREQUENCY, RADIO_NODE_ID, RADIO_NETWORK_ID);
  radio.setHighPower();
  radio.setPowerLevel(20);
  radio.setFrequency(915000000);
}

void loop() {
  const float temperature = readThermistorCelsius();
  if (isnan(temperature)) {
    Serial.println("Thermistor read failed: check A0/A1 divider wiring");
    delay(3000);
    return;
  }

  char packet[62];
  snprintf(packet, sizeof(packet), "%s|%.2f", SENSOR_ID, temperature);
  Serial.print("Sending: ");
  Serial.println(packet);
  radio.send(RADIO_GATEWAY_ID, packet, strlen(packet));
  radio.receiveDone();
  delay(60000);
}
