import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AuditSummary, SessionResultSummary } from '../../session/types';
import { SessionResult } from './SessionResult';

function readingSummary(): SessionResultSummary {
  return {
    selectedModules: ['READING'],
    modules: [
      { module: 'READING', rawScore: 34, totalQuestions: 40, band: 7.5 },
      { module: 'WRITING', state: 'NOT_INCLUDED' },
    ],
    overallBand: null,
    overallStatus: 'NOT_APPLICABLE',
  };
}

describe('SessionResult', () => {
  it('shows a Reading-only score without a false overall IELTS band', () => {
    render(<SessionResult summary={readingSummary()} />);

    expect(screen.getByRole('heading', { name: 'Session result' })).toBeInTheDocument();
    expect(screen.getByText('34 / 40')).toBeInTheDocument();
    expect(screen.getByText('Band 7.5')).toBeInTheDocument();
    expect(screen.getByText('Overall IELTS band unavailable for this session')).toBeInTheDocument();
  });

  it('shows manual Reading as awaiting teacher marking', () => {
    const summary: SessionResultSummary = {
      selectedModules: ['READING'],
      modules: [
        {
          module: 'READING',
          assessmentState: 'PENDING_MANUAL',
          totalQuestions: 40,
        },
      ],
      overallBand: null,
      overallStatus: 'PENDING',
    };

    render(<SessionResult summary={summary} />);
    expect(screen.getByText('Awaiting teacher marking')).toBeInTheDocument();
    expect(screen.getByText('Teacher scoring')).toBeInTheDocument();
  });

  it('shows an unscored practice result without inventing a score', () => {
    const summary: SessionResultSummary = {
      selectedModules: ['READING'],
      modules: [
        {
          module: 'READING',
          assessmentState: 'UNSCORED',
          totalQuestions: 40,
        },
      ],
      overallBand: null,
      overallStatus: 'NOT_APPLICABLE',
    };

    render(<SessionResult summary={summary} />);
    expect(screen.getByText('Unscored practice completed')).toBeInTheDocument();
    expect(screen.queryByText(/\/ 40/)).not.toBeInTheDocument();
  });

  it('marks Writing as not included for Listening + Reading', () => {
    const summary: SessionResultSummary = {
      selectedModules: ['LISTENING', 'READING'],
      modules: [
        { module: 'LISTENING', rawScore: 31, totalQuestions: 40, band: 7 },
        { module: 'READING', rawScore: 34, totalQuestions: 40, band: 7.5 },
        { module: 'WRITING', state: 'NOT_INCLUDED' },
      ],
      overallBand: null,
      overallStatus: 'NOT_APPLICABLE',
    };

    render(<SessionResult summary={summary} />);
    expect(screen.getByTestId('result-writing-status')).toHaveTextContent('Not included');
  });

  it('clearly reports paper Writing completed without an app upload', () => {
    const summary: SessionResultSummary = {
      selectedModules: ['WRITING'],
      modules: [
        {
          module: 'WRITING',
          state: 'COMPLETED_NOT_UPLOADED',
          delivery: 'PAPER',
        },
      ],
      overallBand: null,
      overallStatus: 'NOT_APPLICABLE',
    };

    render(<SessionResult summary={summary} />);
    expect(screen.getByText('Writing completed on paper — not submitted to app')).toBeInTheDocument();
  });

  it('reports Practice pause conditions without changing the academic score', () => {
    const audit: AuditSummary = {
      practicePauseCount: 2,
      practicePausedMs: 90_000,
      technicalInterruptionCount: 1,
      technicalInterruptedMs: 15_000,
    };

    render(<SessionResult summary={readingSummary()} audit={audit} />);
    expect(screen.getByText('Band 7.5')).toBeInTheDocument();
    expect(screen.getByText('2 practice pauses')).toBeInTheDocument();
    expect(screen.getByText('1m 30s paused')).toBeInTheDocument();
    expect(screen.getByText('1 technical interruption')).toBeInTheDocument();
  });
});
