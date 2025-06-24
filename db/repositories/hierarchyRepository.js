const db = require('../database');

class HierarchyRepository {
    static async createMetadata({ userInput, version = 'v0', status = 'in-draft', userFeedback = null, root_hierarchy_id = null, version_number = 0 }) {
        const query = `
            INSERT INTO hierarchy_metadata (user_input, version, status, user_feedback, root_hierarchy_id, version_number, is_active_draft)
            VALUES ($1::jsonb, $2, $3, $4::jsonb, $5, $6, TRUE)
            RETURNING *
        `;
        // FIX: Ensure both userInput and userFeedback are correctly stringified JSON.
        const values = [
            JSON.stringify(userInput), 
            version, 
            status, 
            userFeedback ? JSON.stringify(userFeedback) : null, // Stringify the feedback object
            root_hierarchy_id, 
            version_number
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async createData(metadataId, data) {
        const query = `
            INSERT INTO hierarchy_data (metadata_id, data)
            VALUES ($1, $2::jsonb)
            RETURNING *
        `;
        // FIX: Ensure data is a JSON string before sending to the database.
        const values = [metadataId, JSON.stringify(data)];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async getMetadataById(id) {
        const query = 'SELECT * FROM hierarchy_metadata WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    static async getDataByMetadataId(metadataId) {
        const query = 'SELECT * FROM hierarchy_data WHERE metadata_id = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [metadataId]);
        return result.rows;
    }

    static async updateMetadata(id, updates) {
        const fields = Object.keys(updates);
        if (fields.length === 0) {
            return this.getMetadataById(id);
        }

        const setClauses = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
        const values = [id, ...Object.values(updates)];

        const query = `
            UPDATE hierarchy_metadata
            SET ${setClauses}
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async findApprovedByUserInput(company, location) {
        // This query correctly uses the ->> operator to access text fields within the JSONB column.
        const query = `
            SELECT * FROM hierarchy_metadata
            WHERE user_input->>'company' = $1
              AND user_input->>'location' = $2
              AND status = 'approved'
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const result = await db.query(query, [company, location]);
        return result.rows[0];
    }

    static async archiveHierarchyChain(rootId, currentId) {
        const query = `
            UPDATE hierarchy_metadata
            SET status = 'archived', is_active_draft = FALSE
            WHERE (root_hierarchy_id = $1 OR id = $1) AND id != $2
        `;
        await db.query(query, [rootId, currentId]);
    }

    static async getAllHierarchiesGrouped() {
        // Get all metadata, grouped by company and location, with all versions
        const query = `
            SELECT *, user_input->>'company' as company, user_input->>'location' as location
            FROM hierarchy_metadata
            ORDER BY company, location, version_number DESC
        `;
        const result = await db.query(query);
        // Group by company+location
        const grouped = {};
        for (const row of result.rows) {
            const key = `${row.company}||${row.location}`;
            if (!grouped[key]) grouped[key] = { company: row.company, location: row.location, versions: [] };
            grouped[key].versions.push(row);
        }
        return Object.values(grouped);
    }
}

module.exports = HierarchyRepository;