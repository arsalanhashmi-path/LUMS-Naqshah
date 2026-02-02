const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Path to campus.json (in backend folder)
const DATA_FILE = path.join(__dirname, 'campus.json');

// GET: Read data
app.get('/api/campus', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).json({ error: 'Failed to read data' });
    }
    try {
      res.json(JSON.parse(data));
    } catch (parseErr) {
      console.error('Error parsing JSON:', parseErr);
      res.status(500).json({ error: 'Invalid JSON data' });
    }
  });
});

// POST: Write data
app.post('/api/campus', (req, res) => {
  const newData = req.body;
  
  // Basic validation to ensure we don't wipe the file with empty data
  if (!newData || !newData.type || !Array.isArray(newData.features)) {
     return res.status(400).json({ error: 'Invalid GeoJSON structure' });
  }

  const jsonString = JSON.stringify(newData, null, 2);

  fs.writeFile(DATA_FILE, jsonString, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return res.status(500).json({ error: 'Failed to save data' });
    }
    console.log('Campus data saved successfully.');
    res.json({ success: true, message: 'Data saved' });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Watching file: ${DATA_FILE}`);
});
