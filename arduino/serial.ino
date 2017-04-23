#include <Servo.h>

#include "DHT.h"

#define DHTPIN 3     // what digital pin we're connected to

// Uncomment whatever type you're using!
#define DHTTYPE DHT11   // DHT 11

// Initialize DHT sensor.
DHT dht(DHTPIN, DHTTYPE);

// set pin numbers:
Servo myservo;  // create servo object to control a servo

String inputString = ""; // a string to hold incoming data
String outputString = "";
String actionKey = "joke";
String measKey = "meas";
String endStringKey = ".";
int startPosition = 10;
int position = 0;
boolean l_execute = false; // whether the string is complete
boolean l_measure = false; // wheter to read temp and humidity

void setup() {
  // initialize serial:
  Serial.begin(9600);
  while (!Serial) {
    ; // wait for serial port to connect. Needed for native USB
  }
  inputString.reserve(200);
  // servo in pos 9
  myservo.attach(9);  // attaches the servo on pin d9 to the servo object
  //myservo.write(10);
  dht.begin();
}

void loop() {
  //digitalWrite(ledPin, HIGH);
  serialLoopRead();
  // check if something happened
  if (l_execute) {
    l_execute = false;
    moveServo();
  }
  if (l_measure){
    l_measure = false;
    getMeasurements();
  }
}

// get temp and humidity meas
void getMeasurements(){
    float h = dht.readHumidity();
  // Read temperature as Celsius (the default)
  float t = dht.readTemperature();
    // Check if any reads failed and exit early (to try again).
  if (isnan(h) || isnan(t) ) {
    Serial.println("Failed to read from DHT sensor!");
  } else {
      Serial.print("{");
      Serial.print('"');
      Serial.print("humidity");
      Serial.print('"');
      Serial.print(": ");
      Serial.print(h);
      Serial.print(" , ");
      Serial.print('"');
      Serial.print("temperature");
      Serial.print('"');
      Serial.print(": ");
      Serial.print(t);
      Serial.print(" } \n");
    }
}

// Do something action
void moveServo() {
  myservo.write(position);
  delay(500);
  // back to initial position
  myservo.write(startPosition);
}

// translates the string into an integer
int StringtoInt (String inputString) {
  return inputString.toInt();
}

/*
  This routine is run between each
  time loop() runs, so using delay inside loop can delay
  response. Multiple bytes of data may be available.
*/
void serialLoopRead() {
  while (Serial.available()) {
    // get the new byte:
    char inChar = (char)Serial.read();
    // add it to the inputString:
    // if the incoming character is a newline, set a flag
    // so the main loop can do something about it:
    if (inChar == '.') {
      inputString += inChar;
      // check for servo movement action
      if ((inputString.substring(0,4).equals(actionKey)&&(inputString.substring(7).equals(endStringKey)))){
        l_execute = true;
        position = StringtoInt(inputString.substring(4,7));
      } // check for measurement request
      else if ((inputString.substring(0,4).equals(measKey)&&(inputString.substring(4).equals(endStringKey)))){
        l_measure = true;
      }
      inputString = "";
    } else {
      inputString += inChar;
    }
    // delay for stability
    delay(10);
  }
}
