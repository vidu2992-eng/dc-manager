const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONNECT TO MONGODB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ DB Error:", err));

// --- SCHEMAS ---

// 1. User Schema (New!)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// 2. Person Schema (Updated with Owner)
const PersonSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // <--- OWNERSHIP
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// 3. Transaction Schema (Updated with Owner)
const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // <--- OWNERSHIP
  personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Person = mongoose.model('Person', PersonSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

// --- MIDDLEWARE (The Gatekeeper) ---
// This checks if the user sent a valid Token
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, 'secretKey123'); // In production, use process.env.JWT_SECRET
    req.user = decoded.id; // Add user ID to the request
    next();
  } catch (e) {
    res.status(400).json({ msg: 'Token is not valid' });
  }
};

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user.id }, 'secretKey123', { expiresIn: 36000 });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User does not exist' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, 'secretKey123', { expiresIn: 36000 });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- DATA ROUTES (Protected) ---
// Note: We now use `req.user` to filter data so users only see THEIR own stuff.

app.get('/api/people', auth, async (req, res) => {
  try {
    const people = await Person.find({ userId: req.user }).sort({ createdAt: -1 });
    res.json(people);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/people', auth, async (req, res) => {
  try {
    const newPerson = new Person({ 
      name: req.body.name,
      userId: req.user // Attach the logged-in user's ID
    });
    await newPerson.save();
    res.json(newPerson);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/people/:id', auth, async (req, res) => {
  try {
    // Only delete if it belongs to the user
    await Person.findOneAndDelete({ _id: req.params.id, userId: req.user });
    await Transaction.deleteMany({ personId: req.params.id, userId: req.user });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/transactions', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user }).sort({ date: -1 });
    res.json(transactions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions', auth, async (req, res) => {
  try {
    const { personId, amount, description, type } = req.body;
    const newTx = new Transaction({ 
      personId, 
      amount, 
      description, 
      type,
      userId: req.user // Attach owner
    });
    await newTx.save();
    res.json(newTx);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));