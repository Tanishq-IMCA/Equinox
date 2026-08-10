'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { LastScan, SeverityLevel } from '@/types';
import { startAnalysis, getAnalysis, getScanRateLimit } from '@/lib/api';

export interface ScanStep {
  name: string;
  status: 'done' | 'running' | 'pending' | 'failed';
  error?: string;
}

export interface ScanState {
  steps: ScanStep[];
  progress: number;
  stage: string;
  message: string;
}

const STAGES = [
  { name: 'Extracting files', message: 'Unpacking compressed archives...' },
  { name: 'Fetching repository metadata', message: 'Connecting to GitHub API...' },
  { name: 'Cloning repository', message: 'Pulling source tree...' },
  { name: 'Running Semgrep', message: 'Scanning for security vulnerabilities...' },
  { name: 'Running Bandit', message: 'Analyzing Python security patterns...' },
  { name: 'Running Ruff', message: 'Checking code quality and style...' },
  { name: 'Running ESLint', message: 'Checking JavaScript/TypeScript patterns...' },
  { name: 'Running Lizard', message: 'Computing cyclomatic complexity...' },
  { name: 'Running Madge', message: 'Mapping JavaScript architecture...' },
  { name: 'Running pydeps', message: 'Mapping Python architecture...' },
  { name: 'Running jscpd', message: 'Detecting duplicated code...' },
  { name: 'Running osv-scanner', message: 'Checking dependency health...' },
  { name: 'Running secret scanner', message: 'Scanning git history for secrets...' },
  { name: 'Running Hotspots', message: 'Computing churn + complexity hotspots...' },
  { name: 'AI analysis', message: 'Sending curated findings to Claude...' },
  { name: 'Cross-referencing skills', message: 'Comparing stated vs. actual expertise...' },
  { name: 'Generating report', message: 'Compiling final assessment...' },
];

