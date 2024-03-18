const express = require('express');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const { MongoClient } = require('mongodb');
const path = require('path');
const hbs = require('hbs');
const templatepath = path.join(__dirname, '../templates');
const app = express();


app.use(express.json());
app.set("view engine", "hbs");
app.set("views", templatepath);
app.use(express.urlencoded({ extended: false }));

function generateOTP() {
  return randomstring.generate({
    length: 6,
    charset: 'numeric'
  });
}

async function sendOTP(email, otp) {

  let transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'johan.mosciski18@ethereal.email',
        pass: 'GRaFgsh65Zt1ynjnvd'
    }
});

 
  const mailOptions = {
    from: 'your_email@gmail.com',
    to: email,
    subject: 'OTP Verification',
    text: `Your OTP for verification is: ${otp}`
  };

  let info = await transporter.sendMail(mailOptions);
  console.log('Message sent: %s', info.messageId);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
}

async function connectToDB() {
  const mongoURL = 'mongodb://localhost:27017';
  const dbName = 'otp_database';
  const collectionName = 'otps';

  try {
    const client = new MongoClient(mongoURL);
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db(dbName).collection(collectionName);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

app.get('/requestotp',(req,resp)=>{
  resp.render('requestotp');
})


app.post('/requestotp', async (req, res) => {
  const email = req.body.email;
  const otp = generateOTP();
  const timestamp = Date.now();
  const collection = await connectToDB();

  await collection.insertOne({ email, otp, timestamp });

  await sendOTP(email, otp);
  console.log({ message: 'OTP sent successfully' });

  res.render('verifyotp');
});

app.post('/verifyotp', async (req, res) => {
  const { email, otp } = req.body;
  const collection = await connectToDB();

  const storedOTP = await collection.findOne({ email });

  if (!storedOTP) {
    return res.json({ verified: false, message: 'OTP not found or expired' });
  }

  if (storedOTP.otp === otp && (Date.now() - storedOTP.timestamp) <= (24 * 60 * 60 * 1000)) {

    await collection.deleteOne({ email });
    res.render('reopen');
  } else {
    res.json({ verified: false, message: 'Invalid OTP or expired' });
  }
});


app.listen(5000, () => {
  console.log('Server is running');
});
