require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const HierarchyService = require('./services/hierarchyService');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// NEW: Lookup an existing approved hierarchy
app.get('/api/hierarchies/lookup', async (req, res) => {
    try {
        const { company, location } = req.query;
        if (!company || !location) {
            return res.status(400).json({ error: 'Company and location query parameters are required' });
        }
        const result = await HierarchyService.lookupHierarchy(company, location);
        if (!result) {
            return res.status(404).json({ message: 'No approved hierarchy found for this entity.' });
        }
        res.json(result);
    } catch (error) {
        console.error('Error looking up hierarchy:', error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATED: Create the INITIAL (v0) hierarchy draft
app.post('/api/hierarchies', async (req, res) => {
  try {
    const { userInput, data, version } = req.body;
    if (!userInput || !data) {
      return res.status(400).json({ error: 'userInput and data are required' });
    }
    const result = await HierarchyService.createInitialHierarchy({ userInput, data, version });
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating initial hierarchy:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Create a new version from feedback
app.post('/api/hierarchies/:id/versions', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, userFeedback } = req.body;
        if (!data) {
            return res.status(400).json({ error: 'New hierarchy data is required' });
        }
        const result = await HierarchyService.createNewVersion({ parentId: id, data, userFeedback });
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating new version:', error);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Approve a specific version of a hierarchy
app.patch('/api/hierarchies/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await HierarchyService.approveHierarchy(id);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error approving hierarchy:', error);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Get all hierarchies grouped by company and location, with all versions
app.get('/api/hierarchies/grouped', async (req, res) => {
    try {
        const grouped = await HierarchyService.getAllHierarchiesGrouped();
        res.json(grouped);
    } catch (error) {
        console.error('Error fetching grouped hierarchies:', error);
        res.status(500).json({ error: error.message });
    }
});

// This endpoint can remain for fetching specific versions by ID if needed.
app.get('/api/hierarchies/:id', async (req, res) => {
  try {
    const hierarchy = await HierarchyService.getHierarchy(req.params.id);
    if (!hierarchy) {
      return res.status(404).json({ error: 'Hierarchy not found' });
    }
    res.json(hierarchy);
  } catch (error) {
    console.error('Error getting hierarchy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, async () => {
  try {
    await db.query('SELECT NOW()');
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
});

module.exports = app;