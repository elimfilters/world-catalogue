const express = require('express');
const cors = require('cors');
const filterRoutes = require('./src/routes/filterRoutes');
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/filters', filterRoutes);
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('🚀 Server ON'));