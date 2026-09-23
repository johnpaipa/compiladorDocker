import { Router } from 'express';
import { prisma } from '../prismaClient';
import { isStaff, requireRole, requireStaff } from '../auth';
import { attemptInfo, findAttempt } from '../attempts';

const router = Router();

const findAssignment = (userId: number, assessmentId: number) =>
  prisma.assignment.findUnique({ where: { userId_assessmentId: { userId, assessmentId } } });

function parseAssessment(body: any): { error: string } | { data: { name: string; description: string | null; timeLimit: number } } {
  const name = String(body.name ?? '').trim();
  const description = String(body.description ?? '').trim();
  const timeLimit = Number(body.timeLimit);
  if (!name) return { error: 'El nombre es obligatorio' };
  if (!Number.isInteger(timeLimit) || timeLimit <= 0) return { error: 'El tiempo límite debe ser un entero de minutos mayor a 0' };
  return { data: { name, description: description || null, timeLimit } };
}

// Crear assessment
router.post('/', requireStaff, async (req, res) => {
  try {
    const parsed = parseAssessment(req.body);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    const assessment = await prisma.assessment.create({ data: parsed.data });
    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el assessment' });
  }
});

// Listar assessments: el personal ve todos, un candidato solo los suyos (asignados o ya iniciados)
router.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const assessments = await prisma.assessment.findMany({
      ...(isStaff(user)
        ? {}
        : { where: { OR: [{ assignments: { some: { userId: user.id } } }, { attempts: { some: { userId: user.id } } }] } }),
      include: { questions: { select: { id: true, score: true } } },
      orderBy: { id: 'asc' },
    });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar assessments' });
  }
});

// Obtener un assessment por id (con preguntas y test cases)
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { questions: { include: { testCases: true }, orderBy: { id: 'asc' } } },
    });
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment no encontrado' });
    }

    const user = req.user!;
    if (isStaff(user)) {
      return res.json({ ...assessment, questions: assessment.questions.map((q) => ({ ...q, testCaseCount: q.testCases.length })) });
    }

    const [attempt, assignment] = await Promise.all([findAttempt(user.id, id), findAssignment(user.id, id)]);
    if (!attempt && !assignment) {
      return res.status(403).json({ error: 'No tienes asignado este assessment' });
    }

    const started = Boolean(attempt);
    res.json({
      ...assessment,
      questions: assessment.questions.map((q) => ({
        id: q.id,
        title: q.title,
        description: started ? q.description : '',
        language: q.language,
        score: q.score,
        assessmentId: q.assessmentId,
        testCaseCount: q.testCases.length,
        testCases: [],
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el assessment' });
  }
});

// Editar un assessment
router.put('/:id', requireStaff, async (req, res) => {
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

// Eliminar un assessment
router.delete('/:id', requireStaff, async (req, res) => {
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
      prisma.assignment.deleteMany({ where: { assessmentId: id } }),
      prisma.attempt.deleteMany({ where: { assessmentId: id } }),
      prisma.assessment.delete({ where: { id } }),
    ]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el assessment' });
  }
});

router.get('/:id/attempt', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = req.user!;
    const assessment = await prisma.assessment.findUnique({ where: { id }, select: { timeLimit: true } });
    if (!assessment) return res.status(404).json({ error: 'Assessment no encontrado' });

    const attempt = await findAttempt(user.id, id);
    if (!isStaff(user) && !attempt && !(await findAssignment(user.id, id))) {
      return res.status(403).json({ error: 'No tienes asignado este assessment' });
    }
    res.json(attemptInfo(attempt, assessment.timeLimit));
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar el intento' });
  }
});

router.post('/:id/start', requireRole('CANDIDATE'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const assessment = await prisma.assessment.findUnique({ where: { id }, include: { questions: { select: { id: true } } } });
    if (!assessment) return res.status(404).json({ error: 'Assessment no encontrado' });
    if (assessment.questions.length === 0) {
      return res.status(400).json({ error: 'Este assessment todavía no tiene preguntas' });
    }
    if (!(await findAssignment(req.user!.id, id))) {
      return res.status(403).json({ error: 'No tienes asignado este assessment' });
    }
    // si ya empezó se conserva la hora original
    const attempt = await prisma.attempt.upsert({
      where: { userId_assessmentId: { userId: req.user!.id, assessmentId: id } },
      create: { userId: req.user!.id, assessmentId: id },
      update: {},
    });
    res.status(201).json(attemptInfo(attempt, assessment.timeLimit));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar la evaluación' });
  }
});

// Asignar el assessment a un candidato por correo (no afecta lo que ya inició)
router.post('/:id/assignments', requireStaff, async (req, res) => {
  try {
    const assessmentId = Number(req.params.id);
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'El correo es obligatorio' });

    if (!(await prisma.assessment.findUnique({ where: { id: assessmentId } }))) {
      return res.status(404).json({ error: 'Assessment no encontrado' });
    }

    const candidate = await prisma.user.findUnique({ where: { email } });
    if (!candidate) return res.status(404).json({ error: 'No existe un usuario con ese correo' });
    if (candidate.role !== 'CANDIDATE') return res.status(400).json({ error: 'Solo se puede asignar a usuarios con rol candidato' });
    if (!candidate.active) return res.status(400).json({ error: 'Ese candidato está desactivado' });

    if (await findAssignment(candidate.id, assessmentId)) {
      return res.status(409).json({ error: 'Ese candidato ya tiene asignado este assessment' });
    }

    await prisma.assignment.create({ data: { userId: candidate.id, assessmentId, assignedById: req.user!.id } });
    res.status(201).json({ userId: candidate.id, name: candidate.name, email: candidate.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al asignar el assessment' });
  }
});

