import { createReadStream } from "node:fs";
import { readFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { normalize, classify } from "./preview-bne.mjs";
import { publication } from "./preview-works.mjs";

const inputPath = resolve(process.argv[2] ?? "data/catalog/raw/monomodernas-JSON.json");

const templatePath = resolve("supabase/seeds/catalog_pilot_metadata.sql");

const recordLimit = 100_000;

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const template = await readFile(templatePath, "utf8");
  const sections = template.split("$pilot$");

  requireCondition(
    sections.length === 3,
    "La plantilla debe contener un único bloque JSON entre $pilot$."
  );

  const baseline = JSON.parse(sections[1]);

  requireCondition(
    Array.isArray(baseline) && baseline.length === 6,
    "Esta versión requiere las seis publicaciones del piloto."
  );

  const targets = new Map();

  for (const row of baseline) {
    requireCondition(
      typeof row.source_record_id === "string" &&
        row.source_record_id.trim() !== "" &&
        typeof row.work_id === "string" &&
        /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(row.work_id),
      "Identificador BNE o UUID no válido en la plantilla."
    );

    requireCondition(
      !targets.has(row.source_record_id),
      `Identificador repetido: ${row.source_record_id}`
    );

    targets.set(row.source_record_id, row);
  }

  const found = new Map();

  const input = createReadStream(inputPath, {
    encoding: "utf8",
  });

  const reader = createInterface({
    input,
    crlfDelay: Infinity,
  });

  let scanned = 0;
  let lineNumber = 0;

  try {
    for await (const line of reader) {
      lineNumber++;
      let value = line.trim();

      if (!value || value === "[" || value === "]") continue;

      if (value.startsWith("[")) value = value.slice(1).trim();
      if (value.endsWith("]")) value = value.slice(0, -1).trim();
      if (value.endsWith(",")) value = value.slice(0, -1).trim();

      let raw;

      try {
        raw = JSON.parse(value);
      } catch {
        throw new Error(`JSON no válido en la línea ${lineNumber}.`);
      }

      requireCondition(
        raw && typeof raw === "object" && !Array.isArray(raw),
        `Registro inesperado en la línea ${lineNumber}.`
      );

      scanned++;

      const id = typeof raw.id === "string" ? raw.id.trim() : "";

      if (targets.has(id)) {
        requireCondition(!found.has(id), `Registro BNE repetido en el tramo examinado: ${id}`);

        const record = normalize(raw);
        const assessment = classify(raw, record);
        const item = publication(record, raw);
        const previous = targets.get(id);

        requireCondition(
          assessment.bucket === "candidate",
          `${id} necesita revisión: ${assessment.reasons.join(", ")}`
        );

        // La plantilla del piloto presupone estos tres valores.
        // Si dejan de cumplirse, detenemos la preparación.
        requireCondition(
          record.publicationDateRaw === String(record.publicationYear) &&
            item.contents === "" &&
            item.groupingSignals.length === 0,
          `${id} requiere ampliar la plantilla de metadatos.`
        );

        const row = {
          source_record_id: id,
          work_id: previous.work_id,
          publication_year: record.publicationYear,
          language: record.languageRaw,
          publisher: record.publisher,
          edition_statement: item.editionStatement,
          extent: item.extent,
          notes: item.notes,
          contributors: record.contributors,
          authorship_evidence: record.authorshipEvidence,
        };

        // Estos cambios podrían afectar a la publicación preferida
        // y a los datos visibles de works.
        for (const field of ["publication_year", "language", "publisher"]) {
          requireCondition(
            row[field] === previous[field],
            `${id}: cambió ${field}; revisa la selección antes de aplicar.`
          );
        }

        found.set(id, row);
      }

      if (scanned >= recordLimit) break;
    }
  } finally {
    reader.close();
    input.destroy();
  }

  const missing = [...targets.keys()].filter((id) => !found.has(id));

  requireCondition(
    missing.length === 0,
    `Faltan registros en el tramo examinado: ${missing.join(", ")}`
  );

  // Mantiene el orden de las decisiones del piloto.
  const rows = baseline.map((row) => found.get(row.source_record_id));

  const payload = JSON.stringify(rows, null, 2);

  requireCondition(
    !payload.includes("$pilot$"),
    "Un dato contiene el delimitador SQL; no se genera el lote."
  );

  const sql = sections[0] + "$pilot$\n" + payload + "\n$pilot$" + sections[2];

  const reportsRoot = resolve("data/catalog/reports");
  await mkdir(reportsRoot, { recursive: true });

  const outputDir = await mkdtemp(resolve(reportsRoot, "pilot-batch-"));

  const summary = {
    mode: "prepare_only",
    inputPath,
    templatePath,
    generatedAt: new Date().toISOString(),
    recordLimit,
    scanned,
    preparedRecords: rows.length,
    affectedWorks: new Set(rows.map((row) => row.work_id)).size,
    databaseCompared: false,
    databaseWritten: false,
  };

  await writeFile(resolve(outputDir, "batch.json"), payload, "utf8");

  await writeFile(resolve(outputDir, "apply.sql"), sql, "utf8");

  await writeFile(resolve(outputDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");

  console.table(summary);
  console.log(`Lote preparado en: ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
