const db = require('../database');

class HierarchyRepository {
    static async createMetadata({ userInput, projectName, version = 'v0', status = 'in-draft', userFeedback = null, root_hierarchy_id = null, version_number = 0 }) {
        const query = `
            INSERT INTO hierarchy_metadata (user_input, project_name, version, status, user_feedback, root_hierarchy_id, version_number, is_active_draft)
            VALUES ($1::jsonb, $2, $3, $4, $5::jsonb, $6, $7, TRUE)
            RETURNING *
        `;
        const values = [
            JSON.stringify(userInput),
            projectName, 
            version, 
            status, 
            userFeedback ? JSON.stringify(userFeedback) : null,
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
    
    static async findProjectByName(company, project, location) {
        let queryText = `
            SELECT * FROM hierarchy_metadata
            WHERE user_input->>'company' = $1
              AND project_name = $2
        `;
        const values = [company, project];

        if (location) {
            queryText += ` AND user_input->>'location' = $3`;
            values.push(location);
        } else {
            queryText += ` AND (user_input->>'location' IS NULL OR user_input->>'location' = '')`;
        }
        
        queryText += ` ORDER BY version_number DESC LIMIT 1`;
        
        const result = await db.query(queryText, values);
        return result.rows[0];
    }

    // NEW: Archives a specific in-draft project.
    static async archiveDraftProject(company, project, location) {
         let queryText = `
            UPDATE hierarchy_metadata
            SET status = 'archived', is_active_draft = FALSE
            WHERE user_input->>'company' = $1
              AND project_name = $2
              AND status = 'in-draft'
        `;
        const values = [company, project];

        if (location) {
            queryText += ` AND user_input->>'location' = $3`;
            values.push(location);
        } else {
            queryText += ` AND (user_input->>'location' IS NULL OR user_input->>'location' = '')`;
        }

        await db.query(queryText, values);
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
        const query = `
            SELECT *, user_input->>'company' as company, user_input->>'location' as location
            FROM hierarchy_metadata
            ORDER BY company, location, project_name, version_number DESC
        `;
        const result = await db.query(query);
        const grouped = {};
        for (const row of result.rows) {
            const key = `${row.company}||${row.project_name}||${row.location || 'global'}`;
            if (!grouped[key]) {
                grouped[key] = { 
                    company: row.company, 
                    location: row.location || 'Global', 
                    projectName: row.project_name, 
                    versions: [] 
                };
            }
            grouped[key].versions.push(row);
        }
        return Object.values(grouped);
    }
}

module.exports = HierarchyRepository;