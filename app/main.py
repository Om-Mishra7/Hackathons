import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
import requests
from flask import Flask, redirect, request, render_template, session, jsonify
from pymongo import MongoClient
from bson import ObjectId

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
        records =  sorted(list(client["hackathons"].find({}, {})), key=lambda hackathon: hackathon["hackathon_name"].lower())
        for record in records:
            record["_id"] = str(record["_id"])
        return records
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
    elif data_format == "html":
        return render_template("public/export.html", hackathons=hackathons)
    else:
        return jsonify({"status": "error", "message": "Invalid format provided, please check the format and try again."}), 400

@app.route("/hackathons/search", methods=["GET"])
def search_hackathons():
    search_query = request.args.get("q")

    if not search_query:
        return get_hackathons(bson=True)

    records = sorted(list(client["hackathons"].find({"hackathon_name": {"$regex": search_query, "$options": "i"}}, {})), key=lambda hackathon: hackathon["hackathon_name"].lower())
    for record in records:
        record["_id"] = str(record["_id"])
    return records

@app.route("/hackathons/<hackathon_id>/history", methods=["GET"])
def hackathon_history(hackathon_id):

    try:
        hackathon_id = ObjectId(hackathon_id)
    except:
        return jsonify({"status": "error", "message": "Invalid hackathon ID provided, please check the ID and try again."}), 400

    hackathon = list(client["hackathons"].aggregate([
        # Match the hackathon with the provided ID
        {
            "$match": {
                "_id": hackathon_id
            }
        },
        # Unwind the edit_history array to handle each edit individually
        {
            "$unwind": {
                "path": "$edit_history",
                "preserveNullAndEmptyArrays": True
            }
        },
        # Get the users' GitHub username from the users collection using the user_id
        {
            "$lookup": {
                "from": "users",
                "localField": "edit_history.edited_by",
                "foreignField": "user_id",
                "as": "user_information"
            }
        },
        # Unwind the user_information array to flatten the user information
        {
            "$unwind": {
                "path": "$user_information",
                "preserveNullAndEmptyArrays": True
            }
        },
        # Project the required fields
        {
            "$project": {
                "_id": 0,
                "hackathon_name": 1,
                "organizing_body_name": 1,
                "last_iteration_date": 1,
                "last_iteration_location": 1,
                "last_prize_pool": 1,
                "website_link": 1,
                "edit_history": {
                    # Attempt to fetch GitHub username or fallback to edited_by
                    "edited_by": {
                        "$ifNull": ["$user_information.account_information.login", "$edit_history.edited_by"]
                    },
                    "edited_at": "$edit_history.edited_at",
                    "edit_reason": "$edit_history.edit_reason",
                    "hackathon_information": "$edit_history.hackathon_information",
                    "edit_type": "$edit_history.edit_type"
                }
            }
        },
        # Group back the edit_history if needed
        {
            "$group": {
                "_id": {
                    "hackathon_name": "$hackathon_name",
                    "organizing_body_name": "$organizing_body_name",
                    "last_iteration_date": "$last_iteration_date",
                    "last_iteration_location": "$last_iteration_location",
                    "last_prize_pool": "$last_prize_pool",
                    "website_link": "$website_link"
                },
                "edit_history": {
                    "$push": "$edit_history"
                }
            }
        },
        # Final projection to flatten the _id
        {
            "$project": {
                "_id": 0,
                "hackathon_name": "$_id.hackathon_name",
                "organizing_body_name": "$_id.organizing_body_name",
                "last_iteration_date": "$_id.last_iteration_date",
                "last_iteration_location": "$_id.last_iteration_location",
                "last_prize_pool": "$_id.last_prize_pool",
                "website_link": "$_id.website_link",
                "edit_history": 1
            }
        }
    ])
    )

    if not hackathon:
        return jsonify({"status": "error", "message": "No hackathon found with the provided ID, the hackathon may have been deleted or please check the ID and try again."}), 404
    
    return jsonify({"status": "success", "hackathon_id": str(hackathon_id), "edit_history": hackathon[0]["edit_history"]})

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

# API Routes

