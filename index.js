const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');

const app = express();

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: true,
    saveUninitialized: true
}));

const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const userEmail = req.body.email;

        if (!userEmail) {
            return cb(new Error('User email is required.'));
        }

        let uploadPath;

        const isDynamicField = file.fieldname.startsWith('dynamicField');
        if (isDynamicField) {
            const dynamicFieldIndex = parseInt(file.fieldname.replace('dynamicField', ''), 10);
            if (dynamicFieldIndex === 1) {
                uploadPath = path.join(__dirname, 'uploads', 'postgraduation');
            } else {
                const fieldFolderName = `field${dynamicFieldIndex - 1}`;
                uploadPath = path.join(__dirname, 'uploads', userEmail, fieldFolderName);
            }
        } else {
            uploadPath = path.join(__dirname, 'uploads', userEmail);
        }

        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

mongoose.connect("mongodb://localhost:27017/Database", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to database");
}).catch(error => {
    console.error("Error connecting to database:", error);
    process.exit(1);
});

const userSchema = new mongoose.Schema({
    postgraduationtable: String,
    prevcompanies: String,
    firstname: String,
    lastname: String,
    fathername: String,
    mothername: String,
    DOB: String,
    sex: String,
    Address: String,
    email: String,
    resume: String,
    marksheet10: String,
    yop10: String,
    markType1: String,
    grade1: String,
    percentage1: Number,
    diplommarksheet: String,
    diplomanod: String,
    diplomayop: String,
    markType2: String,
    grade2: String,
    percentage2: String,
    marksheet12: String,
    yop12: String,
    markType3: String,
    grade3: String,
    percentage3: String,
    graduationmarksheet: String,
    graduationnod: String,
    graduationyop: String,
    markType4: String,
    grade4: String,
    percentage4: String,
    aadharcard: String,
    aadharcardnum: String,
    pancard: String,
    pcardnum: String,
    passportnum: String,
    passportexpiry: String,
    workingcompany: String,
    noticeperiod: String,
    ctc: String,
});

const User = mongoose.model('User', userSchema);

const postgraduationtableSchema = new mongoose.Schema({
    email: String,
    postgraduationNumber: Number,
    dynamicFieldName: String,
    dynamicFieldValue: String,
    markType5: String,
    grade5: String,
    percentage5: String,
    postgraduationmarksheet: String,
});

const postgraduationtable = mongoose.model('postgraduationtable', postgraduationtableSchema);

const prevcompaniesSchema = new mongoose.Schema({
    email: String,
    companyname: String,
    companyrole: String,
    startdate: String,
    enddate: String,
});

const prevcompanies = mongoose.model('prevcompanies', prevcompaniesSchema);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

server.on('error', (error) => {
    console.error("Server error:", error);
});

