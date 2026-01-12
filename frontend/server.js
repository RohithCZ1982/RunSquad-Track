const express = require('express');
const path = require('path');
const app = express();

// Trust proxy (important for Render)
app.set('trust proxy', 1);

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build'), {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// Handle React routing - return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});

const port = process.env.PORT || 3000;
const host = '0.0.0.0'; // Listen on all interfaces

app.listen(port, host, () => {
  console.log(`Frontend server running on ${host}:${port}`);
  console.log(`Serving static files from: ${path.join(__dirname, 'build')}`);
});
