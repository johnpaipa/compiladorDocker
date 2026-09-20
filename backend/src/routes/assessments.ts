import { Router } from 'express';
import { prisma } from '../prismaClient';

const router = Router();

// Crear assessment
router.post('/', async (req, res) => {
  try {
    const { name, description, timeLimit } = req.body;
    const assessment = await prisma.assessment.create({
      data: { name, description, timeLimit },
    });
    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el assessment' });
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