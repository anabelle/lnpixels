// Basic server setup
import express from 'express';
const app = express();
app.get('/', (req, res) => res.send('API Server'));
app.listen(3000, () => console.log('Server running on port 3000'));