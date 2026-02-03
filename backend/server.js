const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for storage write access
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'campus-data';
const FILE_NAME = 'campus.json';

// Initialize Supabase client
const supabase = SUPABASE_URL && SUPABASE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// GET: Read data from Supabase storage
app.get('/api/campus', async (req, res) => {
  try {
    if (!supabase) {
      // Fallback to local file for development
      const fs = require('fs');
      const path = require('path');
      const DATA_FILE = path.join(__dirname, 'campus.json');
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return res.json(JSON.parse(data));
    }

    // Download from Supabase storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(FILE_NAME);

    if (error) {
      console.error('Supabase download error:', error);
      return res.status(500).json({ error: 'Failed to read data from storage' });
    }

    const text = await data.text();
    res.json(JSON.parse(text));
  } catch (err) {
    console.error('Error reading campus data:', err);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// POST: Write data to Supabase storage
app.post('/api/campus', async (req, res) => {
  const newData = req.body;

  // Basic validation
  if (!newData || !newData.type || !Array.isArray(newData.features)) {
    return res.status(400).json({ error: 'Invalid GeoJSON structure' });
  }

  try {
    const jsonString = JSON.stringify(newData, null, 2);

    if (!supabase) {
      // Fallback to local file for development
      const fs = require('fs');
      const path = require('path');
      const DATA_FILE = path.join(__dirname, 'campus.json');
      fs.writeFileSync(DATA_FILE, jsonString, 'utf8');
      console.log('Campus data saved locally.');
      return res.json({ success: true, message: 'Data saved locally' });
    }

    // Convert string to Buffer for Supabase upload
    const buffer = Buffer.from(jsonString, 'utf8');

    // Upload to Supabase storage (upsert)
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(FILE_NAME, buffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload error:', JSON.stringify(error, null, 2));
      return res.status(500).json({ 
        error: 'Failed to save data to storage',
        details: error.message || error,
        bucket: BUCKET_NAME,
        file: FILE_NAME
      });
    }

    console.log('Campus data saved to Supabase.');
    res.json({ success: true, message: 'Data saved to Supabase' });
  } catch (err) {
    console.error('Error saving campus data:', err);
    res.status(500).json({ error: 'Failed to save data', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  if (supabase) {
    console.log(`Connected to Supabase bucket: ${BUCKET_NAME}`);
  } else {
    console.log('Running in local mode (no Supabase credentials)');
  }
});
