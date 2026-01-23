import express from 'express';
import path from 'path';

const app = express();

// Serve static files from dist directory (Vite build output)
const distPath = path.resolve(process.cwd(), 'dist');

console.log(`[SERVER] Starting static file server...`);
console.log(`[SERVER] Serving files from: ${distPath}`);

app.use(express.static(distPath));

// Catch-all handler for SPA routing (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

app.listen(parseInt(PORT as string), HOST, () => {
  console.log(`✅ Frontend server running on ${HOST}:${PORT}`);
  console.log(`📦 Serving static files from: ${distPath}`);
});
