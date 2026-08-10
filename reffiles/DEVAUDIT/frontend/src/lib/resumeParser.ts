'use client';

import { EducationItem, ProjectItem, ExperienceLevel } from '@/types';
import { normalizeTechName, allTechOptions } from '@/lib/techConfig';

export interface ParsedResume {
  name: string;
  bio: string;
  education: EducationItem[];
  projects: ProjectItem[];
  skills: string[];
  experience: string;
  /** Inferred seniority bucket, so onboarding can auto-fill the "Role" field
   *  the same way it auto-fills skills — previously only skills loaded from a parsed resume. */
  experienceLevel?: ExperienceLevel;
  isValid: boolean;
  error?: string;
}

const RESUME_KEYWORDS = [
  'education', 'university', 'college', 'degree', 'bachelor', 'master', 'bs', 'ba', 'ms', 'phd',
  'experience', 'work', 'job', 'employer', 'employment', 'position', 'role',
  'skills', 'technologies', 'proficient', 'programming', 'language',
  'project', 'projects', 'portfolio', 'github',
  'summary', 'objective', 'resume', 'cv',
];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// ── Text extraction ──────────────────────────────────────────────────────────

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let line = '';
    const lines: string[] = [];
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = '';
      }
      line += (line && !line.endsWith(' ') ? ' ' : '') + item.str;
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    pages.push(lines.join('\n'));
  }

  return pages.join('\n\n');
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

async function extractTxtText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsText(file);
  });
}

async function extractText(file: File): Promise<string> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.toLowerCase().endsWith('.docx');

  if (isPdf) return extractPdfText(file);
  if (isDocx) return extractDocxText(file);
  return extractTxtText(file);
}

// ── Lightweight local "professionalizing" pass ───────────────────────────────

const ABBREVIATIONS: Record<string, string> = {
  'yrs': 'years', 'yr': 'year', 'exp': 'experience', 'mgmt': 'management',
  'dev': 'developer', 'sr': 'senior', 'jr': 'junior', 'eng': 'engineer',
  'univ': 'university', 'dept': 'department', 'tech': 'technology',
  'w/': 'with', "b.s.": 'BS', "m.s.": 'MS', "b.a.": 'BA', "m.a.": 'MA',
  "b.tech": 'BTech', "m.tech": 'MTech', "b.e.": 'BE', "m.e.": 'ME',
};

function collapseWhitespace(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +\n/g, '\n')
    .trim();
}

function expandAbbreviations(text: string): string {
  return text.replace(/\b([a-zA-Z.]+)\b/g, (word) => {
    const key = word.toLowerCase();
    return ABBREVIATIONS[key] ?? word;
  });
}

function professionalizeSentence(raw: string): string {
  let text = collapseWhitespace(raw);
  if (!text) return text;
  text = expandAbbreviations(text);
  text = text.replace(/^[a-z]/, (c) => c.toUpperCase());
  text = text.replace(/\s+([,.;:])/g, '$1').replace(/([,.;:])(?=[^\s])/g, '$1 ');
  text = text.replace(/^[•\-*·▪]+\s*/, '').trim();
  return text;
}

