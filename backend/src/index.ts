import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import assessmentsRouter from './routes/assessments';
import questionsRouter from './routes/questions';
import submissionsRouter from './routes/submissions';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/assessments', assessmentsRouter);
app.use('/questions', questionsRouter);
app.use('/submissions', submissionsRouter);

app.get('/', (req, res) => {
  res.json({ status: 'API corriendo correctamente' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});