#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>

const char* ssid = "OPPO A96";
const char* password = "roua1234";

WebServer server(80);

Servo servo1;
Servo servo2;

#define SERVO1_PIN 19
#define SERVO2_PIN 18

// Positions
const int OPEN_S1 = 10;
const int CLOSE_S1 = 100;
const int OPEN_S2 = 90;
const int CLOSE_S2 = 0;

void fermerTous() {
    servo1.write(CLOSE_S1);
    servo2.write(CLOSE_S2);

    server.send(200, "text/plain", "Tous fermes");
}

void ouvrirTous() {
    servo1.write(OPEN_S1);
    servo2.write(OPEN_S2);

    server.send(200, "text/plain", "Tous ouverts");
}

void fermer1() {
    servo1.write(CLOSE_S1);

    server.send(200, "text/plain", "Holder 1 ferme");
}

void fermer2() {
    servo2.write(CLOSE_S2);

    server.send(200, "text/plain", "Holder 2 ferme");
}

void ouvrir1() {
    servo1.write(OPEN_S1);

    server.send(200, "text/plain", "Holder 1 ouvert");
}

void ouvrir2() {
    servo2.write(OPEN_S2);

    server.send(200, "text/plain", "Holder 2 ouvert");
}
void pageAccueil() {

    String html = R"rawliteral(
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Controle Holders</title>
        <style>
            body{
                font-family:Arial;
                text-align:center;
                margin-top:50px;
            }

            button{
                width:200px;
                height:80px;
                font-size:25px;
                margin:20px;
                cursor:pointer;
            }

            .ouvrir{
                background-color:green;
                color:white;
            }

            .fermer{
                background-color:red;
                color:white;
            }
        </style>
    </head>
    <body>

        <h1>Controle des Holders</h1>

        <button class="ouvrir"
            onclick="fetch('/ouvrir')">
            OUVRIR
        </button>

        <button class="fermer"
            onclick="fetch('/fermer')">
            FERMER
        </button>
         <button class="fermer"
            onclick="fetch('/fermer1')">
            FERMER HOLDER 1
        </button>

        <button class="fermer"
            onclick="fetch('/fermer2')">
            FERMER HOLDER 2
        </button>

    </body>
    </html>
    )rawliteral";

    server.send(200, "text/html", html);
}
void setup() {

    Serial.begin(115200);

    servo1.attach(SERVO1_PIN);
    servo2.attach(SERVO2_PIN);

    servo1.write(OPEN_S1);
    servo2.write(OPEN_S2);

    WiFi.begin(ssid, password);

    Serial.print("Connexion WiFi");

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.println("Connecte !");
    Serial.print("IP : ");
    Serial.println(WiFi.localIP());

    server.on("/", pageAccueil);

    server.on("/ouvrir", ouvrirTous);
    server.on("/fermer", fermerTous);

    server.on("/ouvrir/1", ouvrir1);
    server.on("/ouvrir/2", ouvrir2);

    server.on("/fermer/1", fermer1);
    server.on("/fermer/2", fermer2);
    
    server.on("/ping", HTTP_GET, []() {
    server.send(200, "text/plain", "OK");
    });
    server.begin();

    Serial.println("Serveur HTTP demarre");
}

void loop() {
    server.handleClient();
}