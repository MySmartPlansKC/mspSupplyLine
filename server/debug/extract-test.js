'use strict';

const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const FIXTURES_HINT = 'Please place one or more test submittal PDFs inside: server/debug/fixtures/';
const PREVIEW_LINE_COUNT = 75;
const INDEX_PAD_WIDTH = 3;

function normalizeLines(rawText) {
  return rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function formatLineIndex(index) {
  return String(index).padStart(INDEX_PAD_WIDTH, '0');
}

function findFirstPdfInFixtures() {
  if (!fs.existsSync(FIXTURES_DIR)) {
    return null;
  }

  const pdfFiles = fs
    .readdirSync(FIXTURES_DIR)
    .filter((file) => file.toLowerCase().endsWith('.pdf'));

  if (pdfFiles.length === 0) {
    return null;
  }

  const fileName = pdfFiles[0];
  return {
    fileName,
    pdfPath: path.join(FIXTURES_DIR, fileName),
  };
}

function printDashboard(pdfPath, fileName, rawText, normalizedLines) {
  const separator = '='.repeat(72);

  console.log(separator);
  console.log('PDF Text Extraction Diagnostic');
  console.log(separator);
  console.log(`Active submittal : ${fileName}`);
  console.log(`Source file      : ${pdfPath}`);
  console.log(`Raw text length (characters) : ${rawText.length}`);
  console.log(`Normalized line count        : ${normalizedLines.length}`);
  console.log(separator);
  console.log(`First ${Math.min(PREVIEW_LINE_COUNT, normalizedLines.length)} normalized lines:`);
  console.log(separator);

  const previewLines = normalizedLines.slice(0, PREVIEW_LINE_COUNT);
  previewLines.forEach((line, index) => {
    console.log(`Line [${formatLineIndex(index + 1)}]: "${line}"`);
  });

  if (normalizedLines.length > PREVIEW_LINE_COUNT) {
    console.log(separator);
    console.log(
      `... ${normalizedLines.length - PREVIEW_LINE_COUNT} additional line(s) not shown.`
    );
  }

  console.log(separator);
}

async function main() {
  try {
    const target = findFirstPdfInFixtures();
    if (!target) {
      console.warn(FIXTURES_HINT);
      return;
    }

    const { pdfPath, fileName } = target;

    const fileBuffer = fs.readFileSync(pdfPath);
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('PDF file buffer is empty after read.');
    }

    const pdfParse = require('pdf-parse');
    const data = await pdfParse(fileBuffer);

    const rawText = typeof data.text === 'string' ? data.text : '';
    const normalizedLines = normalizeLines(rawText);

    printDashboard(pdfPath, fileName, rawText, normalizedLines);
  } catch (error) {
    console.error('[extract-test] Diagnostic run failed.');
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

main();
