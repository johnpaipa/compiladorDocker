import { Router } from 'express';
import { prisma } from '../prismaClient';
import { runTests } from '../executor';
import { isStaff } from '../auth';
import { findAttempt, isExpired } from '../attempts';

const router = Router();

// save: false solo ejecuta (botón Ejecutar); save: true además guarda el envío.
// El personal puede probar código pero no enviar respuestas.
router.post('/', async (req, res) => {
  try {
    const user = req.user!;
    const { questionId, code, language, save = false } = req.body;
    const staff = isStaff(user);

    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'El código no puede estar vacío' });
    }
    if (save && staff) {
      return res.status(403).json({ error: 'Solo los candidatos pueden enviar respuestas' });
    }

    const question = await prisma.question.findUnique({
      where: { id: Number(questionId) },
      include: { testCases: { orderBy: { id: 'asc' } }, assessment: { select: { timeLimit: true } } },
    });

    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    if (!staff) {
      const attempt = await findAttempt(user.id, question.assessmentId);
      if (!attempt) return res.status(403).json({ error: 'Debes comenzar la evaluación antes de ejecutar código' });
      if (isExpired(attempt, question.assessment.timeLimit)) {
        return res.status(403).json({ error: 'El tiempo de la evaluación terminó' });
      }
    }

    if (!question.language.split(',').includes(language)) {
      return res.status(400).json({ error: `Lenguaje no permitido para esta pregunta: ${language}` });
    }

    // se compila una vez y se corren todos los casos juntos
    const executions = await runTests(language, code, question.testCases.map((t) => t.input));

    let passedCount = 0;
    const results = question.testCases.map((testCase, i) => {
      const result = executions[i]!;
      const actualOutput = result.stdout.trim();
      const expected = testCase.expectedOutput.trim();
      const passed = result.success && actualOutput === expected;

      if (passed) passedCount++;

      const hidden = !staff && i > 0;
      return {
        testCaseId: testCase.id,
        hidden,
        input: hidden ? '' : testCase.input,
        expected: hidden ? '' : expected,
        actualOutput: hidden ? '' : actualOutput,
        passed,
        stderr: result.stderr,
        timedOut: result.timedOut,
      };
    });

    const totalCases = question.testCases.length;
    const scorePercentage = totalCases > 0 ? Math.round((passedCount / totalCases) * 100) : 0;
    const finalScore = Math.round((scorePercentage / 100) * question.score);
    const summary = { totalCases, passedCount, scorePercentage, score: finalScore, maxScore: question.score };

    if (save) {
      await prisma.submission.create({
        data: {
          candidateId: user.email,
          userId: user.id,
          questionId: question.id,
          code,
          language,
          passed: totalCases > 0 && passedCount === totalCases,
          score: finalScore,
        },
      });
    }

    res.status(save ? 201 : 200).json({ saved: Boolean(save), results, summary });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la submission', details: error.message });
  }
});

export default router;
