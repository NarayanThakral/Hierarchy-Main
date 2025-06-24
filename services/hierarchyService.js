// In services/hierarchyService.js

const HierarchyRepository = require('../db/repositories/hierarchyRepository');

class HierarchyService {
    static async createInitialHierarchy({ userInput, data }) {
        if (!userInput || !userInput.company || !userInput.location) {
            throw new Error('Company and location are required in userInput');
        }
        if (!data) {
            throw new Error('Data is required');
        }

        try {
            // Create v0 metadata
            const metadata = await HierarchyRepository.createMetadata({
                userInput,
                status: 'in-draft',
                version: 'v0', // Explicitly set version label
                version_number: 0, // This is correct
            });

            const dataEntry = await HierarchyRepository.createData(metadata.id, data);

            return { metadata, data: dataEntry };
        } catch (error) {
            console.error('Error in createInitialHierarchy:', error);
            throw error;
        }
    }

    static async createNewVersion({ parentId, data, userFeedback }) {
        const parentMetadata = await HierarchyRepository.getMetadataById(parentId);
        if (!parentMetadata) {
            throw new Error('Parent hierarchy not found');
        }

        // Deactivate the old draft
        await HierarchyRepository.updateMetadata(parentId, { is_active_draft: false });

        const root_hierarchy_id = parentMetadata.root_hierarchy_id || parentMetadata.id;
        const version_number = parentMetadata.version_number + 1;
        const version = `v${version_number}`; // Set version label dynamically

        const newMetadata = await HierarchyRepository.createMetadata({
            userInput: parentMetadata.user_input,
            status: 'in-draft',
            version, // Pass the correct version label
            // FIX: Pass feedback as a structured object
            userFeedback: userFeedback ? { text: userFeedback } : null,
            root_hierarchy_id,
            version_number,
        });

        const newData = await HierarchyRepository.createData(newMetadata.id, data);

        return { metadata: newMetadata, data: newData };
    }

    static async approveHierarchy(id) {
        const metadataToApprove = await HierarchyRepository.getMetadataById(id);
        if (!metadataToApprove) {
            throw new Error('Hierarchy to approve not found');
        }

        const rootId = metadataToApprove.root_hierarchy_id || metadataToApprove.id;

        // Archive all other versions in the chain
        await HierarchyRepository.archiveHierarchyChain(rootId, id);

        // Approve the target version
        const approvedMetadata = await HierarchyRepository.updateMetadata(id, {
            status: 'approved',
            is_active_draft: false,
        });

        return approvedMetadata;
    }

    static async lookupHierarchy(company, location) {
        const metadata = await HierarchyRepository.findApprovedByUserInput(company, location);
        if (!metadata) {
            return null;
        }
        const data = await HierarchyRepository.getDataByMetadataId(metadata.id);
        return { metadata, data: data[0] }; // Return the most recent data entry
    }

    // This is a helper for getting a specific version, used by the frontend if needed
    static async getHierarchy(metadataId) {
        const metadata = await HierarchyRepository.getMetadataById(metadataId);
        if (!metadata) {
            throw new Error('Hierarchy not found');
        }
        const data = await HierarchyRepository.getDataByMetadataId(metadataId);
        return { metadata, data };
    }

    static async getAllHierarchiesGrouped() {
        return await HierarchyRepository.getAllHierarchiesGrouped();
    }
}

module.exports = HierarchyService;