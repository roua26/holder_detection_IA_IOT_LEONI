
# from fastapi import FastAPI
# import cv2
# import os
# from skimage.metrics import structural_similarity as ssim

# app = FastAPI()

# BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# IMAGE_PATH = os.path.join(BASE_DIR, "current.jpg")
# REF_PATH = os.path.join(BASE_DIR, "reference.jpg")



# # ----------------------------
# # ROI HOLDERS
# # ----------------------------

# H1_BOX = {
#     "x": 10,
#     "y": 300,
#     "w": 150,
#     "h": 150
# }

# H2_BOX = {
#     "x": 720,
#     "y": 250,
#     "w": 150,
#     "h": 150
# }


# def crop_box(img, box):
#     return img[
#         box["y"]:box["y"] + box["h"],
#         box["x"]:box["x"] + box["w"]
#     ]


# def analyze():

#     image = cv2.imread(IMAGE_PATH)
#     ref = cv2.imread(REF_PATH)

#     if image is None:
#         return {"error": "current.jpg introuvable"}

#     if ref is None:
#         return {"error": "reference.jpg introuvable"}

#     # ----------------------------
#     # EXTRACTION ROI
#     # ----------------------------

#     h1 = crop_box(image, H1_BOX)
#     h2 = crop_box(image, H2_BOX)

#     h1_ref = crop_box(ref, H1_BOX)
#     h2_ref = crop_box(ref, H2_BOX)

#     # ----------------------------
#     # GRAYSCALE
#     # ----------------------------

#     h1 = cv2.cvtColor(h1, cv2.COLOR_BGR2GRAY)
#     h2 = cv2.cvtColor(h2, cv2.COLOR_BGR2GRAY)

#     h1_ref = cv2.cvtColor(h1_ref, cv2.COLOR_BGR2GRAY)
#     h2_ref = cv2.cvtColor(h2_ref, cv2.COLOR_BGR2GRAY)

#     # ----------------------------
#     # SSIM
#     # ----------------------------

#     score_h1, _ = ssim(h1_ref, h1, full=True)
#     score_h2, _ = ssim(h2_ref, h2, full=True)

#     print("--------------------------------")
#     print("SSIM H1 :", score_h1)
#     print("SSIM H2 :", score_h2)
#     print("--------------------------------")

#     THRESHOLD = 0.9

#     result = {

#         "h1": "FERME" if score_h1 > THRESHOLD else "OUVERT",

#         "h2": "FERME" if score_h2 > THRESHOLD else "OUVERT",

#         "scores": {
#             "h1": round(float(score_h1), 4),
#             "h2": round(float(score_h2), 4)
#         },

#         "boxes": {
#             "h1": H1_BOX,
#             "h2": H2_BOX
#         }
#     }


#     return result


# @app.get("/")
# def home():
#     return {"message": "Holder Analyzer OK"}


# @app.get("/analyze")
# def run_analysis():
#     return analyze()


from fastapi import FastAPI
from inference_sdk import InferenceHTTPClient

app = FastAPI()

# ---------------------------------------
# ROBOFLOW
# ---------------------------------------

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="UXPGSZQjHfjFRRrpjTXC"
)


MODEL_ID = "rouas-workspace-yt3ms/find-holder_open-and-holder_close-4-yolo11s-t1"
CABLE_MODEL_ID = "rouas-workspace-yt3ms/find-cable_ok-and-cable_nok-1-yolo11s-t1"
TAP_MODEL_ID="rouas-workspace-yt3ms/find-taped-and-n_taped-1-yolo11s-t1"
CONFIDENCE_THRESHOLD = 0.4


# ---------------------------------------
# ANALYSE
# ---------------------------------------

@app.get("/analyze")
def analyze():

    result = client.infer(
        "current.jpg",
        model_id=MODEL_ID
    )

    predictions = result.get("predictions", [])

    # Filtrer selon la confiance
    predictions = [
        p for p in predictions
        if p["confidence"] >= CONFIDENCE_THRESHOLD
    ]

    # Trier de gauche vers la droite
    predictions = sorted(predictions, key=lambda p: p["x"])

    holders = []

    for i, p in enumerate(predictions):

        status = "NOK"

        if p["class"] == "holder_close":
            status = "OK"

        holder = {

            "id": i + 1,

            "status": status,

            "confidence": round(
                p["confidence"] * 100,
                2
            ),

            "class": p["class"],

            "box": {

                "x": int(p["x"] - p["width"] / 2),

                "y": int(p["y"] - p["height"] / 2),

                "w": int(p["width"]),

                "h": int(p["height"])
            }
        }

        holders.append(holder)

    return {

        "success": True,

        "count": len(holders),

        "holders": holders
    }

# ---------------------------------------
# ANALYSE CABLE
# ---------------------------------------

@app.get("/analyze_cable")
def analyze_cable():

    result = client.infer(
        "current.jpg",
        model_id=CABLE_MODEL_ID
    )

    predictions = result.get("predictions", [])

    predictions = [
        p for p in predictions
        if p["confidence"] >= CONFIDENCE_THRESHOLD
    ]

    cables = []

    for p in predictions:

        status = "OK"

        if p["class"] == "cable_nok":
            status = "NOK"

        cable = {

            "status": status,

            "class": p["class"],

            "confidence": round(
                p["confidence"] * 100,
                2
            ),

            "box": {

                "x": int(p["x"] - p["width"] / 2),

                "y": int(p["y"] - p["height"] / 2),

                "w": int(p["width"]),

                "h": int(p["height"])

            }

        }

        cables.append(cable)

    return {

        "success": True,

        "count": len(cables),

        "cables": cables

    }


@app.get("/analyze_tap")
def analyse_tap():
    result = client.infer(
        "current.jpg",
        model_id=TAP_MODEL_ID
    )

    predictions = result.get("predictions", [])

    holders = []
    cables = []

    # Séparer les prédictions en holders et câbles
    for p in predictions:
        if p["confidence"] < CONFIDENCE_THRESHOLD:
            continue

        item = {
            "confidence": round(p["confidence"] * 100, 2),
            "box": {
                "x": int(p["x"] - p["width"] / 2),
                "y": int(p["y"] - p["height"] / 2),
                "w": int(p["width"]),
                "h": int(p["height"])
            }
        }

        # Holder
        if p["class"] == "ok":
            item["status"] = "OK"
            holders.append(item)

        # Câble
        elif p["class"] in ["taped", "n_taped"]:
            item["status"] = "OK" if p["class"] == "taped" else "NOK"
            item["class"] = p["class"]
            cables.append(item)

    
    holders = sorted(holders, key=lambda h: h["box"]["x"])

   
    for i, holder in enumerate(holders):
        holder["id"] = i + 1

    return {
        "success": True,
        "holderCount": len(holders),
        "holders": holders,
        "cableCount": len(cables),
        "cables": cables
    }
# ---------------------------------------
# DEBUG
# ---------------------------------------

@app.get("/debug")
def debug():

    result = client.infer(
        "current.jpg",
        model_id=MODEL_ID
    )

    predictions = result.get("predictions", [])

    return {

        "count": len(predictions),
        "predictions": predictions
    }


@app.get("/")
def home():

    return {

        "message": "Holder Detection API",

        "model": MODEL_ID
    }
