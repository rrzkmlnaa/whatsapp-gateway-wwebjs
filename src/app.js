const express = require('express');
const { loadClients } = require('./clients/clientManager');
const routes = require('./routes');
const responseFormatter = require('./middleware/responseFormatter');
const app = express();
const cors = require('cors');

// Load all registered clients on server startup
loadClients();

// Enable CORS for all routes
app.use(cors());

// Middlewares
app.use(responseFormatter);

// Middleware to parse JSON bodies
app.use(express.json());

// Use routes defined in /src/routes/index.js
app.use('/api', routes); // Routes will be prefixed with /api

app.listen(3000, () => {
  console.log('WhatsApp API Gateway running at http://localhost:3000/api');
});
