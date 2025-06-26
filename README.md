# Hierarchy Management System

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Dependencies:** `pg` for database connection, `cors`, `body-parser`, `dotenv`
- **Frontend:** HTML, CSS, JavaScript (no framework)

## Getting Started

Follow these steps to get the project running on your local machine.

### Prerequisites

- Node.js and npm
- A running PostgreSQL instance

### Setup Instructions

1. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your PostgreSQL connection details. You can use the `.gitignore` file as a reference for which variables to include. Example:
   ```
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=hierarchy_db
   DB_PASSWORD=your_password
   DB_PORT=5432
   ```

2. **Install Dependencies:**
   Open your terminal in the project root and run:
   ```bash
   npm install
   ```

3. **Set Up the Database:**
   Make sure your PostgreSQL server is running. Then, run the following command to create the necessary tables and functions. Replace `postgres` and `hierarchy_db` if you used different values in your `.env` file.
   ```bash
   psql -U postgres -d hierarchy_db -f db/migrations/001_initial_schema.sql
   ```

4. **Run the Development Server:**
   Start the backend server with `nodemon`, which will automatically restart on file changes.
   ```bash
   npm run dev
   ```

5. **Launch the Frontend:**
   Open the `hierarchy_testing.html` file in your browser. Using an extension like "Live Server" for VS Code is recommended.

## API Endpoints

The following are the primary API endpoints available.

| Method | Endpoint                       | Description                                                               |
|--------|--------------------------------|---------------------------------------------------------------------------|
| `POST` | `/api/hierarchies`             | Creates a new hierarchy. Expects `userInput`, `data`, and optionally `userFeedback` and `status` in the body. |
| `GET`  | `/api/hierarchies`             | Lists all hierarchies with pagination. Supports `status` and `version` filters. |
| `GET`  | `/api/hierarchies/:id`         | Retrieves a single hierarchy and its associated data by its metadata ID. |
| `POST` | `/api/hierarchies/:id/data`    | Adds a new data JSON to an existing hierarchy.                             |
| `PATCH`| `/api/hierarchies/:id/status`  | Updates the status of a hierarchy (e.g., from "in-draft" to "approved").   |
| `GET`  | `/health`                      | A health check endpoint to verify that the server is running.             |

## Recent Updates Changelog

- **Feature: Correct Status on Approval**
  - The system now correctly saves hierarchies with an `"approved"` status when the "Approve" button is used in the UI.

- **Feature: User Feedback Persistence**
  - User feedback provided during the refinement process is now successfully captured and stored in the database upon approval.