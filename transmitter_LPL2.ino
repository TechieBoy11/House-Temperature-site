#include <RFM69.h>
#include <SPI.h>
#include <RFM69registers.h>

#define NETWORKID 100 // The same on all nodes that talk to each other
#define NODEID 2 // The unique identifier of this node
#define RECEIVER 3 // The recipient of packets
#define FREQUENCY RF69_915MHZ
#define IS_RFM69HCW true // set to 'true' if you are using an RFM69HCW module
#define SERIAL_BAUD 115200
#define RFM69_CS 4 //chip select
#define RFM69_IRQ 3 //interrupt pin
#define RFM69_IRQN 1 // Pin 3 is IRQ 0!
#define RFM69_RST 2 //reset pin
RFM69 radio = RFM69(RFM69_CS, RFM69_IRQ, IS_RFM69HCW);//setup

//temp setup
float vRead=0;
float in=0;
float v=0;
float Vin=0;
float vt=0;
float Rtemp;
float temp=299.15;
float b=0;
char tempf=0;

void setup() {
Serial.begin(SERIAL_BAUD);
Serial.println("Arduino RFM69HCW Transmitter");
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
radio.setPowerLevel(15); // power output ranges from -2dBm to 20dBm
radio.setFrequency(915000000);
Serial.print("\nTransmitting at ");
Serial.print(FREQUENCY==RF69_433MHZ ? 433 : FREQUENCY==RF69_915MHZ ?  915 : 868);
Serial.println(" MHz");
}

void loop() {
//Reads in inputs
vRead=(analogRead(A0)); //V drop of the thermister
in= analogRead(A1);     //V input
//Converts inputs to volteges
vt=vRead*(5);
vt=vt/(1023);
Vin=in*(5);
Vin=Vin/(1023);
//Converts voltage drop into resistance
Rtemp=(vt*10000)/(Vin-vt);
//Converts the resistance into a tepature (k)
temp =  ((1007747)/(3380+298.15*log(Rtemp/10000)));
//Converts temp units to fahrenheit
tempf =((temp-273.15)*(1.8))+32;
 
char radiopacket[20];
sprintf(radiopacket, "%d", tempf);
Serial.print("Sending "); Serial.println(radiopacket);
radio.send(RECEIVER, radiopacket, strlen(radiopacket));

radio.receiveDone(); //put radio in RX mode
Serial.flush(); //make sure all serial data is clocked out before sleeping the MCU
}
