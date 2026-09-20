import { Router } from 'express';
import { prisma } from '../prismaClient';

const router = Router();

// Crear pregunta con sus test cases
router.post('/', async (req, res) => {
  try {
    const { title, description, language, score, assessmentId, testCases } = req.body;
    const question = await prisma.question.create({
      data: {
        title,
        description,
        language,
        score,
        assessmentId,
        testCases: {
          create: testCases, // [{ input, expectedOutput }, ...]
        },
      },
      include: { testCases: true },
    });
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la pregunta' });
  }
});

// Obtener una pregunta por id
router.get('/:id', async (req, res) => {
  try {
    const question = await prisma.question.findUnique({
      where: { id: Number(req.params.id) },
      include: { testCases: true },
    });
    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la pregunta' });
  }
});

export default router;