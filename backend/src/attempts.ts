import type { Attempt } from '@prisma/client';
import { prisma } from './prismaClient';

export const GRACE_MS = 5000;

export const findAttempt = (userId: number, assessmentId: number) =>
  prisma.attempt.findUnique({ where: { userId_assessmentId: { userId, assessmentId } } });

export const deadlineOf = (attempt: Attempt, timeLimitMinutes: number) =>
  new Date(attempt.startedAt.getTime() + timeLimitMinutes * 60_000);

export const isExpired = (attempt: Attempt, timeLimitMinutes: number) =>
  Date.now() > deadlineOf(attempt, timeLimitMinutes).getTime() + GRACE_MS;

export function attemptInfo(attempt: Attempt | null, timeLimitMinutes: number) {
  return {
    startedAt: attempt?.startedAt ?? null,
    deadline: attempt ? deadlineOf(attempt, timeLimitMinutes) : null,
    serverNow: new Date(),
    timeLimit: timeLimitMinutes,
  };
}
