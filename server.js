const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());



mongoose.connect('mongodb+srv://vishnusethuraman:123qwerty@data.1mtlv7v.mongodb.net/mydatabase?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error.message);
});

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  verificationCode: String, // New field for storing verification code
  securityQuestion: String,
  securityAnswer: String,
});

const User = mongoose.model('User', userSchema);

// Apply bodyParser middleware specifically for the /signup endpoint
app.post('/signup', bodyParser.json(), async (req, res) => {
  console.log('recieved signup')
  try {
    const { username, email, password, securityQuestion, securityAnswer } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      securityQuestion,    // Add security question to the user document
      securityAnswer,
      
    });

    await newUser.save();

    res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error registering user' });
  }
});

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
      // Generate and store verification code in the database
      const verificationCode = generateVerificationCode();
      user.verificationCode = verificationCode;
      await user.save();

      // Send the verification code via email (you need to implement this function)
      sendVerificationCodeByEmail(user.email, verificationCode);

      res.json({ success: true, message: 'Verification code sent' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error logging in' });
  }
});

async function sendVerificationCodeByEmail(email, verificationCode) {
  try {
    // Create a transporter using your Gmail account
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'vishnu.is21@bmsce.ac.in',
        pass: 'samplepass@123',
      },
    });

    // Define the email options
    const mailOptions = {
      from: 'vishnu.is21@bmsce.ac.in',
      to: email,
      subject: 'Verification Code',
      text: `Your verification code is: ${verificationCode}`,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

app.post('/verify', bodyParser.json(), async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    const user = await User.findOne({ email, verificationCode });

    if (user) {
      // Verification successful, redirect to success.html with username parameter
      res.json({ success: true, username: user.username });
    } else {
      res.status(401).json({ success: false, error: 'Invalid verification code' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error verifying code' });
  }
});

app.post('/checkSecurityQuestion', bodyParser.json(), async (req, res) => {
  try {
    const { email, securityAnswer } = req.body;
    const user = await User.findOne({ email });

    if (user && user.securityAnswer === securityAnswer) {
      res.json({ success: true, username: user.username });
    } else {
      res.status(401).json({ success: false, error: 'Incorrect security question answer' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error checking security question' });
  }
});  

app.get('/getSecurityQuestion', async (req, res) => {
  try {
    const { email } = req.query;
    const user = await User.findOne({ email });

    if (user) {
      res.json({ success: true, question: user.securityQuestion });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error fetching security question' });
  }
});





app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
