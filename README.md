#  FlowEngine — Workflow Automation Platform

##  Demo Video
[Watch Demo](https://drive.google.com/file/d/14u3Y0CB8z1uNkj_tlUk5qymEGeiHcTRg/view?usp=sharing)

##  Deployment
- **Live App:** https://singular-crostata-01f545.netlify.app
- **Backend API:** https://flowengine-backend.onrender.com
- **GitHub:** https://github.com/JannathBarveenR/flowengine

##  Quick Start

### Backend
- cd backend
- npm install
- node src/config/migrate.js
- node src/config/seed.js
- npm run dev

### Frontend
- cd frontend
- npm install
- npm start

##  Tech Stack
- Backend: Node.js, Express, SQLite
- Frontend: React 18, Zustand
- Rule Engine: Dynamic condition evaluation

## Features
- Full CRUD for Workflows, Steps, Rules
- Dynamic Rule Engine with priority evaluation
- Workflow versioning
- Execution with detailed logs
- Cancel and Retry executions
- Audit Log
- Visual Flow Diagram
- Rule Condition Tester

##  Sample Workflows

### 1. Expense Approval
- Input: amount, country, department, priority
- Path: Manager Approval → Finance Notification → CEO Approval → Task Completion

### 2. Employee Onboarding
- Input: employee_name, department, role
- Path: HR Notification → Account Setup → Manager Intro

### 3. Leave Approval
- Input: employee_name, leave_days, leave_type, department
- Path: HR Review → Manager Approval → Leave Approved/Rejected
```
Check:
```
https://github.com/JannathBarveenR/flowengine