// Quitar la asignación (si ya inició, el intento y sus resultados se conservan)
router.delete('/:id/assignments/:userId', requireStaff, async (req, res) => {
  try {
    const assessmentId = Number(req.params.id);
    const userId = Number(req.params.userId);
    const assignment = await findAssignment(userId, assessmentId);
    if (!assignment) return res.status(404).json({ error: 'Esa asignación no existe' });
    await prisma.assignment.delete({ where: { id: assignment.id } });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al quitar la asignación' });
  }
});

// Candidatos con acceso asignado a este assessment
router.get('/:id/assignments', requireStaff, async (req, res) => {
  try {
    const assessmentId = Number(req.params.id);
    const assignments = await prisma.assignment.findMany({
      where: { assessmentId },
      include: { candidate: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const attempts = await prisma.attempt.findMany({ where: { assessmentId }, select: { userId: true } });
    const startedIds = new Set(attempts.map((a) => a.userId));

    res.json(
      assignments.map((a) => ({
        userId: a.candidate.id,
        name: a.candidate.name,
        email: a.candidate.email,
        assignedAt: a.createdAt,
        started: startedIds.has(a.candidate.id),
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar las asignaciones' });
  }
});

// Candidatos que iniciaron el assessment
router.get('/:id/candidates', requireStaff, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const questionIds = (await prisma.question.findMany({ where: { assessmentId: id }, select: { id: true } })).map((q) => q.id);
    const attempts = await prisma.attempt.findMany({
      where: { assessmentId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { startedAt: 'desc' },
    });
    const stats = await prisma.submission.groupBy({
      by: ['userId'],
      where: { questionId: { in: questionIds } },
      _count: { _all: true },
      _max: { createdAt: true },
    });
    const statsByUser = new Map(stats.map((s) => [s.userId, s]));

    res.json(
      attempts.map((a) => ({
        userId: a.user.id,
        name: a.user.name,
        email: a.user.email,
        startedAt: a.startedAt,
        submissions: statsByUser.get(a.userId)?._count._all ?? 0,
        lastActivity: statsByUser.get(a.userId)?._max.createdAt ?? null,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar candidatos' });
  }
});

// Resultados agregados de un candidato en un assessment
router.get('/:id/results/:userId', async (req, res) => {
  try {
    const assessmentId = Number(req.params.id);
    const userId = Number(req.params.userId);

    if (!isStaff(req.user!) && req.user!.id !== userId) {
      return res.status(403).json({ error: 'Solo puedes consultar tus propios resultados' });
    }

    const [assessment, candidate] = await Promise.all([
      prisma.assessment.findUnique({ where: { id: assessmentId }, include: { questions: { orderBy: { id: 'asc' } } } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }),
    ]);
    if (!assessment) return res.status(404).json({ error: 'Assessment no encontrado' });
    if (!candidate) return res.status(404).json({ error: 'Candidato no encontrado' });

    const questionIds = assessment.questions.map((q) => q.id);

    // Todas las submissions del candidato para las preguntas de este assessment
    const submissions = await prisma.submission.findMany({
      where: { userId, questionId: { in: questionIds } },
      orderBy: { createdAt: 'desc' },
    });

    // Tiempo consumido: desde que comenzó hasta su último envío
    const attempt = await findAttempt(userId, assessmentId);
    let timeConsumedSeconds: number | null = null;
    if (submissions.length > 0) {
      const last = submissions[0]!.createdAt.getTime();
      const first = attempt ? attempt.startedAt.getTime() : submissions[submissions.length - 1]!.createdAt.getTime();
      timeConsumedSeconds = Math.max(0, Math.round((last - first) / 1000));
    }

    // Nos quedamos con la última submission por pregunta
    const latestByQuestion = new Map<number, (typeof submissions)[number]>();
    for (const submission of submissions) {
      if (!latestByQuestion.has(submission.questionId)) latestByQuestion.set(submission.questionId, submission);
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

    res.json({
      assessmentId,
      candidate,
      startedAt: attempt?.startedAt ?? null,
      totalQuestions: assessment.questions.length,
      correctCount: questionResults.filter((r) => r.passed).length,
      incorrectCount: questionResults.filter((r) => r.attempted && !r.passed).length,
      notAttemptedCount: questionResults.filter((r) => !r.attempted).length,
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

// Código enviado por el candidato en cada pregunta
router.get('/:id/review/:userId', requireStaff, async (req, res) => {
  try {
    const assessmentId = Number(req.params.id);
    const userId = Number(req.params.userId);
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questions: { orderBy: { id: 'asc' } } },
    });
    if (!assessment) return res.status(404).json({ error: 'Assessment no encontrado' });

    const submissions = await prisma.submission.findMany({
      where: { userId, questionId: { in: assessment.questions.map((q) => q.id) } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, questionId: true, code: true, language: true, passed: true, score: true, createdAt: true },
    });

    res.json({
      questions: assessment.questions.map((q) => ({
        questionId: q.id,
        title: q.title,
        maxScore: q.score,
        submissions: submissions.filter((s) => s.questionId === q.id),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la revisión' });
  }
});

export default router;
