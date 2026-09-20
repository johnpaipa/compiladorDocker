import { Router } from 'express';
import { prisma } from '../prismaClient';
import { runTests } from '../executor';

const router = Router();

// Ejecuta el código contra los casos de prueba. Con `save: false` solo devuelve
// el resultado (botón "Ejecutar"); por defecto también guarda el envío ("Enviar respuesta").
router.post('/', async (req, res) => {
  try {
    const { candidateId, questionId, code, language, save = true } = req.body;

    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'El código no puede estar vacío' });
    }
    if (save && !String(candidateId ?? '').trim()) {
      return res.status(400).json({ error: 'candidateId es obligatorio' });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { testCases: true },
    });

    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    // `question.language` guarda los lenguajes permitidos separados por coma
    if (!question.language.split(',').includes(language)) {
      return res.status(400).json({ error: `Lenguaje no permitido para esta pregunta: ${language}` });
    }

    // Se compila una sola vez y se ejecutan todos los casos en el mismo contenedor
    const executions = await runTests(language, code, question.testCases.map((t) => t.input));

    let passedCount = 0;
    const results = question.testCases.map((testCase, i) => {
      const result = executions[i];
      const actualOutput = result.stdout.trim();
      const expected = testCase.expectedOutput.trim();
      const passed = result.success && actualOutput === expected;

      if (passed) passedCount++;

      return {
        testCaseId: testCase.id,
        input: testCase.input,
        expected,
        actualOutput,
        passed,
        stderr: result.stderr,
        timedOut: result.timedOut,
      };
    });

    const totalCases = question.testCases.length;
    const scorePercentage = totalCases > 0 ? Math.round((passedCount / totalCases) * 100) : 0;
    const finalScore = Math.round((scorePercentage / 100) * question.score);
    const summary = { totalCases, passedCount, scorePercentage, score: finalScore, maxScore: question.score };

    const submission = save
      ? await prisma.submission.create({
          data: {
            candidateId: String(candidateId).trim(),
            questionId,
            code,
            language,
            passed: totalCases > 0 && passedCount === totalCases,
            score: finalScore,
          },
        })
      : null;

    res.status(save ? 201 : 200).json({ submission, saved: save, results, summary });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la submission', details: error.message });
  }
});

export default router;