@app.route("/api/v1/hackathons/<hackathon_id>", methods=["GET"])
def get_hackathon(hackathon_id):
    hackathon = client["hackathons"].find_one({"_id": ObjectId(hackathon_id)})

    if not hackathon:
        return jsonify({"status": "error", "message": "No hackathon found with the provided ID, the hackathon may have been deleted or please check the ID and try again."}), 404
    
    hackathon["_id"] = str(hackathon["_id"])

    return jsonify({"status": "success", "hackathon": hackathon})

@app.route("/api/v1/hackathons/<hackathon_id>", methods=["PUT"])
def edit_hackathon(hackathon_id):
    hackathon_name = request.json.get("hackathon_name")
    organizing_body_name = request.json.get("organizing_body_name")
    last_iteration_date = request.json.get("last_iteration_date")
    last_iteration_location = request.json.get("last_iteration_location")
    last_prize_pool = request.json.get("last_prize_pool")
    website_link = request.json.get("website_link")

    if not hackathon_name or not organizing_body_name or not last_iteration_date or not last_iteration_location or not last_prize_pool or not website_link:
        return jsonify({"status": "error", "message": f"Please, fill the following fields: {'Hackathon Name' if not hackathon_name else ''} {'Organizing Body Name' if not organizing_body_name else ''} {'Last Iteration Date' if not last_iteration_date else ''} {'Last Iteration Location' if not last_iteration_location else ''} {'Last Prize Pool' if not last_prize_pool else ''} {'Website Link' if not website_link else ''} to submit the form."}), 400
    try:
        requests.get(website_link, timeout=10, verify=False)
    except:
        return jsonify({"status": "error", "message": "The website link provided is inaccessible or does not exist."}), 400
    
    if session.get("user") is None:
        return jsonify({"status": "error", "message": "You need to be authenticated to perform this action."}), 401
    
    if client["hackathons"].find_one({"hackathon_name": hackathon_name, "_id": {"$ne": ObjectId(hackathon_id)}}):
        return jsonify({"status": "error", "message": "The hackathon already exists in the database, please check the list of hackathons"}), 409
    
    if client["hackathons"].find_one({"website_link": website_link, "_id": {"$ne": ObjectId(hackathon_id)}}):
        return jsonify({"status": "error", "message": "The website link already exists in the database, please check the list of hackathons"}), 409
    
    if last_prize_pool.isdigit() == False:
        return jsonify({"status": "error", "message": "The prize pool must be a valid number, without any currency symbols."}), 400

    hackathon = client["hackathons"].find_one({"_id": ObjectId(hackathon_id)})

    if hackathon["hackathon_name"] == hackathon_name and hackathon["organizing_body_name"] == organizing_body_name and hackathon["last_iteration_date"] == last_iteration_date and hackathon["last_iteration_location"] == last_iteration_location and hackathon["last_prize_pool"] == f"₹{last_prize_pool}" and hackathon["website_link"] == website_link:
        return jsonify({"status": "error", "message": "The hackathon information has not been changed, please update the information and try again."}), 400

    hackathon = client["hackathons"].find_one_and_update({"_id": ObjectId(hackathon_id)}, {
        "$set": {
            "hackathon_name": hackathon_name,
            "organizing_body_name": organizing_body_name,
            "last_iteration_date": last_iteration_date,
            "last_iteration_location": last_iteration_location,
            "last_prize_pool": f"₹{last_prize_pool}",
            "website_link": website_link
        },
        "$push": {
            "edit_history": {
                "edited_by": session["user"]["user_id"],
                "edited_at": datetime.now(),
                "edit_reason": "Updated the hackathon information.",
                "hackathon_information": {
                    "hackathon_name": hackathon_name,
                    "organizing_body_name": organizing_body_name,
                    "last_iteration_date": last_iteration_date,
                    "last_iteration_location": last_iteration_location,
                    "last_prize_pool": f"₹{last_prize_pool}",
                    "website_link": website_link
                },
                "edit_type": "update",
            }
        }
    })

    if not hackathon:
        return jsonify({"status": "error", "message": "No hackathon found with the provided ID, the hackathon may have been deleted or please check the ID and try again."}), 404
    
    return jsonify({"status": "success", "hackathon_id": str(hackathon_id), "message": "The hackathon information has been updated successfully, check the history for more details."})

