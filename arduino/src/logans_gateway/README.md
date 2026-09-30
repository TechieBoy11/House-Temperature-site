# Logan gateway

Arduino UNO R4 WiFi gateway for phase 2. It reads Logan's local thermistor, receives `master_room` readings over RFM69HCW, and posts both temperatures to the HTTPS API.

The gateway uses the shared `../sensor/secrets.h` file. The radio pin map is NSS D4, DIO0 D3, RESET D2, and SPI on the ICSP header. Because D2 is reserved for radio reset, the gateway uses the thermistor divider on A0/A1.

Upload this sketch to the UNO R4 WiFi after the `master_room_radio` node is transmitting. The master sensor UUID is `fac96f01-5ae9-4c81-b867-193ca4c6372d` and Logan's sensor UUID remains the value in the shared secrets file.
