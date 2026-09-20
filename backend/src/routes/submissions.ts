import { Router } from 'express';
import { prisma } from '../prismaClient';
import { runCode } from '../executor';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { candidateId, questionId, code, language } = req.body;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { testCases: true },
    });

    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    let passedCount = 0;
    const results = [];

    for (const testCase of question.testCases) {
      const result = await runCode(language, code, testCase.input);
      const actualOutput = result.stdout.trim();
      const expected = testCase.expectedOutput.trim();
      const passed = result.success && actualOutput === expected;

      if (passed) passedCount++;

      results.push({
        testCaseId: testCase.id,
        input: testCase.input,
        expected,
        actualOutput,
        passed,
        stderr: result.stderr,
        timedOut: result.timedOut,
      });
    }

    const totalCases = question.testCases.length;
    const scorePercentage = totalCases > 0 ? Math.round((passedCount / totalCases) * 100) : 0;
    const finalScore = Math.round((scorePercentage / 100) * question.score);

    const submission = await prisma.submission.create({
      data: {
        candidateId,
        questionId,
        code,
        language,
        passed: passedCount === totalCases,
        score: finalScore,
      },
    });

    res.status(201).json({
      submission,
      results,
      summary: {
        totalCases,
        passedCount,
        scorePercentage,
      },
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la submission', details: error.message });
  }
});

export default router;