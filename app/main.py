import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
import requests
from flask import Flask, redirect, request, render_template, session, url_for, jsonify
from pymongo import MongoClient

# Load the enviroment variables
load_dotenv()

app = Flask(__name__, template_folder="frontend/templates", static_folder="frontend/static")

# Set the secret key to sign the session cookie
app.secret_key = os.getenv("SECRET_KEY")

# Connect to the MongoDB database
client = MongoClient(os.getenv("MONGODB_URI"))["production"]

# Helper functions

def get_hackathons(bson=False):
    if bson:
        return sorted(list(client["hackathons"].find({}, {})), key=lambda hackathon: hackathon["hackathon_name"].lower())
    return sorted(list(client["hackathons"].find({}, {"_id":0})), key=lambda hackathon: hackathon["hackathon_name"].lower())

def set_session_state():
    session["state"] = str(uuid.uuid4())
    return session["state"]

def login_user(code):

    access_token = requests.post(f'https://github.com/login/oauth/access_token?client_id={os.getenv("GITHUB_CLIENT_ID")}&client_secret={os.getenv("GITHUB_CLIENT_SECRET")}&code={code}', headers={"Accept": "application/json"}).json()["access_token"]

    if not access_token:
        return ("error", "An error occurred during the authentication process. Please try again.")
    
    session["logged_in"] = True

    user_information = requests.get(f'https://api.github.com/user', headers={"Authorization": f'token {access_token}'}).json()

    client["users"].find_one_and_update({"user_id": user_information["id"]}, {"$set": {"last_login": datetime.now(), "account_information": user_information}, "$setOnInsert": {"user_id": user_information["id"], "account_created": datetime.now(), "is_blocked": False, "account_type": "user"}}, upsert=True)

    if client["users"].find_one({"user_id": user_information["id"]})["is_blocked"]:
        return ("error", "The user account has been blocked, due to a violation of the terms of service.")
    
    return ("success", client["users"].find_one({"user_id": user_information["id"]}, {"_id": 0}))

# Template Filters

@app.template_filter("format_currency")
def format_currency(value):
    return value[:2] + ''.join(
    char + ("," if (i == 2 or i > 2 and (i - 2) % 2 == 0) else "")
    for i, char in enumerate(value[:1:-1]))[::-1]

@app.route("/", methods=["GET"])
def index():
    return redirect("/home")

@app.route("/home", methods=["GET"])
def home():
    return render_template("public/home.html", hackathons=get_hackathons(bson=True))

@app.route("/export", methods=["GET"])
def export():
    hackathons = get_hackathons()

    data_format = request.args.get("format", "json")

    if data_format == "json":
        return hackathons
    else:
        return jsonify({"status": "error", "message": "Inavlid request parameters"}), 400
    

# Authentication Routes

@app.route("/auth/login", methods=["GET"])
def login():
    request_state = set_session_state()
    return redirect(f'https://github.com/login/oauth/authorize?client_id={os.getenv("GITHUB_CLIENT_ID")}&redirect_uri={os.getenv("GITHUB_REDIRECT_URI")}&state={request_state}')

@app.route("/auth/github/callback", methods=["GET"])
def github_callback():
    if request.args.get("state") != session.get("state"):
        return render_template("public/callback.html", message="The OAuth state does not match. Please try again.")

    if request.args.get("error"):
        return render_template("public/callback.html", message="An error occurred during the authentication process. Please try again.")

    session.pop("state", None)

    login_status, user_information = login_user(request.args.get("code"))

    if login_status == "error":
        return render_template("public/callback.html", message=user_information)
    
    session["user"] = user_information

    return render_template("public/callback.html", message="Authenticated successfully, feel free to close this tab.")

@app.route("/auth/logout", methods=["GET"])
def logout():
    session.clear()
    return redirect("/home")

if __name__ == "__main__":
    app.run(debug=True)