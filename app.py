import os
import time
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_login import LoginManager, login_user, current_user, logout_user,login_required
from flask_socketio import SocketIO, join_room, leave_room, send

from wtform_fields import *
from models import *

# Configure app
app = Flask(__name__)
app.secret_key=os.environ.get('SECRET') or "my_little_secret"
app.config['WTF_CSRF_SECRET_KEY'] = "b'f\xfa\x8b{X\x8b\x9eM\x83l\x19\xad\x84\x08\xaa"

# Configure database
app.config['SQLALCHEMY_DATABASE_URI']=os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
mapping={}
allowed={}
# Initialize login manager
login = LoginManager(app)
login.init_app(app)

@login.user_loader
def load_user(id):
    return User.query.get(int(id))

socketio = SocketIO(app, manage_session=False)

# Predefined rooms for chat
ROOMS = ["lounge", "news", "games", "coding"]


@app.route("/", methods=['GET', 'POST'])
def index():

    reg_form = RegistrationForm()

    # Update database if validation success
    if reg_form.validate_on_submit():
        username = reg_form.username.data
        password = reg_form.password.data

        # Hash password
        hashed_pswd = pbkdf2_sha256.hash(password)

        # Add username & hashed password to DB
        user = User(username=username, hashed_pswd=hashed_pswd)
        db.session.add(user)
        db.session.commit()

        flash('Registered successfully. Please login.', 'success')
        return redirect(url_for('login'))

    return render_template("index.html", form=reg_form)


@app.route("/login", methods=['GET', 'POST'])
def login():

    login_form = LoginForm()

    # Allow login if validation success
    if login_form.validate_on_submit():
        user_object = User.query.filter_by(username=login_form.username.data).first()
        login_user(user_object)
        return redirect(url_for('dashboard'))

    return render_template("login.html", form=login_form)


@app.route("/dashboard", methods=['GET', 'POST'])
@login_required
def dashboard():

    if not current_user.is_authenticated:
        flash('Please login', 'danger')
        return redirect(url_for('login'))

    return render_template("dashboard.html", username=current_user.username)

@app.route("/logout", methods=['GET'])
@login_required
def logout():
    # Logout user
    logout_user()
    flash('You have logged out successfully', 'success')
    return redirect(url_for('login'))


@app.route("/wait", methods=['GET', 'POST'])
@login_required
def wait():
    room=request.form.get('meet_url')
    if mapping.get(room)==None:
        mapping[room]=current_user.username
        allowed[room] = set([current_user.username])
    if current_user.username==mapping[room]:
        mapping[room]=current_user.username
        return redirect(f"/chat/{room}")
    if current_user.username in allowed[room]:
        return redirect(f"/chat/{room}")
    return render_template("wait.html", username=current_user.username, room=room,admin=mapping[room])


@app.route("/chat/<string:room>", methods=['GET', 'POST'])
@login_required
def chat(room):
    if room not in mapping or room not in allowed or current_user.username not in allowed[room]:
        return redirect("/dashboard")
    return render_template("chat.html", username=current_user.username, room=room,admin=mapping[room])

@app.errorhandler(404)
def page_not_found(e):
    # note that we set the 404 status explicitly
    return render_template('404.html'), 404


@socketio.on('incoming-msg')
def on_message(data):
    """Broadcast messages"""

    msg = data["msg"]
    username = data["username"]
    room = data["room"]
    # Set timestamp
    time_stamp = time.strftime('%b-%d %I:%M%p', time.localtime())
    send({"username": username, "msg": msg, "time_stamp": time_stamp}, room=room)


@socketio.on('join')
def on_join(data):
    """User joins a room"""
    # print(data,'joining',current_user.username)
    username = data["username"]
    room = data["room"]
    join_room(room)

    # Broadcast that new user has joined
    send({"msg": username + " has joined the " + room + " room."}, room=room)


@socketio.on('leave')
def on_leave(data):
    """User leaves a room"""

    username = data['username']
    room = data['room']
    leave_room(room)
    # print(data,'leaving')
    send({"msg": username + " has left the room"}, room=room)

@socketio.on('request_access')
def proce(data):
    # print(data,'in request_access')
    send({"username":data['username'],"admin":data['admin'],"room":data['room']},room=data['room'])

@socketio.on('request_reply')
def porce(data):
    if data['answer']:
        allowed[data['room']].add(data['username'])
    # print(data,'in request_reply',allowed)
    return send({"answer":data['answer'],"username":data['username']},room=data['username'])
if __name__ == "__main__":
    socketio.run(app)