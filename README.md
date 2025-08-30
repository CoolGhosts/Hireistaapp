# Hireista — AI-Assisted Job Search

[![CI](https://github.com/CoolGhosts/Hireistaapp/actions/workflows/ci.yml/badge.svg)](https://github.com/CoolGhosts/Hireistaapp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/CoolGhosts/Hireistaapp/actions/workflows/codeql.yml/badge.svg)](https://github.com/CoolGhosts/Hireistaapp/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A mobile-first job discovery app built with **React Native (Expo)**, a **FastAPI + Supabase** backend, and a **Flask microservice** for resume & job description parsing.

---

## ✨ Features

- 📱 **Mobile App (Expo/React Native)** — browse, save, and apply for roles  
- ⚙️ **API (FastAPI + Supabase)** — authentication, job data, profiles  
- 📄 **Text Extraction Service (Flask)** — parse resumes & job descriptions from PDF/DOCX  
- 🧠 **AI helpers** — job description summarization, fit/match hints  
- 🔒 **Secure design** — environment-based secrets, no keys in repo  

---

## 🏗️ Architecture

/Jobbify # Expo mobile client
/job-api # FastAPI backend (Supabase integration)
/file_text_backend # Flask microservice for text extraction

yaml
Copy code

**Flow:**  
Mobile App → FastAPI API (Supabase DB) → Flask service (resume/JD parsing)

---

## 🚀 Quickstart

### 1. Clone the repo
```bash
git clone https://github.com/CoolGhosts/Hireistaapp.git
cd Hireistaapp
2. Configure environment variables
Each service has a sample env file. Copy and fill in your own keys (from Supabase, OpenAI/OpenRouter, etc.):

bash
Copy code
cp Jobbify/.env.example Jobbify/.env
cp job-api/.env.example job-api/.env
cp file_text_backend/.env.example file_text_backend/.env
3. Run services
FastAPI backend

bash
Copy code
cd job-api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
Flask text extraction

bash
Copy code
cd file_text_backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python extract_text_api.py
Expo mobile app

bash
Copy code
cd Jobbify
npm install
npm start
🧪 Testing
FastAPI API

bash
Copy code
cd job-api
pytest -q
Mobile (Expo)

bash
Copy code
cd Jobbify
npm test -- --ci --watchAll=false
📦 Docker (optional)
One-command startup with Docker Compose:

bash
Copy code
docker compose up --build
This spins up FastAPI + Flask services; run Expo separately with npm start.

📸 Screenshots / Demo
Add a short GIF or screenshots here to wow recruiters.
Example: put demo.gif inside /docs/ and embed with:

markdown
Copy code
![Demo](docs/demo.gif)
🛡️ Security
No secrets are committed (see .gitignore)

Config via .env files; samples provided as .env.example

See SECURITY.md for reporting vulnerabilities

🗺️ Roadmap
Push notifications for new jobs

Saved searches & alerts

Personalized job recommendations

🧰 Tech Stack
Frontend: Expo / React Native

Backend API: FastAPI + Supabase

Microservice: Flask (resume parsing, PDF/DOCX)

AI: OpenRouter / OpenAI API for summarization & matching

Infra: Docker, GitHub Actions CI, CodeQL security scanning

🤝 Contributing
Pull requests welcome! See CONTRIBUTING.md.

📜 License
MIT © 2025 CoolGhosts
