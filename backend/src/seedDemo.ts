import { prisma } from './prismaClient';
import { DEMO_ASSESSMENTS } from './demoContent';

async function main() {
  for (const a of DEMO_ASSESSMENTS) {
    if (await prisma.assessment.findFirst({ where: { name: a.name } })) {
      console.log(`ya existe, se omite: ${a.name}`);
      continue;
    }

    await prisma.assessment.create({
      data: {
        name: a.name,
        description: a.description,
        timeLimit: a.timeLimit,
        questions: {
          create: a.questions.map((q) => ({
            title: q.title,
            description: q.description,
            language: q.language,
            score: q.score,
            testCases: { create: q.cases.map(([input, expectedOutput]) => ({ input, expectedOutput })) },
          })),
        },
      },
    });
    console.log(`creado: ${a.name} (${a.questions.length} preguntas, ${a.timeLimit} min)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
