import { Router } from 'express';
import { prisma } from '../prismaClient';
import { SUPPORTED_LANGUAGES } from '../executor';

const router = Router();

interface QuestionInput {
  title: string;
  description: string;
  language: string; // lenguajes permitidos separados por coma: "javascript,python"
  score: number;
  assessmentId?: number;
  testCases: { input: string; expectedOutput: string }[];
}

/** Valida el cuerpo de una pregunta; devuelve un mensaje de error o los datos normalizados. */
function parseQuestion(body: any): { error: string } | { data: QuestionInput } {
  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  const score = Number(body.score);
  const languages = String(body.language ?? '')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
  const testCases = Array.isArray(body.testCases) ? body.testCases : [];

  if (!title) return { error: 'El título es obligatorio' };
  if (!description) return { error: 'La descripción es obligatoria' };
  if (!Number.isInteger(score) || score <= 0) return { error: 'El puntaje debe ser un entero positivo' };
  if (languages.length === 0) return { error: 'Selecciona al menos un lenguaje' };
  const unsupported = languages.find((l) => !SUPPORTED_LANGUAGES.includes(l));
  if (unsupported) return { error: `Lenguaje no soportado: ${unsupported}` };
  if (testCases.length === 0) return { error: 'Agrega al menos un caso de prueba' };
  if (testCases.some((t: any) => !String(t.expectedOutput ?? '').trim())) {
    return { error: 'Todos los casos de prueba necesitan una salida esperada' };
  }

  return {
    data: {
      title,
      description,
      score,
      language: [...new Set(languages)].join(','),
      assessmentId: body.assessmentId === undefined ? undefined : Number(body.assessmentId),
      testCases: testCases.map((t: any) => ({
        input: String(t.input ?? ''),
        expectedOutput: String(t.expectedOutput),
      })),
    },
  };
}

// Crear pregunta con sus test cases
router.post('/', async (req, res) => {
  try {
    const parsed = parseQuestion(req.body);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    const { testCases, assessmentId, ...data } = parsed.data;

    if (!assessmentId || !(await prisma.assessment.findUnique({ where: { id: assessmentId } }))) {
      return res.status(404).json({ error: 'Assessment no encontrado' });
    }

    const question = await prisma.question.create({
      data: { ...data, assessmentId, testCases: { create: testCases } },
      include: { testCases: true },
    });
    res.status(201).json(question);
  } catch (error) {
    console.error(error);
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

// Editar una pregunta (los casos de prueba se reemplazan completos)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = parseQuestion(req.body);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    const { testCases, assessmentId: _ignored, ...data } = parsed.data;

    if (!(await prisma.question.findUnique({ where: { id } }))) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    const [, question] = await prisma.$transaction([
      prisma.testCase.deleteMany({ where: { questionId: id } }),
      prisma.question.update({
        where: { id },
        data: { ...data, testCases: { create: testCases } },
        include: { testCases: true },
      }),
    ]);
    res.json(question);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la pregunta' });
  }
});

// Eliminar una pregunta junto con sus casos de prueba y envíos
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!(await prisma.question.findUnique({ where: { id } }))) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }
    await prisma.$transaction([
      prisma.submission.deleteMany({ where: { questionId: id } }),
      prisma.testCase.deleteMany({ where: { questionId: id } }),
      prisma.question.delete({ where: { id } }),
    ]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la pregunta' });
  }
});

export default router;
