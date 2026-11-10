const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const http = require("http");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:4200" }));

const server = http.createServer(app);
const ESP32_IP = "http://10.129.170.38";

const ESP32_IP_cam = "http://10.129.170.174";


const AI_FOLDER = path.join(__dirname, "AI");

app.use("/images", express.static(AI_FOLDER));

app.get("/dataset/:count", async (req, res) => {

    const count = parseInt(req.params.count);

    if (isNaN(count) || count <= 0) {
        return res.status(400).json({
            success: false,
            message: "Nombre d'images invalide"
        });
    }

    for (let i = 0; i < count; i++) {

        try {

            const response = await axios({
                method: "get",
                url: `${ESP32_IP_cam}/capture`,
                responseType: "stream",
                timeout: 10000
            });

            const filename = `dataset/skotchs/image_${i + 1}.jpg`;

            const writer = fs.createWriteStream(filename);

            await new Promise((resolve, reject) => {

                response.data.pipe(writer);

                writer.on("finish", resolve);

                writer.on("error", reject);

            });

            console.log(`Image ${i + 1}/${count} sauvegardée`);

            // délai entre deux captures
            await new Promise(r => setTimeout(r, 1000));

        }
        catch (err) {

            console.log(err);

            return res.status(500).json({
                success: false,
                message: `Erreur à l'image ${i + 1}`
            });
        }

    }

    res.json({
        success: true,
        images: count,
        folder: "dataset/cable"
    });

});
function getLatestImage() {
    const targetFile = "current.jpg";
    const filePath = path.join(AI_FOLDER, targetFile);

    
    if (fs.existsSync(filePath)) {
        return `http://localhost:3000/images/${targetFile}`;
    }

    return null;
}


async function captureImage() {

    const response = await axios({
        method: "get",
        url: `${ESP32_IP_cam}/capture`,
        responseType: "stream",
        timeout: 10000
    });

    const filename = path.join(AI_FOLDER, `current.jpg`);
    const writer = fs.createWriteStream(filename);

    return new Promise((resolve, reject) => {

        response.data.pipe(writer);

        writer.on("finish", () => resolve(filename));
        writer.on("error", reject);

    });
}


app.get("/capture", async (req, res) => {

    try {
        const file = await captureImage();

        res.json({
            success: true,
            image: getLatestImage()
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




app.get("/test", async (req, res) => {

    // await captureImage();
    //  await new Promise(resolve => setTimeout(resolve, 300));
    const holder = await axios.get("http://127.0.0.1:5000/analyze");
    const cables = await axios.get(
    "http://127.0.0.1:5000/analyze_cable"
);
    res.json({

        holders: holder.data.holders,
        count: holder.data.count,
       cables: cables.data.cables,

        image: getLatestImage()

    });

});

app.get("/testStation4", async (req, res) => {

    try {

        
        // await captureImage();
        // await new Promise(resolve => setTimeout(resolve, 300));

        const response = await axios.get(
            "http://127.0.0.1:5000/analyze_tap"
        );

         res.json({

            success: response.data.success,

            holderCount: response.data.holderCount,
            holders: response.data.holders,

            cableCount: response.data.cableCount,
            cables: response.data.cables,

            image: getLatestImage()

        });

    } catch (error) {

        console.error("Erreur Station 4 :", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });

    
    }

});



app.get("/ouvrir", async (req, res) => {
    await axios.get(`${ESP32_IP}/ouvrir`);
    res.json({ success: true });
});

app.get("/fermer", async (req, res) => {
    await axios.get(`${ESP32_IP}/fermer`);
    res.json({ success: true });
});

app.get("/fermer/:id", async (req, res) => {

    const id = req.params.id;

    try {

        await axios.get(`${ESP32_IP}/fermer/${id}`);

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});
app.get("/ouvrir/:id", async (req, res) => {

    const id = req.params.id;

    try {

        await axios.get(`${ESP32_IP}/ouvrir/${id}`);

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

app.get("/system/status", async (req, res) => {

    let esp32cam = false;
    let esp32 = false;

    try {

        await axios.get(`${ESP32_IP_cam}/capture`, {
            timeout: 2000
        });

        esp32cam = true;

    } catch {}

    try {

        await axios.get(`${ESP32_IP}/ping`, {
            timeout: 2000
        });

        esp32 = true;

    } catch {}

    res.json({

        esp32cam,

        esp32,

        system:

            esp32cam && esp32
                ? "ACTIVE"
                : "ACTIVE"//NON FONCTIONNEL"

    });

});

server.listen(3000, () => {
    console.log("Server running on 3000");
});