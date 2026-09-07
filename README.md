# DevOps Project: Flask + Microsoft SQL Server + React Native

This repository contains a full-stack containerized DevOps architecture with:
- **Database**: Microsoft SQL Server (MSSQL 2022) with direct SSMS connection support
- **Backend**: Python 3.11 Flask REST API with automatic schema migrations & health monitoring
- **Frontend**: Cross-platform React Native client
- **Orchestration**: `docker-compose.yml`

---

## 📁 Project Structure

```text
devops project/
├── backend/
│   ├── app.py              # Flask API with MSSQL connection & CRUD
│   ├── Dockerfile          # Backend container image definition
│   └── requirements.txt    # Python dependencies (Flask, SQLAlchemy, pymssql, pyodbc)
├── frontend/
│   ├── App.js              # React Native UI (Dark Mode + Live Status)
│   ├── app.json            # Expo configuration
│   └── package.json        # React Native dependencies
├── .env                    # Environment variables
├── .env.example            # Environment template
├── .gitignore
├── docker-compose.yml      # Orchestration for MSSQL + Flask
└── README.md
```

---

## 🚀 Quick Start with Docker Compose

### 1. Start Services
Run the following command in the project root:

```bash
docker compose up --build -d
```

### 2. Check Status
```bash
docker compose ps
```

### 3. View Logs
```bash
docker compose logs -f backend
```

---

## 🗄️ Connecting with SQL Server Management Studio (SSMS)

You can connect directly to the SQL Server container from your Windows machine using SSMS:

| Setting | Value |
| :--- | :--- |
| **Server Name** | `localhost,1433` (or `127.0.0.1,1433`) |
| **Authentication** | `SQL Server Authentication` |
| **Login** | `sa` |
| **Password** | `DevOps@Passw0rd2026!` |
| **Trust Server Certificate** | Checked / Enabled |

The application automatically creates the database **`devops_db`** and the table **`tasks`**.

---

## 🌐 Backend API Endpoints

- **Root info & endpoints**: `GET http://localhost:5000/`
- **Health check**: `GET http://localhost:5000/api/health`
- **List tasks**: `GET http://localhost:5000/api/tasks`
- **Create task**: `POST http://localhost:5000/api/tasks`
  ```json
  {
    "title": "First Task",
    "description": "DevOps setup testing"
  }
  ```
- **Delete task**: `DELETE http://localhost:5000/api/tasks/<id>`

---

## 📱 Running React Native Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Expo development server:
   ```bash
   npx expo start
   ```

3. Press `w` to open in browser, or scan the QR code with **Expo Go** on your mobile device.
