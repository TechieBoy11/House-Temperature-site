# master_room radio node

Regular Arduino UNO node using the thermistor and RFM69HCW.

Radio pin map:

```text
RFM69 VCC  -> regulated 3.3V
RFM69 GND  -> UNO GND
RFM69 MOSI -> UNO ICSP MOSI
RFM69 MISO -> UNO ICSP MISO
RFM69 SCK  -> UNO ICSP SCK
RFM69 NSS  -> D4
RFM69 DIO0 -> D3
RFM69 RESET -> D2
```

Thermistor divider remains on A0/A1. The node sends `sensor_id|temperature_c` to the Logan gateway every 60 seconds. Install the LowPowerLab RFM69 library and use the 915 MHz module/frequency allowed in your region.
