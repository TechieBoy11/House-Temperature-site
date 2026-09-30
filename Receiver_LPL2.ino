#include <RFM69.h>
#include <SPI.h>
#include <RFM69registers.h>

#define NETWORKID 100 // The same on all nodes that talk to each other
#define NODEID 3 // The unique identifier of this node
#define RECEIVER 2 // The recipient of packets
#define FREQUENCY RF69_915MHZ
#define IS_RFM69HCW true // set to 'true' if you are using an RFM69HCW module
#define SERIAL_BAUD 115200
#define RFM69_CS 4 //chip select
#define RFM69_IRQ 3 //interrupt pin
#define RFM69_IRQN 1 // Pin 3 is IRQ 1!
#define RFM69_RST 2 //reser pin
RFM69 radio = RFM69(RFM69_CS, RFM69_IRQ, IS_RFM69HCW);

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels

// Declaration for an SSD1306 display connected to I2C (SDA, SCL pins)
// The pins for I2C are defined by the Wire-library. 
// On an arduino UNO:       A4(SDA), A5(SCL)
// On an arduino MEGA 2560: 20(SDA), 21(SCL)
// On an arduino LEONARDO:   2(SDA),  3(SCL), ...
#define OLED_RESET     4 // Reset pin # (or -1 if sharing Arduino reset pin)
#define SCREEN_ADDRESS 0x3C ///< See datasheet for Address; 0x3D for 128x64, 0x3C for 128x32
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define NUMFLAKES     10 // Number of snowflakes in the animation example

#define LOGO_HEIGHT   16
#define LOGO_WIDTH    16
static const unsigned char PROGMEM logo_bmp[] =
{ 0b00000000, 0b11000000,
  0b00000001, 0b11000000,
  0b00000001, 0b11000000,
  0b00000011, 0b11100000,
  0b11110011, 0b11100000,
  0b11111110, 0b11111000,
  0b01111110, 0b11111111,
  0b00110011, 0b10011111,
  0b00011111, 0b11111100,
  0b00001101, 0b01110000,
  0b00011011, 0b10100000,
  0b00111111, 0b11100000,
  0b00111111, 0b11110000,
  0b01111100, 0b11110000,
  0b01110000, 0b01110000,
  0b00000000, 0b00110000 };

void setup() {
Serial.begin(SERIAL_BAUD);
Serial.println("Arduino RFM69HCW Receiver");
// Hard Reset the RFM module
pinMode(RFM69_RST, OUTPUT);
digitalWrite(RFM69_RST, HIGH);
delay(100);
digitalWrite(RFM69_RST, LOW);
delay(100);
// Initialize radio
radio.initialize(FREQUENCY,NODEID,NETWORKID);
if (IS_RFM69HCW) {
radio.setHighPower(); // Only for RFM69HCW & HW!
}
radio.setPowerLevel(20); // power output ranges from 0 (5dBm) to 31 (20dBm)
//radio.setLNA(110);
radio.setFrequency(915000000);
Serial.print("\nListening at ");
Serial.print(FREQUENCY==RF69_433MHZ ? 433 : FREQUENCY==RF69_915MHZ ? 915 : 868);
Serial.println(" MHz");
Serial.println("before");
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;); // Don't proceed, loop forever
  }
Serial.println("after");
  // Show initial display buffer contents on the screen --
  // the library initializes this with an Adafruit splash screen.
  display.display();
  delay(1000); // Pause for 2 seconds

  // Clear the buffer
  display.clearDisplay();
  Serial.println("end");

}

void loop() {
//check if something was received (could be an interrupt from the radio)
if (radio.receiveDone())
{
//print message received to serial
Serial.print('[');Serial.print(radio.SENDERID);Serial.print("] ");
Serial.print((char*)radio.DATA);
Serial.print(" [RX_RSSI:");Serial.print(radio.RSSI);Serial.print("] ");
Serial.println(" ");
tempDisplay(radio.DATA);
radio.readAllRegs();
}
radio.receiveDone(); //put radio in RX mode
Serial.flush(); //make sure all serial data is clocked out before sleeping the MCU
}

void tempDisplay(char* temp) {
  display.clearDisplay();
  display.setCursor(10, 0);            // Start at top-left corner
  display.setTextSize(2);             // Draw 2X-scale text
  display.setTextColor(SSD1306_WHITE);
  
  display.println("Room Temp");
  
  display.setTextSize(3);             // Draw 2X-scale text
  display.setTextColor(SSD1306_WHITE);
  display.print("  ");
  display.print(temp);
  display.println("F");
  display.display();
  //Serial.println(temp);
   

}
