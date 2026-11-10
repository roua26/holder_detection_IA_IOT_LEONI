from fastapi import FastAPI
from ultralytics import YOLO
import os

app = FastAPI()


# =====================================================
# CONFIGURATION
# =====================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# -----------------------------------------------------
# Modèle HOLDER
# -----------------------------------------------------

HOLDER_MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "best.pt"
)

# -----------------------------------------------------
# Modèle CABLE
# -----------------------------------------------------

CABLE_MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "bestCable.pt"
)

# -----------------------------------------------------
# Image commune
# -----------------------------------------------------

IMAGE_PATH = os.path.join(
    BASE_DIR,
    "current.jpg"
)

CONFIDENCE_THRESHOLD = 0.7
CONFIDENCE_THRESHOLD_CABLE = 0.7


# =====================================================
# CHARGEMENT DU MODÈLE HOLDER
# =====================================================

print("==========================================")
print("Chargement du modèle HOLDER...")
print("==========================================")

holder_model = YOLO(HOLDER_MODEL_PATH)

print("Modèle HOLDER chargé avec succès")
print("Classes HOLDER :", holder_model.names)


# =====================================================
# CHARGEMENT DU MODÈLE CABLE
# =====================================================

print("==========================================")
print("Chargement du modèle CABLE...")
print("==========================================")

cable_model = YOLO(CABLE_MODEL_PATH)

print("Modèle CABLE chargé avec succès")
print("Classes CABLE :", cable_model.names)


# =====================================================
# PAGE PRINCIPALE
# =====================================================

@app.get("/")
def home():

    return {
        "success": True,
        "message": "Quality Control AI API",

        "models": {
            "holder": {
                "model": "YOLO11s",
                "classes": holder_model.names
            },

            "cable": {
                "model": "YOLO11s",
                "classes": cable_model.names
            }
        }
    }


# =====================================================
# ANALYSE HOLDERS
# =====================================================

@app.get("/analyze")
def analyze():

    # -------------------------------------------------
    # Vérifier que l'image existe
    # -------------------------------------------------

    if not os.path.exists(IMAGE_PATH):

        return {
            "success": False,
            "message": "current.jpg introuvable"
        }

    # -------------------------------------------------
    # YOLO HOLDER
    # -------------------------------------------------

    results = holder_model.predict(
        source=IMAGE_PATH,
        conf=CONFIDENCE_THRESHOLD,
        verbose=False
    )

    holders = []

    # -------------------------------------------------
    # RÉCUPÉRATION DES DÉTECTIONS
    # -------------------------------------------------

    for result in results:

        for box in result.boxes:

            class_id = int(box.cls[0])

            confidence = float(box.conf[0])

            class_name = holder_model.names[class_id]

            # Coordonnées
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            # Dimensions
            width = x2 - x1
            height = y2 - y1

            # -------------------------------------------------
            # ÉTAT HOLDER
            # -------------------------------------------------

            if class_name == "holder_open":

                status = "NOK"

            elif class_name == "holder_close":

                status = "OK"

            else:

                continue

            # -------------------------------------------------
            # AJOUT HOLDER
            # -------------------------------------------------

            holders.append({

                "status": status,

                "confidence": round(
                    confidence * 100,
                    2
                ),

                "class": class_name,

                "box": {

                    "x": int(x1),
                    "y": int(y1),
                    "w": int(width),
                    "h": int(height)

                }

            })

    # -------------------------------------------------
    # TRI GAUCHE → DROITE
    # -------------------------------------------------

    holders = sorted(
        holders,
        key=lambda h: h["box"]["x"]
    )

    # -------------------------------------------------
    # AJOUT ID
    # -------------------------------------------------

    for i, holder in enumerate(holders):

        holder["id"] = i + 1

    # -------------------------------------------------
    # RÉSULTAT
    # -------------------------------------------------

    return {

        "success": True,

        "count": len(holders),

        "holders": holders

    }


# =====================================================
# ANALYSE CÂBLES
# =====================================================

@app.get("/analyze_cable")
def analyze_cable():

    # -------------------------------------------------
    # Vérifier que l'image existe
    # -------------------------------------------------

    if not os.path.exists(IMAGE_PATH):

        return {
            "success": False,
            "message": "current.jpg introuvable"
        }

    # -------------------------------------------------
    # YOLO CABLE
    # -------------------------------------------------

    results = cable_model.predict(
        source=IMAGE_PATH,
        conf=CONFIDENCE_THRESHOLD_CABLE,
        verbose=False
    )

    cables = []

    # -------------------------------------------------
    # RÉCUPÉRATION DES DÉTECTIONS
    # -------------------------------------------------

    for result in results:

        for box in result.boxes:

            class_id = int(box.cls[0])

            confidence = float(box.conf[0])

            class_name = cable_model.names[class_id]

            # -------------------------------------------------
            # COORDONNÉES
            # -------------------------------------------------

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            width = x2 - x1
            height = y2 - y1

            # -------------------------------------------------
            # ÉTAT CÂBLE
            # -------------------------------------------------

            if class_name == "COK":

                status = "OK"

            elif class_name == "CNOK":

                status = "NOK"

            else:

                continue

            # -------------------------------------------------
            # AJOUT CÂBLE
            # -------------------------------------------------

            cables.append({

                "status": status,

                "confidence": round(
                    confidence * 100,
                    2
                ),

                "class": class_name,

                "box": {

                    "x": int(x1),
                    "y": int(y1),
                    "w": int(width),
                    "h": int(height)

                }

            })

    # -------------------------------------------------
    # TRI GAUCHE → DROITE
    # -------------------------------------------------

    cables = sorted(
        cables,
        key=lambda c: c["box"]["x"]
    )

    # -------------------------------------------------
    # AJOUT ID
    # -------------------------------------------------

    for i, cable in enumerate(cables):

        cable["id"] = i + 1

    # -------------------------------------------------
    # RÉSULTAT
    # -------------------------------------------------

    return {

        "success": True,

        "count": len(cables),

        "cables": cables

    }