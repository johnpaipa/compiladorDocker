import { Router } from 'express';
import { prisma } from '../prismaClient';

const router = Router();

function parseAssessment(body: any): { error: string } | { data: { name: string; description: string | null; timeLimit: number } } {
  const name = String(body.name ?? '').trim();
  const description = String(body.description ?? '').trim();
  const timeLimit = Number(body.timeLimit);
  if (!name) return { error: 'El nombre es obligatorio' };
  if (!Number.isInteger(timeLimit) || timeLimit <= 0) return { error: 'El tiempo límite debe ser un entero de minutos mayor a 0' };
  return { data: { name, description: description || null, timeLimit } };
}

// Crear assessment
router.post('/', async (req, res) => {
  try {
    const parsed = parseAssessment(req.body);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    const assessment = await prisma.assessment.create({ data: parsed.data });
    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el assessment' });
  }
});

// Editar un assessment
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = parseAssessment(req.body);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    if (!(await prisma.assessment.findUnique({ where: { id } }))) {
      return res.status(404).json({ error: 'Assessment no encontrado' });
    }
    res.json(await prisma.assessment.update({ where: { id }, data: parsed.data }));
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el assessment' });
  }
});

// Eliminar un assessment con sus preguntas, casos de prueba y envíos
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!(await prisma.assessment.findUnique({ where: { id } }))) {
      return res.status(404).json({ error: 'Assessment no encontrado' });
    }
    const questionIds = (await prisma.question.findMany({ where: { assessmentId: id }, select: { id: true } })).map((q) => q.id);
    await prisma.$transaction([
      prisma.submission.deleteMany({ where: { questionId: { in: questionIds } } }),
      prisma.testCase.deleteMany({ where: { questionId: { in: questionIds } } }),
      prisma.question.deleteMany({ where: { assessmentId: id } }),
      prisma.assessment.delete({ where: { id } }),
    ]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el assessment' });
  }
});

// Candidatos que han enviado respuestas a un assessment
router.get('/:id/candidates', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const questions = await prisma.question.findMany({ where: { assessmentId: id }, select: { id: true } });
    const grouped = await prisma.submission.groupBy({
      by: ['candidateId'],
      where: { questionId: { in: questions.map((q) => q.id) } },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
    });
    res.json(
      grouped.map((g) => ({
        candidateId: g.candidateId,
        submissions: g._count._all,
        lastActivity: g._max.createdAt,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar candidatos' });
  }
});

// Listar todos los assessments
router.get('/', async (req, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      include: { questions: true },
    });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar assessments' });
  }
});

// Obtener un assessment por id (con preguntas y test cases)
router.get('/:id', async (req, res) => {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: Number(req.params.id) },
      include: { questions: { include: { testCases: true } } },
    });
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment no encontrado' });
    }
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el assessment' });
  }
});
// Resultados agregados de un candidato en un assessment
router.get('/:id/results/:candidateId', async (req, res) => {
  try {
    const assessmentId = Number(req.params.id);
    const { candidateId } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questions: true },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment no encontrado' });
    }

    const questionIds = assessment.questions.map((q) => q.id);

    // Todas las submissions del candidato para las preguntas de este assessment
    const submissions = await prisma.submission.findMany({
      where: {
        candidateId,
        questionId: { in: questionIds },
      },
      orderBy: { createdAt: 'desc' },
    });

    const submissionsAsc = [...submissions].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    let timeConsumedSeconds: number | null = null;
    if (submissionsAsc.length > 0) {
      const firstSubmission = submissionsAsc[0];
      const lastSubmission = submissionsAsc[submissionsAsc.length - 1];
      timeConsumedSeconds = Math.round(
        (lastSubmission.createdAt.getTime() - firstSubmission.createdAt.getTime()) / 1000
      );
    }

    // Nos quedamos con la última submission por pregunta
    const latestByQuestion = new Map<number, typeof submissions[0]>();
    for (const submission of submissions) {
      if (!latestByQuestion.has(submission.questionId)) {
        latestByQuestion.set(submission.questionId, submission);
      }
    }

    const questionResults = assessment.questions.map((question) => {
      const submission = latestByQuestion.get(question.id);
      return {
        questionId: question.id,
        title: question.title,
        maxScore: question.score,
        attempted: !!submission,
        passed: submission?.passed ?? false,
        obtainedScore: submission?.score ?? 0,
      };
    });

    const totalMaxScore = assessment.questions.reduce((sum, q) => sum + q.score, 0);
    const totalObtainedScore = questionResults.reduce((sum, r) => sum + r.obtainedScore, 0);
    const correctCount = questionResults.filter((r) => r.passed).length;
    const incorrectCount = questionResults.filter((r) => r.attempted && !r.passed).length;
    const notAttemptedCount = questionResults.filter((r) => !r.attempted).length;

    res.json({
      assessmentId,
      candidateId,
      totalQuestions: assessment.questions.length,
      correctCount,
      incorrectCount,
      notAttemptedCount,
      totalMaxScore,
      totalObtainedScore,
      percentage: totalMaxScore > 0 ? Math.round((totalObtainedScore / totalMaxScore) * 100) : 0,
      timeConsumedSeconds,
      questionResults,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Error al calcular resultados', details: error.message });
  }
});

export default router;