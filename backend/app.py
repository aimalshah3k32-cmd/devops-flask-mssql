import os
import time
import logging
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import pyodbc

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

def get_connection_string():
    server = os.getenv("DB_SERVER", "sqlserver")
    port = os.getenv("DB_PORT", "1433")
    database = os.getenv("DB_NAME", "master")
    username = os.getenv("DB_USER", "sa")
    password = os.getenv("DB_PASSWORD") or os.getenv("MSSQL_SA_PASSWORD", "Passw0rd2026!")

    driver = "ODBC Driver 18 for SQL Server"
    
    return (
        f"DRIVER={{{driver}}};"
        f"SERVER={server},{port};"
        f"DATABASE={database};"
        f"UID={username};"
        f"PWD={password};"
        f"TrustServerCertificate=yes;"
        f"Connection Timeout=15;"
    )

def get_db_connection(retries=1, delay=2):
    """
    Attempts to connect to SQL Server with retry mechanism.
    """
    conn_str = get_connection_string()
    for attempt in range(1, retries + 1):
        try:
            return pyodbc.connect(conn_str)
        except Exception as e:
            if attempt == retries:
                raise e
            logger.warning(f"Connection attempt {attempt}/{retries} failed. Retrying in {delay}s...")
            time.sleep(delay)

@app.route("/", methods=["GET"])
def home():
    if request.args.get("format") == "json":
        return jsonify({
            "status": "online",
            "message": "CI/CD Auto Deploy Success!",
            "service": "DevOps Flask API Container",
            "db_server": os.getenv("DB_SERVER", "sqlserver"),
            "db_name": os.getenv("DB_NAME", "master"),
            "endpoints": {
                "health": "GET /api/health",
                "init_database": "GET /api/init-db",
                "get_users": "GET /api/users",
                "create_user": "POST /api/users"
            }
        }), 200
    return render_template("index.html")

@app.route("/api/health", methods=["GET"])
def health_check():
    try:
        conn = get_db_connection(retries=3, delay=1)
        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION")
        row = cursor.fetchone()
        version_info = row[0] if row else "SQL Server Connected"
        cursor.close()
        conn.close()
        return jsonify({
            "status": "healthy",
            "message": "CI/CD Auto Deploy Success!",
            "database_status": "connected",
            "sql_server_version": version_info
        }), 200
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        return jsonify({
            "status": "degraded",
            "database_status": "disconnected",
            "error": str(e)
        }), 503

@app.route("/api/init-db", methods=["GET"])
def init_db():
    try:
        conn = get_db_connection(retries=5, delay=2)
        cursor = conn.cursor()
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
            CREATE TABLE Users (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Name NVARCHAR(100) NOT NULL,
                Email NVARCHAR(100) NOT NULL,
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        """)
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "message": "Table 'Users' created successfully in SQL Server!"}), 200
    except Exception as e:
        logger.error(f"init_db error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/users", methods=["GET", "POST"])
def manage_users():
    try:
        conn = get_db_connection(retries=3, delay=1)
        cursor = conn.cursor()

        if request.method == "POST":
            data = request.get_json(force=True, silent=True) or request.form.to_dict() or {}
            name = str(data.get("name", "")).strip()
            email = str(data.get("email", "")).strip()

            if not name or not email:
                return jsonify({"error": "Both 'name' and 'email' are required"}), 400

            cursor.execute("INSERT INTO Users (Name, Email) VALUES (?, ?)", (name, email))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({"message": f"User '{name}' added successfully!"}), 201

        # GET request
        cursor.execute("SELECT ID, Name, Email, CreatedAt FROM Users ORDER BY ID DESC")
        rows = cursor.fetchall()
        users = [
            {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "created_at": str(row[3]) if len(row) > 3 and row[3] else None
            }
            for row in rows
        ]
        cursor.close()
        conn.close()
        return jsonify(users), 200

    except Exception as e:
        logger.error(f"manage_users error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