@app.route("/api/v1/hackathons", methods=["POST"])
def add_hackathon():
    hackathon_name = request.json.get("hackathon_name")
    organizing_body_name = request.json.get("organizing_body_name")
    last_iteration_date = request.json.get("last_iteration_date")
    last_iteration_location = request.json.get("last_iteration_location")
    last_prize_pool = request.json.get("last_prize_pool")
    website_link = request.json.get("website_link")

    if not hackathon_name or not organizing_body_name or not last_iteration_date or not last_iteration_location or not last_prize_pool or not website_link:
        return jsonify({"status": "error", "message": f"Please, fill the following fields: {'Hackathon Name' if not hackathon_name else ''} {'Organizing Body Name' if not organizing_body_name else ''} {'Last Iteration Date' if not last_iteration_date else ''} {'Last Iteration Location' if not last_iteration_location else ''} {'Last Prize Pool' if not last_prize_pool else ''} {'Website Link' if not website_link else ''} to submit the form."}), 400
    
    try:
        requests.get(website_link, timeout=10, verify=False)
    except:
        return jsonify({"status": "error", "message": "The website link provided is inaccessible or does not exist."}), 400

    if session.get("user") is None:
        return jsonify({"status": "error", "message": "You need to be authenticated to perform this action."}), 401
    
    if client["hackathons"].find_one({"hackathon_name": hackathon_name}):
        return jsonify({"status": "error", "message": "The hackathon already exists in the database, please check the list of hackathons"}), 409
    
    if client["hackathons"].find_one({"website_link": website_link}):
        return jsonify({"status": "error", "message": "The website link already exists in the database, please check the list of hackathons"}), 409
    
    if last_prize_pool.isdigit() == False:
        return jsonify({"status": "error", "message": "The prize pool must be a valid number, without any currency symbols."}), 400
        
    hackathon_id = client["hackathons"].insert_one({
        "hackathon_name": hackathon_name,
        "organizing_body_name": organizing_body_name,
        "last_iteration_date": last_iteration_date,
        "last_iteration_location": last_iteration_location,
        "last_prize_pool": f"₹{last_prize_pool}",
        "website_link": website_link,
        "edit_history": [
            {
                "edited_by": session["user"]["user_id"],
                "edited_at": datetime.now(),
                "edit_reason": "Added the hackathon to the database.",
                "hackathon_information": {
                    "hackathon_name": hackathon_name,
                    "organizing_body_name": organizing_body_name,
                    "last_iteration_date": last_iteration_date,
                    "last_iteration_location": last_iteration_location,
                    "last_prize_pool": f"₹{last_prize_pool}",
                    "website_link": website_link
                },
                "edit_type": "addition",
            }
        ]
    }).inserted_id


    return jsonify({"status": "success", "hackathon_id": str(hackathon_id), "message": "The hackathon has been added successfully, check the history for more details."})

@app.route("/api/v1/hackathons/<hackathon_id>/report", methods=["POST"])
def report_hackathon(hackathon_id):
    report_reason = request.json.get("report_reason")
    report_description = request.json.get("report_description")

    if not report_description:
        return jsonify({"status": "error", "message": "Please, fill the description field to submit the form."}), 400
    
    if session.get("user") is None:
        return jsonify({"status": "error", "message": "You need to be authenticated to perform this action."}), 401
    
    hackathon = client["hackathons"].find_one({"_id": ObjectId(hackathon_id)})

    if not hackathon:
        return jsonify({"status": "error", "message": "No hackathon found with the provided ID, the hackathon may have been deleted or please check the ID and try again."}), 404
    
    client["hackathons"].find_one_and_update({"_id": ObjectId(hackathon_id)}, {
        "$push": {
            "reports": {
                "reported_by": session["user"]["user_id"],
                "reported_at": datetime.now(),
                "report_reason": report_reason,
                "report_description": report_description
            }
        }
    })

    return jsonify({"status": "success", "message": "The hackathon has been reported successfully, the moderation team will review the report."})

# Error Handlers

@app.errorhandler(404)
def not_found(error):
    return render_template("public/error.html", error_code=404, error_message="The page you are looking for does not exist or has been removed.")

@app.errorhandler(405)
def method_not_allowed(error):
    return render_template("public/error.html", error_code=405, error_message="The method is not allowed for the requested URL.")

@app.errorhandler(500)
def internal_server_error(error):
    return render_template("public/error.html", error_code=500, error_message="Oops! Something went wrong, please try again later.")
