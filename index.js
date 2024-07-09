const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();
const multer = require('multer');
const connectToDB = require("./database/main.js");
const fileModel = require("./database/models/file.js");
const port = 5000;

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Specify the directory where files will be stored
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Keep the original file name
    }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(cors());

// Middleware for logging requests
app.use(function (req, res, next) {
    console.log(req.method + " request for '" + req.url + "'");
    next();
});

// Route to handle file upload
app.post('/upload', upload.single('file'), async function(req, res) {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }
    try {
        const existingFile = await fileModel.findOne({ name: req.file.originalname });
        if (existingFile) {
            return res.status(400).send('File already exists');
        }

        const file = new fileModel({
            name: req.file.originalname,
            size: req.file.size,
            description: req.body.description || 'No description provided',
            mime_type: req.file.mimetype,
        });

        const newFile = await file.save();
        console.log('New File Added:', newFile);
        res.status(201).json(newFile);
    } catch (error) {
        console.error('Error saving file:', error.message);
        res.status(500).send('Error saving file: ' + error.message);
    }
});
// Route to serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route to retrieve file info by ID
app.get('/retrieve/info', async function(req, res) {
    const id = req.query.id;

    try {
        const file = await fileModel.findById(id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        console.log('Retrieved File:', file);
        res.json(file);
    } catch (error) {
        console.error('Error retrieving file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to update file info by ID
app.put('/update', async function(req, res) {
    const id = req.query.id;
    try {
        const file = await fileModel.findById(id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        console.log(req.body.name);
        console.log(file.name);
        /*const existingName = await fileModel.find({ name: req.body.name });
        if (existingName) {
            return res.status(400).send('Name of file already exists');
            }*/
        suffix = ".";
        j=0; i=file.mime_type[0];
        console.log(i+" debut");
        while(i!="/"){
            j++;
            i=file.mime_type[j];
            console.log(i + " ");
        }
        console.log("2 ");
        j++;
        i=file.mime_type[j];
        while(i!=null){
            console.log(i + " ");
            suffix+=i;
            j++;
            i=file.mime_type[j];
        }
        console.log(suffix)
        const oldPath = path.join(__dirname, 'uploads', file.name);
        const newPath = path.join(__dirname, 'uploads', req.body.name+suffix);
        
        // Rename the file in local storage
        fs.rename(oldPath, newPath, async function(err) {
            if (err) {
                console.error('Error renaming file:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            // Update the file details in the database
            file.name = req.body.name+suffix;
            file.description = req.body.description;
            const updatedFile = await file.save();

            console.log('File updated:', updatedFile);
            res.json(updatedFile);
        });
    } catch (error) {
        console.error('Error updating file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to delete file by ID
app.delete('/delete', async function(req, res) {
    const id = req.query.id;
    try {
        const file = await fileModel.findByIdAndDelete(id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.join(__dirname, 'uploads', file.name);
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
                return res.status(500).json({ error: 'Error deleting file from storage' });
            }
            res.json({ message: 'File deleted successfully' });
        });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to retrieve file by ID
app.get('/retrieve/file', async function(req, res) {
    const id = req.query.id;
    try {
        const file = await fileModel.findById(id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.sendFile(path.join(__dirname, 'uploads', file.name));
        console.log('Retrieved File:', file);
        res.json(file);
    } catch (error) {
        console.error('Error retrieving file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Handle other routes
app.use(function(req, res){
    res.status(404).json("Page not found.");
});

// Ensure the database is connected before starting the server
async function start() {
    try {
        await connectToDB(process.env.DATABASE_URL);
        // Start the server
        app.listen(port, function () {
            console.log('Server is running on http://localhost:' + port);
        });
    } catch (error) {
        console.error("Error connecting to database:", error);
    }
}

start();