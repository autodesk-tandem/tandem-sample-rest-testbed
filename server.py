import os
import requests
from flask import Flask, send_from_directory, request, redirect, session, jsonify

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev_secret_key')  # Change for production

# Configuration - load from .env
FORGE_CLIENT_ID = os.environ.get('FORGE_CLIENT_ID')
FORGE_CLIENT_SECRET = os.environ.get('FORGE_CLIENT_SECRET')
REDIRECT_URI = os.environ.get('FORGE_REDIRECT_URI', 'http://localhost:5000/oauth/callback')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    # Serve static files and directories
    return send_from_directory('.', path)

@app.route('/oauth/callback')
def oauth_callback():
    code = request.args.get('code')
    if not code:
        return 'Missing code', 400

    # Exchange code for access token
    token_url = 'https://developer.api.autodesk.com/authentication/v2/token'
    data = {
        'client_id': FORGE_CLIENT_ID,
        'client_secret': FORGE_CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URI
    }
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    resp = requests.post(token_url, data=data, headers=headers)
    if resp.status_code != 200:
        return f"Token exchange failed: {resp.text}", 400

    token_data = resp.json()
    # Store token in session (or return to frontend as needed)
    session['access_token'] = token_data.get('access_token')
    # Redirect to home page (or wherever appropriate)
    return redirect('/')

@app.route('/api/token')
def get_token():
    # Endpoint for frontend to retrieve access token if needed
    token = session.get('access_token')
    if not token:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify({'access_token': token})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
