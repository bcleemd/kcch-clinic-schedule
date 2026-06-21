import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware for parsing JSON requests
app.use(express.json());

// API: List JSON files starting with 'clinic-schedule' in current directory
app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync(__dirname);
    const jsonFiles = files
      .filter(f => f.startsWith('clinic-schedule') && f.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a));
    res.json({ success: true, files: jsonFiles, currentDir: path.basename(__dirname) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Load specific JSON file
app.get('/api/load', (req, res) => {
  const fileName = req.query.file;
  if (!fileName || !fileName.startsWith('clinic-schedule') || !fileName.endsWith('.json')) {
    return res.status(400).json({ success: false, error: 'Invalid file name.' });
  }
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'File not found.' });
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, data: JSON.parse(data) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Save JSON data to file (Dual-Save: clinic-schedule.json & YYYYMM backup)
app.post('/api/save', (req, res) => {
  const { fileName, data } = req.body;
  if (!fileName || !fileName.startsWith('clinic-schedule') || !fileName.endsWith('.json')) {
    return res.status(400).json({ success: false, error: 'Invalid file name.' });
  }
  
  try {
    const defaultFileName = 'clinic-schedule.json';
    let backupFileName = '';

    if (data && data.schedule_info) {
      const year = data.schedule_info.year || new Date().getFullYear();
      const month = String(data.schedule_info.month || (new Date().getMonth() + 1)).padStart(2, '0');
      backupFileName = `clinic-schedule-${year}${month}.json`;
    } else {
      backupFileName = fileName === defaultFileName ? 'clinic-schedule-backup.json' : fileName;
    }

    // Always dual-save to both clinic-schedule.json and the backup file
    const defaultPath = path.join(__dirname, defaultFileName);
    const backupPath = path.join(__dirname, backupFileName);

    fs.writeFileSync(defaultPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf-8');

    res.json({ success: true, savedFiles: [defaultFileName, backupFileName] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Deploy clinic-schedule.json directly to GitHub repo using gh API
app.post('/api/deploy', (req, res) => {
  const { fileName } = req.body;
  if (!fileName || !fileName.startsWith('clinic-schedule') || !fileName.endsWith('.json')) {
    return res.status(400).json({ success: false, error: 'Invalid file name.' });
  }
  
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'File not found.' });
  }

  const owner = 'bcleemd';
  const repo = 'kcch-clinic-schedule';
  const githubPath = 'clinic-schedule.json';

  // 1. Get existing file SHA from GitHub (required for PUT updates)
  exec(`gh api repos/${owner}/${repo}/contents/${githubPath}`, (err, stdout, stderr) => {
    let sha = '';
    if (!err) {
      try {
        const fileInfo = JSON.parse(stdout);
        sha = fileInfo.sha;
      } catch (e) {
        // File might not exist yet, sha remains empty
      }
    }

    // 2. Read local file and encode to base64
    const content = fs.readFileSync(filePath, 'base64');

    // 3. Update file via gh api PUT
    let ghCmd = `gh api --method PUT repos/${owner}/${repo}/contents/${githubPath} \
      -f message="chore: update ${githubPath} data" \
      -f content="${content}"`;
    if (sha) {
      ghCmd += ` -f sha="${sha}"`;
    }

    exec(ghCmd, (putErr, putStdout, putStderr) => {
      if (putErr) {
        console.error(`GitHub deploy error: ${putErr.message}`);
        return res.status(500).json({ success: false, error: putErr.message });
      }
      res.json({ success: true, stdout: putStdout });
    });
  });
});

// Editor routes: serve src files
app.get('/editor_home', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'editor.html'));
});
app.get('/editor-style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'editor-style.css'));
});
app.get('/editor-script.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'editor-script.js'));
});

// Viewer routes: serve index static files
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('index.html has not been generated yet. Please run HTML build in the editor.');
    }
  });
});
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));
app.get('/clinic-schedule.json', (req, res) => res.sendFile(path.join(__dirname, 'clinic-schedule.json')));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`  Viewer:  http://localhost:${PORT}/`);
  console.log(`  Editor:  http://localhost:${PORT}/editor_home`);
});