app.post("/sign_up", upload.any(), async (req, res) => {
    console.log("Uploaded Files:", req.files);

    try {
        const companyCount = parseInt(req.body.companyCount, 10);

        const { 
            firstname,
            lastname,
            fathername,
            mothername,
            DOB,
            sex,
            Address,
            email,
            yop10,
            markType1,
            grade1,
            percentage1,
            diplomanod,
            diplomayop,
            markType2,
            grade2,
            percentage2,
            yop12,
            markType3,
            grade3,
            percentage3,
            gradeType,
            graduationnod,
            graduationyop,
            markType4,
            grade4,
            percentage4,
            aadharcardnum,
            pancard,
            pcardnum,
            passportnum,
            passportexpiry,
            workingcompany,
            noticeperiod,
            ctc,
        } = req.body;

        const postGraduationFields = [];
        const prevCompaniesFields = [];

        const mandatoryFileFields = ['resume', 'marksheet10', 'marksheet12', 'graduationmarksheet', 'aadharcard', 'pancard'];
        for (const field of mandatoryFileFields) {
            const file = req.files.find(f => f.fieldname === field);
            if (!file) {
                return res.status(400).send(`${field} file is required.`);
            }
            const fileBase64 = await fs.readFile(file.path, { encoding: 'base64' });
            req.body[field] = fileBase64;
        }

        const optionalFileFields = ['diplommarksheet'];
        for (const field of optionalFileFields) {
            const file = req.files.find(f => f.fieldname === field);
            if (file) {
                const fileBase64 = await fs.readFile(file.path, { encoding: 'base64' });
                req.body[field] = fileBase64;
            }
        }

        const dynamicFiles = req.files.filter(file => file.fieldname.startsWith('dynamicField'));
        for (let i = 0; i < dynamicFiles.length; i++) {
            const file = dynamicFiles[i];
            const imageURL = `/uploads/${file.filename}`;
            const imageBase64 = await fs.readFile(file.path, { encoding: 'base64' });

            const dynamicFieldName = req.body[`dynamicFieldName${i + 1}`] || null;
            const dynamicFieldValue = req.body[`dynamicFieldValue${i + 1}`] || null;
            const markType = req.body[`markType5${i + 1}`]= null;
            let markValue = null;

            if (markType === 'cgpa') {
                markValue = req.body[`grade5${i + 1}`].trim(); // Remove leading/trailing spaces
                markValue = markValue === '' ? null : markValue; // If empty, set to null
            } else if (markType === 'percentage') {
                markValue = req.body[`percentage5${i+ 1}`].trim(); // Remove leading/trailing spaces
                markValue = markValue === '' ? null : markValue; // If empty, set to null
            }

            // Save the data to the pgtable collection
            const newpostgraduationtableData = new postgraduationtable({
                email,
                postgraduationNumber: i + 1,
                postgraduationmarksheet: imageURL,
                dynamicFieldName,
                dynamicFieldValue,
                markType5: markType,
                grade5: (markType === 'cgpa') ? markValue : null, // Only store grade if markType is 'cgpa'
                percentage5: (markType === 'percentage') ? markValue : null, // Only store percentage if markType is 'percentage'
                imageBase64
            });

            const savedpostgraduationtableData = await newpostgraduationtableData.save();
            console.log("pgtable data saved successfully:", savedpostgraduationtableData);
            postGraduationFields.push(savedpostgraduationtableData._id);
        }

        for (let i = 1; i <= companyCount; i++) {
            const companyname = req.body[`companyname${i}`];
            const companyrole = req.body[`companyrole${i}`];
            const startdate = req.body[`startdate${i}`];
            const enddate = req.body[`enddate${i}`];

            if (!companyname || !companyrole || !startdate || !enddate) {
                return res.status(400).send("All company fields are required.");
            }

            const newPrevCompaniesData = new prevcompanies({
                email,
                companyname,
                companyrole,
                startdate,
                enddate,
            });

            const savedPrevCompaniesData = await newPrevCompaniesData.save();
            prevCompaniesFields.push(savedPrevCompaniesData._id.toString());
        }

        const postgraduationtableString = postGraduationFields.join(',');
        const prevCompaniesString = prevCompaniesFields.join(',');

        const newUser = new User({
            postgraduationtable: postgraduationtableString,
            prevcompanies: prevCompaniesString,
            firstname,
            lastname,
            fathername,
            mothername,
            DOB,
            sex,
            Address,
            email,
            resume: req.body.resume,
            marksheet10: req.body.marksheet10,
            yop10,
            markType1,
            grade1,
            percentage1,
            diplommarksheet: req.body.diplommarksheet || "",
            diplomanod,
            diplomayop,
            markType2,
            grade2,
            percentage2,
            marksheet12: req.body.marksheet12,
            yop12,
            markType3,
            grade3,
            percentage3,
            gradeType,
            graduationmarksheet: req.body.graduationmarksheet,
            graduationnod,
            graduationyop,
            markType4,
            grade4,
            percentage4,
            aadharcard: req.body.aadharcard,
            aadharcardnum,
            pancard: pancard || "", // Define pancard here
            pcardnum,
            passportnum,
            passportexpiry,
            workingcompany,
            noticeperiod,
            ctc,
        });

        const savedUser = await newUser.save();
        console.log("User saved successfully:", savedUser);

        return res.redirect('home.html');
    } catch (error) {
        console.error("Error saving data:", error);
        return res.status(500).send("Error saving data");
    }
});

// Predefined admin credentials
const predefinedAdminUsername = 'admin';
const predefinedAdminPassword = '123';

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if the provided credentials match the predefined admin credentials
        if (username === predefinedAdminUsername && password === predefinedAdminPassword) {
            req.session.admin = true;
            return res.redirect('/dashboard'); // Redirect to dashboard on successful login
        } else {
            throw new Error('Invalid username or password');
        }
    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(401).send('Invalid username or password');
    }
});

// Check if admin is logged in
function isAdminLoggedIn(req, res, next) {
    if (req.session.admin) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Serve admin dashboard
app.get('/dashboard', isAdminLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public','frontend', 'admin', 'dashboard.html'));
});


// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..','public','frontend', 'admin', 'login.html'));
});




app.get('/users', async (req, res) => {
    try {
        const users = await User.find(); // Assuming User is your Mongoose model
        const usersWithImages = users.map(user => {
            // Fetch the Aadhar Card and PAN Card image data from the user document
            const aadharcard = user.aadharcard;
            const pancard = user.pancard;

            return {
                ...user.toObject(),
                // Convert the Aadhar Card and PAN Card image data Buffers to Base64 strings
                aadharcard: aadharcard ? aadharcard.toString('base64') : null,
                pancard: pancard ? pancard.toString('base64') : null
            };
        });
        res.json(usersWithImages); // Send the response with user data, including the Base64 image data
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Server-side route to handle user editing by email
app.put('/editUserByEmail/:email', isAdminLoggedIn, async (req, res) => {
    const email = req.params.email;
    const newData = req.body;

    try {
        // Find the user by email and update in the database
        const updatedUser = await User.findOneAndUpdate({ email }, newData, { new: true });
        if (!updatedUser) {
            return res.status(404).send('User not found');
        }
        // Send the updated user data as response
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Server-side route to handle user deletion by email
app.delete('/deleteUserByEmail/:email', isAdminLoggedIn, async (req, res) => {
    const email = req.params.email;

    try {
        // Find the user by email and delete from the database
        const deletedUser = await User.findOneAndDelete({ email });
        if (!deletedUser) {
            return
            res.status(404).send('User not found');
        }
        // Send a success response
        res.status(200).send('User deleted successfully');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Internal Server Error');
    }
});

