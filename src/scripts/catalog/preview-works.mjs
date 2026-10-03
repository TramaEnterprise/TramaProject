import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { normalize, classify } from "./preview-bne.mjs";

const inputPath = resolve(
  process.argv[2] ?? "data/catalog/raw/monomodernas-JSON.json"
);

const limit = 100_000;

function keyText(value) {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

function groupingKey(record) {
  // Las obras anónimas no se unen solo por compartir título.
  if (
    record.authorshipStatus !== "identified" ||
    record.authorNames.length === 0
  ) {
    return JSON.stringify(["single", record.sourceRecordId]);
  }

  return JSON.stringify([
    "title_authors",
    keyText(record.title).replace(/[.]+$/u, "").trim(),
    [...new Set(record.authorNames.map(keyText))].sort(),
  ]);
}

function sourceText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function detectGroupingSignals(record) {
  const fields = [
    ["title", record.title],
    ["editionStatement", record.editionStatement],
    ["responsibilityStatement", record.responsibilityStatement],
    ["notes", record.notes],
    ["contents", record.contents],
    ["forms", record.forms.join(" / ")],
  ];

  const rules = [
    [
      "adaptation",
      /\b(?:adaptaci[oó]n|adaptaciones|adaptaci[oó]|adaptacions|adaptad[oa]s?|adaptation|adapted|refundici[oó]n)(?![\p{L}\p{N}_])/iu,
    ],
    [
      "abridged",
      /\b(?:abreviad[oa]s?|abreujad[ae]s?|abridged|condensed)(?![\p{L}\p{N}_])/iu,
    ],
    [
      "selection_or_anthology",
      /\b(?:antolog[ií]as?|antholog(?:y|ies)|selecci[oó]n de|selecci[oó] de|obras escogidas|selected works)(?![\p{L}\p{N}_])/iu,
    ],
    [
      "numbered_part",
      /\b(?:tomo|volumen|vol\.|volume|parte|part)\s*(?:n[ºo.]?\s*)?(?:\d+|[ivxlcdm]+)(?![\p{L}\p{N}_])/iu,
    ],
  ];

  const signals = [];

  for (const [field, value] of fields) {
    for (const [code, pattern] of rules) {
      const match = pattern.exec(value);

      if (match) {
        signals.push({
          code,
          field,
          matchedText: match[0],
          sourceText: value,
        });
      }
    }
  }

  const multiVolume =
    /\b(?:[2-9]|\d{2,})\s*(?:v\.|vols?\.|volumenes\b|volúmenes\b|tomos\b)/iu
      .exec(record.extent);

  if (multiVolume) {
    signals.push({
      code: "multiple_volumes",
      field: "extent",
      matchedText: multiVolume[0],
      sourceText: record.extent,
    });
  }

  return signals;
}

function publication(record, raw) {
  const item = {
    sourceRecordId: record.sourceRecordId,
    title: record.title,
    authorNames: record.authorNames,
    publicationYear: record.publicationYear,
    language: record.languageRaw,
    publisher: record.publisher,

    editionStatement: sourceText(raw.edicion),
    seriesStatement: record.seriesStatement,
    responsibilityStatement: record.responsibilityStatement,

    notes: sourceText(raw.notas),
    contents: sourceText(raw.nota_de_contenido),
    extent: record.extentRaw,
    forms: record.forms,

    isbnCandidates: record.isbnCandidates,
    authorshipEvidence: record.authorshipEvidence,
  };

  return {
    ...item,
    groupingSignals: detectGroupingSignals(item),
  };
}

function makeProposal(records) {
  const spanish = records.filter((record) =>
    /^(?:español|castellano|spa|es)$/u.test(
      keyText(record.language)
    )
  );

  const pool = spanish.length > 0 ? spanish : records;

  const latestYear = Math.max(
    ...pool.map((record) => record.publicationYear)
  );

  const latest = pool.filter(
    (record) => record.publicationYear === latestYear
  );

  const selected = latest.length === 1 ? latest[0] : null;

  const groupingSignals = records.flatMap((record) =>
    record.groupingSignals.map((signal) => ({
        sourceRecordId: record.sourceRecordId,
        ...signal,
    }))
    );

    const groupingWarningCodes = [
    ...new Set(groupingSignals.map((signal) => signal.code)),
    ];

  return {
    status: "proposal_only",
    groupingBasis: "exact_title_and_author_names",

    originalPublicationYear: null,

    oldestObservedPublicationYear: Math.min(
      ...records.map((record) => record.publicationYear)
    ),

    selectionPreference: spanish.length > 0
      ? "latest_spanish_in_group"
      : "latest_any_language_in_group",

    selectedSourceRecordId:
      selected?.sourceRecordId ?? null,

    selectionCandidates: latest.map(
      (record) => record.sourceRecordId
    ),

    needsReview: true,

    groupingSignals,

    groupingWarningCodes,

    reviewReasons: [
    "confirm_same_work",

    ...(latest.length > 1
        ? ["same_year_selection_tie"]
        : []),

    ...groupingWarningCodes.map(
        (code) => `grouping_warning:${code}`
    ),
    ],

    publications: records,
  };
}

async function main() {
  const groups = new Map();
  const seenCandidateIds = new Set();

  const counts = {
    scanned: 0,
    candidate: 0,
    review: 0,
    excluded: 0,
  };

  const input = createReadStream(inputPath, {
    encoding: "utf8",
  });

  const reader = createInterface({
    input,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  try {
    for await (const line of reader) {
      lineNumber++;
      let value = line.trim();

      if (!value || value === "[" || value === "]") continue;

      // Este export de BNE contiene un objeto JSON por línea.
      if (value.startsWith("[")) value = value.slice(1).trim();
      if (value.endsWith("]")) value = value.slice(0, -1).trim();
      if (value.endsWith(",")) value = value.slice(0, -1).trim();

      let raw;

      try {
        raw = JSON.parse(value);
      } catch {
        throw new Error(
          `JSON no válido en la línea ${lineNumber}.`
        );
      }

      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error(
          `Registro inesperado en la línea ${lineNumber}.`
        );
      }

      const record = normalize(raw);
      const result = classify(raw, record);

      counts.scanned++;
      counts[result.bucket]++;

      if (result.bucket === "candidate") {
        if (seenCandidateIds.has(record.sourceRecordId)) {
          throw new Error(
            `Identificador candidato repetido: ${record.sourceRecordId}`
          );
        }

        seenCandidateIds.add(record.sourceRecordId);

        const key = groupingKey(record);
        const group = groups.get(key) ?? [];

        group.push(publication(record, raw));
        groups.set(key, group);
      }

      if (counts.scanned >= limit) break;
    }
  } finally {
    reader.close();
    input.destroy();
  }

  if (counts.scanned === 0) {
    throw new Error("No se han encontrado registros.");
  }

  const multiple = [...groups.values()]
    .filter((group) => group.length > 1)
    .map(makeProposal);

  const summary = {
    inputPath,
    generatedAt: new Date().toISOString(),
    mode: "dry_run",
    selection: "first_records",
    recordLimit: limit,
    limitReached: counts.scanned >= limit,
    counts,
    proposedGroups: groups.size,
    singleRecordGroups: groups.size - multiple.length,
    multiplePublicationGroups: multiple.length,

    recordsInMultipleGroups: multiple.reduce(
      (total, group) => total + group.publications.length,
      0
    ),

    groupsWithSelectionTie: multiple.filter(
      (group) => group.selectedSourceRecordId === null
    ).length,

    groupsWithGroupingWarnings: multiple.filter(
    (group) => group.groupingSignals.length > 0
    ).length,

    groupingWarningCounts: Object.fromEntries(
    [
        "adaptation",
        "abridged",
        "selection_or_anthology",
        "numbered_part",
        "multiple_volumes",
    ].map((code) => [
        code,
        multiple.filter(
        (group) => group.groupingWarningCodes.includes(code)
        ).length,
    ])
    ),
  };

  const reportsRoot = resolve("data/catalog/reports");
  await mkdir(reportsRoot, { recursive: true });

  const outputDir = await mkdtemp(
    resolve(reportsRoot, "works-preview-")
  );

  await writeFile(
    resolve(outputDir, "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  await writeFile(
    resolve(outputDir, "groups.proposed.json"),
    JSON.stringify(multiple, null, 2),
    "utf8"
  );

  console.table(counts);
  console.log(`Grupos con varias publicaciones: ${multiple.length}`);
  console.log(`Informes guardados en: ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});