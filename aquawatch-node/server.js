const express = require('express');
const path = require('path');
const { PythonShell } = require('python-shell');
const app = express();
const http = require('http').createServer(app);

const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- STATE ----------
let currentData = {
  temperature: 25.0,
  ph: 7.0,
  turbidity: 2.0,
  dissolved_o2: 8.0,
};
let history = [];

// ---------- PREDICTION ROUTE ----------
app.post('/predict', async (req, res) => {
  const { temperature, ph, turbidity, dissolved_oxygen, risks } = req.body;
  if ([temperature, ph, turbidity, dissolved_oxygen].some(v => v === undefined)) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  // Update current data
  currentData.temperature = parseFloat(temperature);
  currentData.ph = parseFloat(ph);
  currentData.turbidity = parseFloat(turbidity);
  currentData.dissolved_o2 = parseFloat(dissolved_oxygen);

  try {
    // Call Python script with args: temp, DO, pH, turb
    const options = {
      scriptPath: __dirname,
      args: [temperature, dissolved_oxygen, ph, turbidity]
    };
    const result = await PythonShell.run('predict.py', options);
    const output = JSON.parse(result[0]);
    if (output.error) {
      return res.status(500).json({ error: output.error });
    }

    // Save to history
    history.push({
      timestamp: new Date(),
      temperature: currentData.temperature,
      ph: currentData.ph,
      turbidity: currentData.turbidity,
      dissolved_o2: currentData.dissolved_o2,
      status: output.status,
      confidence: output.confidence,
      risks: risks || {},
    });
    if (history.length > 50) history.shift();

    res.json({
      prediction: output,
      current: currentData,
      history: history.slice(-10),
    });
  } catch (err) {
    console.error('Prediction error:', err);
    res.status(500).json({ error: 'Prediction service failed' });
  }
});

// ---------- ROUTES ----------
app.get('/', (req, res) => {
  res.render('index', {
    current: currentData,
    history: history.slice(-10),
  });
});

app.get('/api/history', (req, res) => res.json(history));

// ---------- START ----------
http.listen(PORT, () => {
  console.log(`💧 AquaWatch Predictor running at http://localhost:${PORT}`);
});