export function mergeScannerResults(deterministicResults: Record<string, unknown>): LastScan {
  const semgrep = (deterministicResults.semgrep as Record<string, unknown>) || {};
  const bandit = (deterministicResults.bandit as Record<string, unknown>) || {};
  const ruff = (deterministicResults.ruff as Record<string, unknown>) || {};
  const eslint = (deterministicResults.eslint as Record<string, unknown>) || {};
  const scanner = (deterministicResults as Record<string, unknown>);

  const semgrepFindings = mapSemgrepFindings(semgrep);
  const banditFindings = mapBanditFindings(bandit);
  const ruffFindings = mapRuffFindings(ruff);
  const eslintFindings = mapEslintFindings(eslint);

  const toolFindings = [...semgrepFindings, ...banditFindings, ...ruffFindings, ...eslintFindings];
  const errors = [
    ...mapSemgrepErrors(semgrep),
    ...(bandit.errors as Array<Record<string, unknown>>) || [],
    ...(ruff.errors as Array<Record<string, unknown>>) || [],
    ...(eslint.errors as Array<Record<string, unknown>>) || [],
  ].map((e, i) => ({
    id: `err-${i}`,
    severity: 'low' as SeverityLevel,
    title: String(e.message || 'Scan Error'),
    description: String(e.message || 'Error during analysis'),
    file: 'unknown',
    line: 0,
    tool: 'Pipeline',
    recommendation: 'Check tool installation and file syntax.',
  }));

  const scannerFindings = (scanner.allFindings as Array<Record<string, unknown>>) || [];
  const allFindings = [...toolFindings, ...errors, ...scannerFindings.map((f, i) => ({
    id: String(f.id || `scanner-${i}`),
    severity: (String(f.severity || 'medium') as SeverityLevel),
    title: String(f.title || 'Finding'),
    description: String(f.description || ''),
    file: String(f.file || 'unknown'),
    line: Number(f.line || 0),
    tool: String(f.tool || 'Scanner'),
    recommendation: String(f.recommendation || 'Review and fix manually'),
  }))];

  const totalFiles =
    Number(semgrep.scannedFiles || 0) +
    Number(bandit.scannedFiles || 0) +
    Number(ruff.scannedFiles || 0) +
    Number(eslint.scannedFiles || 0) ||
    Number((scanner.metrics as Record<string, unknown>)?.totalFiles || 0);

  const total = allFindings.length;
  const critical = allFindings.filter(f => f.severity === 'critical').length;
  const high = allFindings.filter(f => f.severity === 'high').length;
  const medium = allFindings.filter(f => f.severity === 'medium').length;

  const toolSecurityScore = Math.max(0, 100 - critical * 25 - high * 12 - medium * 5);
  const toolCodeQualityScore = Math.max(0, 100 - errors.length * 3 - ruffFindings.length * 2 - eslintFindings.length * 2);

  const scannerSecurityScore = Number(scanner.securityScore);
  const scannerCodeQualityScore = Number(scanner.codeQualityScore);
  const scannerArchitectureScore = Number(scanner.architectureScore);

  const securityScore = scannerSecurityScore ? Math.round((toolSecurityScore + scannerSecurityScore) / 2) : toolSecurityScore;
  const codeQualityScore = scannerCodeQualityScore ? Math.round((toolCodeQualityScore + scannerCodeQualityScore) / 2) : toolCodeQualityScore;
  const architectureScore = Number.isFinite(scannerArchitectureScore) ? scannerArchitectureScore : 50;

  const skillAssessment = (scanner.skillAssessment as Array<Record<string, unknown>>) || [];
  const skillScore = skillAssessment.length
    ? Math.round(skillAssessment.reduce((s, sk) => s + Number(sk.actual || 0), 0) / skillAssessment.length)
    : 0;

  const overallScore = Math.round((securityScore + codeQualityScore + architectureScore + skillScore) / 4);

  const metrics = (scanner.metrics as Record<string, unknown>) || {};
  const architectureDetails = (scanner.architectureDetails as LastScan['architectureDetails']) || undefined;
  const codeQualityDetails = (scanner.codeQualityDetails as LastScan['codeQualityDetails']) || undefined;
  const dependencies = (scanner.dependencies as LastScan['dependencies']) || { upToDate: 0, outdated: 0, vulnerable: 0 };
  const hotspots = (scanner.hotspots as LastScan['hotspots']) || undefined;
  const codeSmells = (scanner.codeSmells as LastScan['codeSmells']) || undefined;

  return {
    overallScore,
    scanDate: new Date().toISOString(),
    securityScore,
    codeQualityScore,
    architectureScore,
    skillScore,
    metrics: {
      totalFiles: Math.max(Number(metrics.totalFiles || totalFiles), 1),
      linesOfCode: Number(metrics.linesOfCode || 0),
      testCoverage: 0,
      avgComplexity: Number(metrics.avgComplexity || 0),
      duplication: Number(metrics.duplication || 0),
    },
    findings: allFindings,
    dependencies,
    codeSmells,
    skillAssessment: skillAssessment as unknown as LastScan['skillAssessment'],
    architectureDetails,
    codeQualityDetails,
    hotspots,
  };
}

type Finding = NonNullable<LastScan['findings']>[number];

