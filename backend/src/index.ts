import fs from 'fs';
import path from 'path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

import { authenticate, checkJwtSecret, requireRole } from './auth';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import assessmentsRouter from './routes/assessments';
import questionsRouter from './routes/questions';
import submissionsRouter from './routes/submissions';
import { prepareRunners } from './executor';
import { prisma } from './prismaClient';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

if (process.env.NODE_ENV !== 'production') {
  const spec = YAML.parse(fs.readFileSync(path.resolve(__dirname, '../openapi.yaml'), 'utf8'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { swaggerOptions: { persistAuthorization: true } }));
}

app.get('/', (_req, res) => {
  res.json({ status: 'API corriendo correctamente' });
});

app.use('/auth', authRouter);
app.use('/users', authenticate, requireRole('ADMIN'), usersRouter);
app.use('/assessments', authenticate, assessmentsRouter);
app.use('/questions', authenticate, questionsRouter);
app.use('/submissions', authenticate, submissionsRouter);

// errores como JSON en vez del HTML por defecto
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

(async () => {
  checkJwtSecret();
  if ((await prisma.user.count()) === 0) {
    console.warn('No hay usuarios. Crea el primero con: npm run create-user -- --email correo@dominio.com --role ADMIN');
  }
})()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      prepareRunners();
    });
  })
  .catch((err) => {
    console.error('No se pudo iniciar el servidor:', err);
    process.exit(1);
  });
