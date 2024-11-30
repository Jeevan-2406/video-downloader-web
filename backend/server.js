const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const downloadsFolder = path.join(os.homedir(), 'Downloads');

// API Endpoint for Video Download with Progress
app.get('/download', (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send({ error: 'No URL provided!' });
    }

    // Inform the client that the response will be an event stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    const command = `yt-dlp`;
    const args = [
        '-o', `${path.join(downloadsFolder, '%(title)s.%(ext)s')}`,
        '--newline', // Output each line as a new line for easier parsing
        url,
    ];

    const process = spawn(command, args);

    process.stdout.on('data', (data) => {
        const output = data.toString();

        // Extract progress information from yt-dlp output
        const progressMatch = output.match(/(\d+\.\d+)%/);
        if (progressMatch) {
            const progress = parseFloat(progressMatch[1]);
            console.log(`Progress: ${progress}%`);

            // Send progress updates to the client
            res.write(`data: ${progress}\n\n`);
        }
    });

    process.stderr.on('data', (data) => {
        console.error(data.toString());
    });

    process.on('close', (code) => {
        if (code === 0) {
            console.log('Download complete');
            res.write(`data: complete\n\n`);
            res.end();
        } else {
            console.error('Download failed');
            res.write(`data: error\n\n`);
            res.end();
        }
    });
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