async function analyzeLocalFiles(files: File[]): Promise<LastScan> {
  const findings: Finding[] = [];
  let totalLines = 0;
  let testFiles = 0;
  let codeFiles = 0;
  let longLines = 0;
  const fileCounts: Record<string, number> = {};

  const securityPatterns = [
    { regex: /password\s*=\s*['"][^'"]+['"]/i, title: 'Possible hardcoded password', severity: 'high' as SeverityLevel },
    { regex: /secret\s*=\s*['"][^'"]+['"]/i, title: 'Possible hardcoded secret', severity: 'high' as SeverityLevel },
    { regex: /api[_-]?key\s*=\s*['"][^'"]+['"]/i, title: 'Possible hardcoded API key', severity: 'high' as SeverityLevel },
    { regex: /token\s*=\s*['"][^'"]+['"]/i, title: 'Possible hardcoded token', severity: 'high' as SeverityLevel },
    { regex: /eval\s*\(/, title: 'Use of eval() detected', severity: 'high' as SeverityLevel },
    { regex: /exec\s*\(/, title: 'Use of exec() detected', severity: 'high' as SeverityLevel },
    { regex: /innerHTML\s*=/, title: 'Use of innerHTML assignment', severity: 'medium' as SeverityLevel },
    { regex: /dangerouslySetInnerHTML/, title: 'dangerouslySetInnerHTML used', severity: 'medium' as SeverityLevel },
    { regex: /document\.write\s*\(/, title: 'document.write() used', severity: 'medium' as SeverityLevel },
    { regex: /http:\/\/(?!localhost)/, title: 'Insecure HTTP URL', severity: 'low' as SeverityLevel },
  ];

  const qualityPatterns = [
    { regex: /\bconsole\.(log|error|warn|info)\s*\(/, title: 'Debug console statement', severity: 'low' as SeverityLevel },
    { regex: /\bvar\s+/, title: 'Use of var instead of let/const', severity: 'low' as SeverityLevel },
    { regex: /[^=!]==[^=]/, title: 'Loose equality (==)', severity: 'low' as SeverityLevel },
    { regex: /TODO|FIXME|XXX|HACK/, title: 'Code smell marker found', severity: 'low' as SeverityLevel },
  ];

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    if (ext !== 'unknown') fileCounts[ext] = (fileCounts[ext] || 0) + 1;
    if (['test', 'spec'].some(s => file.name.toLowerCase().includes(s))) testFiles++;
    const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'go', 'rb', 'php', 'c', 'cpp', 'cs', 'rs', 'swift', 'kt'];
    if (codeExts.includes(ext)) codeFiles++;

    const text = await file.text().catch(() => '');
    const lines = text.split('\n');
    totalLines += lines.length;

    lines.forEach((line, lineIdx) => {
      if (line.length > 120) longLines++;
      securityPatterns.forEach(p => {
        if (p.regex.test(line)) {
          findings.push({
            id: `${file.name}-${lineIdx}-${p.title}`,
            severity: p.severity,
            title: p.title,
            description: line.trim().slice(0, 120),
            file: file.name,
            line: lineIdx + 1,
            tool: 'Local Security Scan',
            recommendation: 'Review and remove or secure the sensitive value.',
          });
        }
      });
      qualityPatterns.forEach(p => {
        if (p.regex.test(line)) {
          findings.push({
            id: `${file.name}-${lineIdx}-${p.title}`,
            severity: p.severity,
            title: p.title,
            description: line.trim().slice(0, 120),
            file: file.name,
            line: lineIdx + 1,
            tool: 'Local Quality Scan',
            recommendation: 'Clean up the code smell.',
          });
        }
      });
    });
  }

  const uniqueFindings = findings.filter((f, i, a) => a.findIndex(t => t.id === f.id) === i);
  const critical = uniqueFindings.filter(f => f.severity === 'critical').length;
  const high = uniqueFindings.filter(f => f.severity === 'high').length;
  const medium = uniqueFindings.filter(f => f.severity === 'medium').length;
  const low = uniqueFindings.filter(f => f.severity === 'low').length;

  const securityScore = Math.max(0, 100 - critical * 25 - high * 12 - medium * 5 - low * 1);
  const codeQualityScore = Math.max(0, 100 - low * 1 - longLines * 0.5);
  const architectureScore = Math.round(50 + (testFiles > 0 ? 15 : 0) + (codeFiles > 0 ? 15 : 0) + Math.min(files.length / 10, 10));
  const overallScore = Math.round((securityScore + codeQualityScore + architectureScore) / 3);

  return {
    overallScore,
    scanDate: new Date().toISOString(),
    securityScore,
    codeQualityScore,
    architectureScore,
    skillScore: 0,
    metrics: {
      totalFiles: files.length,
      linesOfCode: totalLines,
      testCoverage: 0,
      avgComplexity: 0,
      duplication: 0,
    },
    findings: uniqueFindings,
    dependencies: { upToDate: 0, outdated: 0, vulnerable: 0 },
  };
}

function mapSemgrepFindings(semgrepRaw: Record<string, unknown>): Finding[] {
  const findings = (semgrepRaw.findings as Array<Record<string, unknown>>) || [];
  return findings.map((f: Record<string, unknown>, i: number) => ({
    id: `sem-${i}`,
    severity: ((f.extra as Record<string, unknown>)?.severity as SeverityLevel) || ('medium' as SeverityLevel),
    title: String((f.extra as Record<string, unknown>)?.message || f.check_id || 'Finding'),
    description: String((f.extra as Record<string, unknown>)?.lines || f.path || 'No description'),
    file: String(f.path || 'unknown'),
    line: Number((f.start as Record<string, unknown>)?.line || 0),
    tool: 'Semgrep',
    recommendation: String((f.extra as Record<string, unknown>)?.fix || 'Review and fix manually'),
  }));
}

function mapSemgrepErrors(semgrepRaw: Record<string, unknown>): Array<Record<string, unknown>> {
  return (semgrepRaw.errors as Array<Record<string, unknown>>) || [];
}

function mapBanditFindings(banditRaw: Record<string, unknown>): Finding[] {
  const findings = (banditRaw.findings as Array<Record<string, unknown>>) || [];
  return findings.map((f: Record<string, unknown>, i: number) => ({
    id: String(f.id || `bandit-${i}`),
    severity: (f.severity as SeverityLevel) || ('medium' as SeverityLevel),
    title: String(f.title || 'Bandit finding'),
    description: String(f.description || 'No description'),
    file: String(f.file || 'unknown'),
    line: Number(f.line || 0),
    tool: 'Bandit',
    recommendation: String(f.recommendation || 'Review and fix manually'),
  }));
}

function mapRuffFindings(ruffRaw: Record<string, unknown>): Finding[] {
  const findings = (ruffRaw.findings as Array<Record<string, unknown>>) || [];
  return findings.map((f: Record<string, unknown>, i: number) => ({
    id: String(f.id || `ruff-${i}`),
    severity: (f.severity as SeverityLevel) || ('low' as SeverityLevel),
    title: String(f.title || 'Ruff finding'),
    description: String(f.description || 'No description'),
    file: String(f.file || 'unknown'),
    line: Number(f.line || 0),
    tool: 'Ruff',
    recommendation: String(f.recommendation || 'Fix lint violation'),
  }));
}

function mapEslintFindings(eslintRaw: Record<string, unknown>): Finding[] {
  const findings = (eslintRaw.findings as Array<Record<string, unknown>>) || [];
  return findings.map((f: Record<string, unknown>, i: number) => ({
    id: String(f.id || `eslint-${i}`),
    severity: (f.severity as SeverityLevel) || ('low' as SeverityLevel),
    title: String(f.title || 'ESLint finding'),
    description: String(f.description || 'No description'),
    file: String(f.file || 'unknown'),
    line: Number(f.line || 0),
    tool: 'ESLint',
    recommendation: String(f.recommendation || 'Review and fix manually'),
  }));
}

function semgrepToScanResult(semgrepRaw: Record<string, unknown>): LastScan {
  const findings = (semgrepRaw.findings as Array<Record<string, unknown>>) || [];
  const errors = (semgrepRaw.errors as Array<Record<string, unknown>>) || [];
  const scannedFiles = (semgrepRaw.scannedFiles as number) || 0;

  const mappedFindings = findings.map((f: Record<string, unknown>, i: number) => ({
    id: `sem-${i}`,
    severity: ((f.extra as Record<string, unknown>)?.severity as SeverityLevel) || 'medium' as SeverityLevel,
    title: String((f.extra as Record<string, unknown>)?.message || f.check_id || 'Finding'),
    description: String((f.extra as Record<string, unknown>)?.lines || f.path || 'No description'),
    file: String(f.path || 'unknown'),
    line: Number((f.start as Record<string, unknown>)?.line || 0),
    tool: 'Semgrep',
    recommendation: String((f.extra as Record<string, unknown>)?.fix || 'Review and fix manually'),
  }));

  const mappedErrors = errors.map((e: Record<string, unknown>, i: number) => ({
    id: `err-${i}`,
    severity: 'low' as SeverityLevel,
    title: String(e.type || 'Scan Error'),
    description: String(e.message || 'Error during analysis'),
    file: String((e.path as string) || 'unknown'),
    line: Number((e.start as Record<string, unknown>)?.line || 0),
    tool: 'Semgrep',
    recommendation: 'Check file syntax and encoding. Re-run after fixing.',
  }));

  const total = mappedFindings.length + mappedErrors.length;
  const critical = mappedFindings.filter(f => f.severity === 'critical').length;
  const high = mappedFindings.filter(f => f.severity === 'high').length;
  const medium = mappedFindings.filter(f => f.severity === 'medium').length;

  const securityScore = Math.max(0, 100 - critical * 25 - high * 12 - medium * 5);
  const codeQualityScore = Math.max(0, 100 - mappedErrors.length * 3);
  const overallScore = Math.round((securityScore + codeQualityScore + 60) / 3);

  return {
    overallScore,
    scanDate: new Date().toISOString(),
    securityScore,
    codeQualityScore,
    architectureScore: 50,
    skillScore: 0,
    metrics: {
      totalFiles: scannedFiles,
      linesOfCode: 0,
      testCoverage: 0,
      avgComplexity: 0,
      duplication: 0,
    },
    findings: [...mappedFindings, ...mappedErrors],
    dependencies: {
      upToDate: 0,
      outdated: 0,
      vulnerable: 0,
    },
  };
}

export function useScan() {
  const [scanState, setScanState] = useState<ScanState | null>(null);
  const [result, setResult] = useState<LastScan | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [scanTarget, setScanTarget] = useState<{ id: string; name: string } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const clearIntervals = () => {
    if (pollRef.current) clearInterval(pollRef.current);
  };

  useEffect(() => {
    return () => clearIntervals();
  }, []);

  const startScan = useCallback(async (repo: { id: string; name: string; fullName: string; language?: string; private?: boolean; defaultBranch?: string; htmlUrl?: string }) => {
    if (isScanning) return;
    clearIntervals();
    setIsScanning(true);
    setResult(null);
    setActiveAnalysisId(null);
    setScanTarget({ id: String(repo.id), name: repo.name });

    let finishing = false;
    let pendingResult: LastScan | null = null;

    const buildSteps = (currentIdx: number): ScanStep[] =>
      STAGES.map((s, i) => ({
        name: s.name,
        status: i < currentIdx ? 'done' : i === currentIdx ? 'running' : 'pending',
      }));

    setScanState({
      steps: buildSteps(0),
      progress: 0,
      stage: STAGES[0].name,
      message: STAGES[0].message,
    });

    try {
      const res = await startAnalysis({
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        private: repo.private ?? false,
        language: repo.language || undefined,
        defaultBranch: repo.defaultBranch || 'main',
        htmlUrl: repo.htmlUrl || `https://github.com/${repo.fullName}`,
      });

      const analysisId = String(res.analysis.id);
      setActiveAnalysisId(analysisId);

      const poll = async () => {
        try {
          const statusRes = await getAnalysis(analysisId);
          const analysis = statusRes.analysis as Record<string, unknown>;
          const status = analysis.status as string;
          const realProgress = Number(analysis.progress ?? 0);
          const realStep = String(analysis.currentStep ?? '');
          const det = (analysis.deterministicResults as Record<string, unknown>) || {};
          const semgrep = (det.semgrep as Record<string, unknown>) || {};
          const hasResults = Boolean(det.semgrep || det.bandit || det.ruff || det.eslint);

          if (status === 'running' || status === 'pending') {
            const matchedIdx = STAGES.findIndex(s =>
              realStep.toLowerCase().includes(s.name.toLowerCase())
            );
            const stageIdx = matchedIdx >= 0 ? matchedIdx : 0;
            setScanState({
              steps: buildSteps(stageIdx),
              progress: Math.max(realProgress, (stageIdx / STAGES.length) * 100),
              stage: STAGES[stageIdx]?.name ?? realStep,
              message: STAGES[stageIdx]?.message ?? realStep,
            });
          }

          if ((status === 'completed' && (hasResults || semgrep.findings !== undefined)) || status === 'failed') {
            if (finishing) return true;
            finishing = true;
            if (pollRef.current) clearInterval(pollRef.current);
            if (status !== 'failed') {
              pendingResult = status === 'completed' ? mergeScannerResults(det) : null;
            }
            // Only set to 100% when backend actually completed
            setScanState({
              steps: STAGES.map(s => ({ name: s.name, status: 'done' as const })),
              progress: 100,
              stage: 'Complete',
              message: 'Audit complete',
            });
            setTimeout(() => {
              setScanState(null);
              setIsScanning(false);
              if (pendingResult) setResult(pendingResult);
              setActiveAnalysisId(null);
            }, 600);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      };

      const done = await poll();
      if (!done) {
        pollRef.current = setInterval(() => {
          poll().then(finished => {
            if (finished && pollRef.current) clearInterval(pollRef.current);
          });
        }, 3000);
      }
    } catch (err: unknown) {
      clearIntervals();
      setScanState(null);
      setIsScanning(false);
      setActiveAnalysisId(null);
      throw err;
    }
  }, [isScanning]);

  const startLocalScan = useCallback(async (files: File[]) => {
    if (isScanning) return;
    // Check quota before starting (local scans count toward the limit)
    try {
      const quota = await getScanRateLimit();
      if (!quota.canScan) {
        throw new Error(`Scan limit reached. You can run 3 scans per 48 hours.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Quota check failed.';
      if (msg.includes('limit reached')) throw err;
      // On network error, still allow scan — fail open
    }
    clearIntervals();
    setIsScanning(true);
    setResult(null);
    setActiveAnalysisId(null);
    setScanTarget({ id: 'local-upload', name: 'Local Upload' });

    let finishing = false;
    let pendingResult: LastScan | null = null;

    const buildSteps = (currentIdx: number): ScanStep[] =>
      STAGES.map((s, i) => ({
        name: s.name,
        status: i < currentIdx ? 'done' : i === currentIdx ? 'running' : 'pending',
      }));

    setScanState({
      steps: buildSteps(0),
      progress: 0,
      stage: STAGES[0].name,
      message: STAGES[0].message,
    });

    try {
      pendingResult = await analyzeLocalFiles(files);
      if (finishing) return;
      finishing = true;
      // Only set to 100% when analysis actually completed
      setScanState({
        steps: STAGES.map(s => ({ name: s.name, status: 'done' as const })),
        progress: 100,
        stage: 'Complete',
        message: 'Audit complete',
      });
      setTimeout(() => {
        setScanState(null);
        setIsScanning(false);
        if (pendingResult) setResult(pendingResult);
        setActiveAnalysisId(null);
      }, 600);
    } catch (err) {
      clearIntervals();
      setScanState(null);
      setIsScanning(false);
      setActiveAnalysisId(null);
      throw err;
    }
  }, [isScanning]);

  const cancelScan = useCallback(() => {
    clearIntervals();
    setIsScanning(false);
    setScanState(null);
    setActiveAnalysisId(null);
    setScanTarget(null);
  }, []);

  return { scanState, result, isScanning, startScan, startLocalScan, cancelScan, activeAnalysisId, scanTarget };
}