function titleCaseProperNoun(raw: string): string {
  const text = collapseWhitespace(raw);
  if (!text) return text;
  return text
    .split(' ')
    .map((word) => {
      if (!word) return word;
      if (/^[A-Z0-9.&-]{2,}$/.test(word)) return word;
      const lower = word.toLowerCase();
      if (['of', 'and', 'the', 'in', 'at', 'for', 'a', 'an', 'on', 'with', 'to'].includes(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ')
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

function extractLines(text: string) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

function looksLikeResume(text: string): boolean {
  const lower = text.toLowerCase();
  const matches = RESUME_KEYWORDS.filter(k => lower.includes(k)).length;
  return matches >= 3 && text.length > 200;
}

const SECTION_HEADERS = {
  education: /^(education|academic background|academic qualifications|qualifications|educational background)\s*:?$/i,
  experience: /^(experience|work experience|professional experience|employment history|career history)\s*:?$/i,
  skills: /^(skills|technical skills|technologies|core competencies|tech stack|key skills)\s*:?$/i,
  projects: /^(projects|personal projects|side projects|selected projects|academic projects|technical projects|project work)\s*:?$/i,
  summary: /^(summary|objective|about me|profile|professional summary)\s*:?$/i,
  other: /^(references|certifications|awards|interests|languages|publications|achievements|extra.?curricular|activities)\s*:?$/i,
};

function isAnySectionHeader(line: string): boolean {
  return Object.values(SECTION_HEADERS).some((re) => re.test(line));
}

function sliceSection(lines: string[], header: RegExp): string[] {
  const out: string[] = [];
  let inSection = false;
  for (const line of lines) {
    if (header.test(line)) { inSection = true; continue; }
    if (inSection && isAnySectionHeader(line)) break;
    if (inSection) out.push(line);
  }
  return out;
}

// ── Date parsing ─────────────────────────────────────────────────────────────

const MONTHS = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)';

const DATE_RANGE_RE = new RegExp(
  `(${MONTHS})?[a-z.\\/]*\\s*(\\d{4})\\s*[-–—to\\/]+\\s*(present|current|now|ongoing|(${MONTHS})?[a-z.\\/]*\\s*(\\d{4}))`,
  'i'
);

const LOOSE_DATE_RE = /\b(\d{1,2}[\/\-.])?(\d{4})\b/g;

function parseDateRange(line: string): { start: string; end: string; isPresent: boolean } | null {
  const m = line.match(DATE_RANGE_RE);
  if (!m) return null;
  const startYear = m[3];
  const endStr = m[4] || '';
  const isPresent = /present|current|now|ongoing/i.test(endStr);
  const endYear = isPresent ? '' : (endStr.match(/\d{4}/)?.[0] ?? '');
  return {
    start: `${startYear}-01-01`,
    end: endYear ? `${endYear}-01-01` : '',
    isPresent,
  };
}

const EDU_DATE_RE = /(\d{4})(?:\s*[-–—to]+\s*(present|current|now|ongoing|\d{4}))?/i;

function parseEducationDate(line: string): { start: string; end: string; isPresent: boolean } | null {
  const m = line.match(EDU_DATE_RE);
  if (!m) return null;
  const startYear = m[1];
  const endStr = m[2] || '';
  const isPresent = /present|current|now|ongoing/i.test(endStr);
  const endYear = isPresent ? '' : (endStr.match(/\d{4}/)?.[0] ?? '');
  return {
    start: `${startYear}-01-01`,
    end: endYear ? `${endYear}-01-01` : '',
    isPresent,
  };
}

function findYearInText(text: string): string {
  const m = text.match(LOOSE_DATE_RE);
  if (!m) return '';
  // Prefer the last year in the text (most likely graduation/ending year)
  const years = m.map(s => s.match(/\d{4}/)?.[0]).filter(Boolean) as string[];
  return years[years.length - 1] || '';
}

// ── Education extraction ────────────────────────────────────────────────────

const INSTITUTION_KEYWORDS = /\b(university|college|institute|institution|school of|academy|polytechnic)\b/i;
const IGNORED_DEGREE_KEYWORDS = /cgpa|gpa|grade|expected graduation|graduation|percentage|score|cum laude|honors|honours|dean'?s list/i;

const DEGREE_RE = /(bachelor'?s?|master'?s?|ph\.?d\.?|doctorate|mba|b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|diploma|associate|undergraduate|graduate)\s*(?:degree|of|in)?\s*[,-]?\s*(.+)/i;
const DEGREE_ONLY_RE = /\b(bachelor'?s?|master'?s?|ph\.?d\.?|doctorate|mba|b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|diploma|associate|undergraduate|graduate)\b/i;
const FIELD_RE = /\b(computer science|computer engineering|software engineering|information technology|data science|artificial intelligence|machine learning|electronics|electrical|mechanical|civil|business|finance|marketing|mathematics|physics|biology|chemistry|economics|psychology|design|arts|commerce|accounting|law|medicine|pharmacy|biotechnology|robotics|cyber security|cybersecurity|cloud computing|web development|mobile development|game development|information systems|human-computer interaction|hci|embedded systems|signal processing|control systems|aeronautics|astrophysics|biomedical)\b/i;

function isInstitutionLine(line: string) {
  return INSTITUTION_KEYWORDS.test(line);
}

function cleanInstitutionName(name: string): string {
  return titleCaseProperNoun(name.replace(/\d{4}.*$/, '').replace(/[-–—|].*$/, '').replace(/,\s*$/, '').trim());
}

function extractDegreeAndField(line: string): { degree: string; field: string } | null {
  if (IGNORED_DEGREE_KEYWORDS.test(line)) return null;
  const m = line.match(DEGREE_RE);
  if (m) {
    const degree = titleCaseProperNoun(m[1].replace(/\.$/, ''));
    const rawField = m[2].replace(/[-–—|].*$/, '').replace(/\(.*\)/, '').replace(/\d{4}.*$/, '').replace(/,/g, ' ').trim();
    const field = titleCaseProperNoun(rawField);
    return { degree, field };
  }

  // Degree only, field might be on the next line or after the institution name
  const dm = line.match(DEGREE_ONLY_RE);
  if (dm) {
    const degree = titleCaseProperNoun(dm[1]);
    const field = titleCaseProperNoun(line.replace(DEGREE_ONLY_RE, '').replace(/[-–—|].*$/, '').replace(/\d{4}.*$/, '').replace(/,/g, ' ').trim());
    return { degree, field };
  }

  return null;
}

function extractEducation(lines: string[]): EducationItem[] {
  const education: EducationItem[] = [];
  const section = sliceSection(lines, SECTION_HEADERS.education);

  let current: EducationItem | null = null;
  let lastInstitutionLine: string | null = null;
  let pendingDegreeField: { degree: string; field: string } | null = null;

  for (let i = 0; i < section.length; i++) {
    const line = section[i];
    if (IGNORED_DEGREE_KEYWORDS.test(line) && !isInstitutionLine(line)) continue;

    const range = parseEducationDate(line);
    if (range) {
      // Close out the previous entry before starting a new one.
      if (current) {
        current.description = professionalizeSentence(current.description || '') || '';
        if (pendingDegreeField && !current.degree && !current.field) {
          current.degree = pendingDegreeField.degree;
          current.field = pendingDegreeField.field;
        }
      }

      const beforeDate = line.replace(EDU_DATE_RE, '').replace(/[-–—,|]+$/, '').trim();
      let institution = cleanInstitutionName(beforeDate || lastInstitutionLine || '');
      if (!institution && lastInstitutionLine) institution = titleCaseProperNoun(lastInstitutionLine);
      if (!institution) institution = '';

      // Try to extract degree/field from the line itself
      let degree = '';
      let field = '';
      const df = extractDegreeAndField(line);
      if (df) {
        degree = df.degree;
        field = df.field;
      } else {
        // Use the non-institution, non-date parts as degree/field candidates
        const parts = line.split(/\s*[—–|]\s*|,\s*/).filter(Boolean);
        const nonDateParts = parts.filter(
          (p) => !EDU_DATE_RE.test(p) && !IGNORED_DEGREE_KEYWORDS.test(p) && p.toLowerCase() !== institution.toLowerCase()
        );
        if (nonDateParts[0]) degree = titleCaseProperNoun(nonDateParts[0]);
        if (nonDateParts[1]) field = titleCaseProperNoun(nonDateParts[1]);
      }

      // If a degree/field was found on the previous line, apply it and then consume it
      if (pendingDegreeField && !degree) {
        degree = pendingDegreeField.degree;
        if (!field) field = pendingDegreeField.field;
      }
      pendingDegreeField = null;

      if (current && current.institution && !current.startDate && institution && current.institution.toLowerCase() === institution.toLowerCase()) {
        // Same institution as a previous pending entry — attach date
        current.startDate = range.start;
        current.endDate = range.end;
        current.isPresent = range.isPresent;
        if (degree && !current.degree) current.degree = degree;
        if (field && !current.field) current.field = field;
      } else if (current && !current.institution && !current.startDate) {
        // Attach to an institution-less pending entry
        current.institution = institution || current.institution;
        current.startDate = range.start;
        current.endDate = range.end;
        current.isPresent = range.isPresent;
        if (degree && !current.degree) current.degree = degree;
        if (field && !current.field) current.field = field;
      } else {
        current = {
          id: generateId(),
          institution,
          degree,
          field,
          startDate: range.start,
          endDate: range.end,
          isPresent: range.isPresent,
          description: '',
        };
        education.push(current);
      }
      lastInstitutionLine = null;
      pendingDegreeField = null;
      continue;
    }

    // A non-date line that names an institution starts a new entry.
    if (isInstitutionLine(line)) {
      if (current) {
        current.description = professionalizeSentence(current.description || '') || '';
        if (pendingDegreeField && !current.degree && !current.field) {
          current.degree = pendingDegreeField.degree;
          current.field = pendingDegreeField.field;
        }
      }
      pendingDegreeField = null;
      const df = extractDegreeAndField(line);
      current = {
        id: generateId(),
        institution: cleanInstitutionName(line),
        degree: df?.degree ?? '',
        field: df?.field ?? '',
        startDate: '',
        endDate: '',
        isPresent: false,
        description: '',
      };
      education.push(current);
      lastInstitutionLine = line;
      continue;
    }

    // Non-date lines under an education entry are degree, field, or description/bullets.
    if (current && line.length > 2) {
      const df = extractDegreeAndField(line);
      if (df) {
        // Prefer a degree/field line that was separated from the institution/date
        if (!current.degree) current.degree = df.degree;
        if (!current.field && df.field) current.field = df.field;
        pendingDegreeField = df;
        continue;
      }

      // Maybe a raw field mention like "Computer Science"
      const fm = line.match(FIELD_RE);
      if (fm && !current.field) {
        current.field = titleCaseProperNoun(fm[1]);
      }

      const desc = professionalizeSentence(line.replace(/https?:\/\/\S+/, '').trim());
      if (desc) {
        current.description = current.description ? `${current.description} ${desc}` : desc;
      }
    } else if (!current && line.length > 2) {
      // Degree/field before any institution was seen
      const df = extractDegreeAndField(line);
      if (df) pendingDegreeField = df;
    }
  }

  if (current) {
    current.description = professionalizeSentence(current.description || '') || '';
    if (pendingDegreeField && !current.degree && !current.field) {
      current.degree = pendingDegreeField.degree;
      current.field = pendingDegreeField.field;
    }
  }

  // Fallback: scan whole text for any institution if the section approach failed
  if (education.length === 0) {
    const wholeText = lines.join(' ');
    const uniMatch = wholeText.match(/(university|college|institute|school of)\s+(of\s+)?([a-z\s,&.']{2,60})/i);
    if (uniMatch) {
      education.push({
        id: generateId(),
        institution: cleanInstitutionName(uniMatch[0]),
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        isPresent: false,
        description: '',
      });
    }
  }

  return education;
}

// ── Project extraction ───────────────────────────────────────────────────────

const ACTIVITY_KEYWORDS = /\b(participated|participant|member|volunteer|activity|activities|club|society|chapter|event|events|organized|organised|coordinator|co-ordinator|attended|workshop|seminar|conference|fest|competition|contest|hackathon participant|cultural|sports|academic|achievements|extracurricular|extra-curricular|responsibilities|position|role|leadership|served as|office bearer|coordinator)\b/i;

const PROJECT_TITLE_MARKERS = /\b(app|application|platform|system|website|site|web|tool|dashboard|api|service|bot|ml|ai|e-commerce|ecommerce|marketplace|portfolio|game|engine|library|framework|extension|plugin|script|analyzer|generator|classifier|predictor|recommender|chatbot|blockchain|crypto|wallet|exchange|crm|erp|cms|saas|solution|product|interface|client|server|database|mobile|desktop|frontend|backend|fullstack|full-stack|full stack|neural|machine learning|deep learning|computer vision|nlp|genai|llm|open source|os|package|sdk|toolkit|module|utility|suite|workflow|pipeline|automator)\b/i;

function looksLikeProjectTitle(line: string): boolean {
  const clean = line.replace(/^[•\-*·▪]\s*/, '').trim();
  if (clean.length < 2 || clean.length > 80) return false;
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 12) return false;
  if (ACTIVITY_KEYWORDS.test(clean)) return false;
  const hasProjectMarker = PROJECT_TITLE_MARKERS.test(clean);
  const hasUrl = /https?:\/\/\S+|github\.com/i.test(clean);
  const hasDate = DATE_RANGE_RE.test(clean);
  const isTitleCase = words.filter(w => w[0] === w[0].toUpperCase()).length / words.length >= 0.6;
  if (hasProjectMarker || hasUrl || hasDate || (isTitleCase && words.length <= 6 && !/^[a-z]/.test(clean))) return true;
  // Lenient fallback: any title-case line with 2+ words that isn't a date-only or URL-only line
  return isTitleCase && words.length >= 2 && words.length <= 8 && !/^[a-z]/.test(clean) && !/^\d/.test(clean);
}

function isBulletLine(line: string): boolean {
  return /^[•\-*·▪]\s*/.test(line);
}

function extractProjectName(line: string): string {
  return titleCaseProperNoun(line.replace(DATE_RANGE_RE, '').replace(/https?:\/\/\S+/, '').replace(/[-–—,|]+$/, '').trim());
}

function extractProjectTechnologies(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const tech of allTechOptions) {
    const aliases = [tech.toLowerCase(), tech.toLowerCase().replace(/\s+/g, ''), tech.toLowerCase().replace(/\./g, '')];
    if (aliases.some(a => lower.includes(a))) found.add(normalizeTechName(tech));
  }
  return Array.from(found).slice(0, 8);
}

function extractProjects(lines: string[]): ProjectItem[] {
  const projects: ProjectItem[] = [];
  const section = sliceSection(lines, SECTION_HEADERS.projects);

  let current: ProjectItem | null = null;
  let pendingTitle: string | null = null;
  let prevLineWasTitle = false;

  for (let i = 0; i < section.length; i++) {
    const line = section[i];
    const cleanLine = line.replace(/^[•\-*·▪]\s*/, '').trim();
    if (!cleanLine) continue;

    // Skip obvious non-project activity lines unless they look like a real project title
    if (ACTIVITY_KEYWORDS.test(cleanLine) && !looksLikeProjectTitle(line)) {
      continue;
    }

    const range = parseDateRange(line);
    const urlMatch = line.match(/https?:\/\/\S+/);

    // Date range on a line -> create project from the non-date part
    if (range) {
      const name = extractProjectName(line);
      if (name && !isBulletLine(line) && !ACTIVITY_KEYWORDS.test(name)) {
        current = {
          id: generateId(),
          name,
          description: '',
          url: urlMatch?.[0] || '',
          startDate: range.start,
          endDate: range.end,
          isPresent: range.isPresent,
          technologies: [],
        };
        projects.push(current);
      } else if (current) {
        // Date line is just context for the current project
        current.startDate = range.start;
        current.endDate = range.end;
        current.isPresent = range.isPresent;
      }
      pendingTitle = null;
      prevLineWasTitle = true;
      continue;
    }

    // URL that looks like a project title
    if (urlMatch && looksLikeProjectTitle(line)) {
      const name = extractProjectName(line);
      current = {
        id: generateId(),
        name: name || 'Project',
        description: '',
        url: urlMatch[0],
        startDate: '',
        endDate: '',
        isPresent: false,
        technologies: [],
      };
      projects.push(current);
      pendingTitle = null;
      prevLineWasTitle = true;
      continue;
    }

    // Title-looking line without date
    if (looksLikeProjectTitle(line) && !isBulletLine(line)) {
      // Flush any pending title as a new project
      if (pendingTitle && !current) {
        current = {
          id: generateId(),
          name: titleCaseProperNoun(pendingTitle),
          description: '',
          url: '',
          startDate: '',
          endDate: '',
          isPresent: false,
          technologies: [],
        };
        projects.push(current);
      }
      pendingTitle = cleanLine;
      prevLineWasTitle = true;
      continue;
    }

    // Description or URL for current project
    const isBullet = isBulletLine(line);
    if (current && (isBullet || !looksLikeProjectTitle(line))) {
      if (urlMatch && !current.url) current.url = urlMatch[0];
      const desc = professionalizeSentence(cleanLine.replace(/https?:\/\/\S+/, '').trim());
      if (desc) {
        current.description = current.description ? `${current.description} ${desc}` : desc;
      }
      prevLineWasTitle = false;
      continue;
    }

    // A bullet line with a pending title -> create project and attach description
    if (pendingTitle && isBullet) {
      current = {
        id: generateId(),
        name: titleCaseProperNoun(pendingTitle),
        description: '',
        url: '',
        startDate: '',
        endDate: '',
        isPresent: false,
        technologies: [],
      };
      projects.push(current);
      pendingTitle = null;
      const desc = professionalizeSentence(cleanLine.replace(/https?:\/\/\S+/, '').trim());
      if (desc) current.description = desc;
      prevLineWasTitle = false;
      continue;
    }
  }

  // Flush any remaining pending title
  if (pendingTitle && !current) {
    current = {
      id: generateId(),
      name: titleCaseProperNoun(pendingTitle),
      description: '',
      url: '',
      startDate: '',
      endDate: '',
      isPresent: false,
      technologies: [],
    };
    projects.push(current);
  }

  // Extract technologies from each project's description and name
  for (const proj of projects) {
    proj.technologies = extractProjectTechnologies(`${proj.name} ${proj.description}`);
  }

  return projects;
}

// ── Skills extraction ──────────────────────────────────────────────────────

const SKILL_LIBRARY = [
  ...allTechOptions.map(t => t.toLowerCase()),
  'python', 'javascript', 'typescript', 'react', 'react native', 'node', 'node.js', 'sql', 'nosql',
  'postgresql', 'mysql', 'sqlite', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'go', 'golang',
  'rust', 'java', 'c++', 'c#', 'c', 'swift', 'kotlin', 'flutter', 'dart', 'angular', 'vue', 'svelte',
  'next.js', 'nuxt', 'fastapi', 'django', 'flask', 'express', 'spring', 'spring boot', 'mongodb',
  'redis', 'graphql', 'rest api', 'terraform', 'ci/cd', 'github actions', 'jenkins', 'git', 'linux',
  'bash', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'opencv', 'langchain', 'openai',
  'html', 'css', 'sass', 'tailwind', 'webpack', 'vite', 'jest', 'cypress', 'playwright', 'figma',
  'agile', 'scrum', 'microservices', 'kafka', 'rabbitmq', 'elasticsearch', 'firebase', 'supabase',
  'php', 'ruby', 'rails', 'laravel', 'nestjs', 'kafka', 'hadoop', 'spark', 'airflow', 'mlflow',
  'hugging face', 'transformers', 'llm', 'genai', 'nlp', 'computer vision', 'deep learning', 'machine learning',
  'data science', 'analytics', 'bigquery', 'snowflake', 'databricks', 'tableau', 'powerbi', 'excel',
];

function extractSkills(lines: string[], wholeText: string): string[] {
  const found = new Set<string>();

  // 1) Prefer an explicit skills section
  const section = sliceSection(lines, SECTION_HEADERS.skills);
  for (const line of section) {
    line
      .split(/[,•|;·]/)
      .map((s) => s.replace(/^[-*\s]+/, '').trim())
      .filter((s) => s.length > 1 && s.length < 35)
      .forEach((s) => {
        const normalized = normalizeTechName(s);
        found.add(normalized);
      });
  }

  // 2) Sweep the whole document for known technologies
  const lower = wholeText.toLowerCase();
  for (const skill of SKILL_LIBRARY) {
    if (lower.includes(skill)) {
      found.add(normalizeTechName(skill));
    }
  }

  return Array.from(found)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function extractExperienceText(lines: string[]): string {
  const section = sliceSection(lines, SECTION_HEADERS.experience);
  const professionalized = section
    .filter((l) => l.length > 1)
    .map((l) => professionalizeSentence(l))
    .filter(Boolean);
  return professionalized.slice(0, 12).join('\n');
}

function extractName(lines: string[], wholeText: string): string {
  const nameLabel = wholeText.match(/(?:^|\n)\s*name\s*[:\-]\s*([A-Za-z\s'.-]{2,50})(?:\n|$)/i);
  if (nameLabel) return titleCaseProperNoun(nameLabel[1].trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 60) continue;
    if (trimmed.match(/^(resume|cv|curriculum|vitae|name|email|phone|address|linkedin|github)\s*:?$/i)) continue;
    if (trimmed.includes('@') || trimmed.includes('http') || trimmed.includes('|')) continue;
    if (/^\d+$/.test(trimmed)) continue;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4 && /^[A-Za-z\s'.-]+$/.test(trimmed)) {
      return titleCaseProperNoun(trimmed);
    }
  }
  return '';
}

function extractBio(lines: string[]): string {
  const section = sliceSection(lines, SECTION_HEADERS.summary);
  const bio = section
    .filter((l) => l.length > 2)
    .map((l) => professionalizeSentence(l))
    .filter(Boolean)
    .join(' ');
  return bio.slice(0, 600);
}

function estimateYearsOfExperience(lines: string[]): number {
  const section = sliceSection(lines, SECTION_HEADERS.experience);
  let earliestStart = Infinity;
  let latestEnd = -Infinity;
  let hasPresent = false;

  for (const line of section) {
    const range = parseDateRange(line);
    if (!range) continue;
    const startYear = parseInt(range.start.slice(0, 4), 10);
    if (!Number.isNaN(startYear)) earliestStart = Math.min(earliestStart, startYear);
    if (range.isPresent) {
      hasPresent = true;
    } else if (range.end) {
      const endYear = parseInt(range.end.slice(0, 4), 10);
      if (!Number.isNaN(endYear)) latestEnd = Math.max(latestEnd, endYear);
    }
  }

  if (earliestStart === Infinity) return 0;
  const currentYear = new Date().getFullYear();
  const end = hasPresent ? currentYear : (latestEnd === -Infinity ? currentYear : latestEnd);
  return Math.max(0, end - earliestStart);
}

function inferExperienceLevel(
  years: number,
  wholeText: string,
  education: EducationItem[],
  experienceLines: string[],
): ExperienceLevel {
  const lower = wholeText.toLowerCase();
  if (/\bfreelance(r)?\b|\bindependent contractor\b|\bself-employed\b/.test(lower)) {
    return 'freelancer';
  }
  if (experienceLines.length === 0) {
    const stillStudying = education.some((e) => e.isPresent);
    if (stillStudying || /\bstudent\b/.test(lower)) return 'student';
  }
  if (years >= 8) return 'senior';
  if (years >= 2) return 'professional';
  return 'junior';
}

export async function parseResume(file: File): Promise<ParsedResume> {
  const empty: ParsedResume = { isValid: false, name: '', bio: '', education: [], projects: [], skills: [], experience: '' };

  let rawText: string;
  try {
    rawText = await extractText(file);
  } catch {
    return { ...empty, error: 'Could not read the file. Please try again or use a different format.' };
  }

  const text = collapseWhitespace(rawText);
  if (!looksLikeResume(text)) {
    return { ...empty, error: "That doesn't look like a resume. Please upload the correct document." };
  }

  const lines = extractLines(text);
  const name = extractName(lines, text);
  const bio = extractBio(lines);
  const education = extractEducation(lines);
  const projects = extractProjects(lines);
  const skills = extractSkills(lines, text);
  const experience = extractExperienceText(lines);
  const years = estimateYearsOfExperience(lines);
  const experienceLevel = inferExperienceLevel(years, text, education, sliceSection(lines, SECTION_HEADERS.experience));

  return {
    isValid: true,
    name,
    bio,
    education,
    projects,
    skills,
    experience,
    experienceLevel,
  };
}
