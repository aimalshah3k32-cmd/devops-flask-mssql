import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import OperationalError

app = Flask(__name__)
# Enable CORS for all routes and origins
CORS(app, resources={r"/*": {"origins": "*"}})

# Environment variables se credentials fetch karna
DB_USER = os.getenv("DB_USER", "sa")
DB_PASSWORD = os.getenv("DB_PASSWORD", "YourStrong@Passw0rd")
DB_SERVER = os.getenv("DB_SERVER", "sqlserver")
DB_PORT = os.getenv("DB_PORT", "1433")
DB_NAME = os.getenv("DB_NAME", "master")

# SQL Server connection string (pymssql driver)
app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"mssql+pymssql://{DB_USER}:{DB_PASSWORD}@{DB_SERVER}:{DB_PORT}/{DB_NAME}"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# ----------------- Database Model -----------------
class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(50), default="Pending")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status
        }

# SQL Server ready hone ka wait karna aur table auto-create karna
def init_db():
    retries = 15
    while retries > 0:
        try:
            with app.app_context():
                db.create_all()
                print("Database connected and tables initialized successfully.")
                break
        except Exception as e:
            retries -= 1
            print(f"Waiting for SQL Server to boot up... error: {e}, retries left: {retries}")
            time.sleep(3)

# ----------------- CRUD & Health Endpoints -----------------

# Root check
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "Online",
        "service": "Flask SQL Server CRUD API",
        "endpoints": {
            "health": "GET /api/health",
            "get_tasks": "GET /api/tasks",
            "create_task": "POST /api/tasks",
            "get_task": "GET /api/tasks/<id>",
            "update_task": "PUT /api/tasks/<id>",
            "delete_task": "DELETE /api/tasks/<id>"
        }
    }), 200

# Health check
@app.route("/api/health", methods=["GET"])
def health_check():
    try:
        with app.app_context():
            db.session.execute(db.text("SELECT 1"))
        return jsonify({
            "status": "healthy",
            "database_status": "connected",
            "service": "Flask SQL Server CRUD API"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "degraded",
            "database_status": "disconnected",
            "error": str(e)
        }), 503


# 1. CREATE: Naya task insert karna (POST)
@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = request.get_json()
    if not data or "title" not in data:
        return jsonify({"error": "Title is required"}), 400

    new_task = Task(
        title=data["title"],
        description=data.get("description", ""),
        status=data.get("status", "Pending")
    )
    db.session.add(new_task)
    db.session.commit()

    return jsonify({"message": "Task created successfully", "task": new_task.to_dict()}), 201

# 2. READ ALL: Saare tasks fetch karna (GET)
@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([task.to_dict() for task in tasks]), 200

# 3. READ ONE: Specific task ID se fetch karna (GET)
@app.route("/api/tasks/<int:task_id>", methods=["GET"])
def get_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task.to_dict()), 200

# 4. UPDATE: Task modify karna (PUT)
@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json()
    task.title = data.get("title", task.title)
    task.description = data.get("description", task.description)
    task.status = data.get("status", task.status)

    db.session.commit()
    return jsonify({"message": "Task updated successfully", "task": task.to_dict()}), 200

# 5. DELETE: Task delete karna (DELETE)
@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": f"Task {task_id} deleted successfully"}), 200

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000)