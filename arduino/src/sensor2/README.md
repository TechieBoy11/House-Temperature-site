# Thermistor sensor2

This sketch uses the 9.95 kOhm thermistor with the voltage-divider method from the reference transmitter sketch.

## Divider wiring

```text
5V ---- 10 kOhm fixed resistor ---- A0 ---- thermistor ---- GND
5V --------------------------------------- A1
GND -------------------------------------- GND
```

`A0` measures the divider node. `A1` measures the 5V supply used by the calculation. The sketch uses the 9,950 ohm fixed series resistor, the `103` thermistor's 10,000 ohm nominal resistance at 25 C, and a starting Beta value of 3950. The `103` marking identifies the nominal resistance, not the Beta value, so calibrate Beta against a trusted thermometer if needed.

Copy the folder's `secrets.h` values from the working sensor configuration as needed. It is ignored by Git. The sketch uses the same Wi-Fi, static IP, API host, port, token, and sensor ID as the DHT11 sketch, and posts temperature-only readings every 60 seconds.
