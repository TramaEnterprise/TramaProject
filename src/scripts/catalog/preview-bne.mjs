import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const inputPath = resolve(
  process.argv[2] ?? "data/catalog/raw/monomodernas-JSON.json"
);

const reportsRoot = resolve("data/catalog/reports");
const sampleSize = 100;

const excludedForms = new Set([
  "libros de texto",
  "cuadernos de ejercicios",
  "manuales tecnicos",
  "formularios administrativos",
  "informes administrativos",
]);

const supportedTypes = new Set([
  "Monografía en papel (posterior a 1830)",
  "Monografía electrónica",
]);

const counts = {
  total: 0,
  candidate: 0,
  review: 0,
  excluded: 0,
};

const samples = {
  candidate: [],
  review: [],
  excluded: [],
};

const reasonCounts = new Map();

const assessmentCounts = {
  quality: {
    no_flags: 0,
    review: 0,
    invalid: 0,
  },
  scope: {
    no_flags: 0,
    review: 0,
    out_of_scope: 0,
  },
};

const assessmentCombinations = new Map();

let randomState = 42;

function random() {
  randomState = (
    Math.imul(randomState, 1664525) + 1013904223
  ) >>> 0;

  return randomState / 4294967296;
}

function text(value) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}

function comparable(value) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function splitSourceValues(value) {
  return text(value)
    .split("/**/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanTitle(raw) {
  let title = text(raw.titulo);
  const credits = text(raw.mencion_de_autores);
  const slash = title.indexOf(" / ");

  if (
    slash >= 0 &&
    credits &&
    comparable(title.slice(slash + 3)) === comparable(credits)
  ) {
    title = title.slice(0, slash);
  }

  return title
  .replace(/\s*:(?:\s*:)+\s*/gu, ": ")
  .replace(/:+\s*$/u, "")
  .trim();
}

function publicationYear(value) {
  const valueText = text(value);

  if (!/^\d{4}$/.test(valueText)) return null;

  const year = Number(valueText);
  return year > 0 ? year : null;
}

const contributorRoles = new Map([
  ["autor", "author"],
  ["autora", "author"],
  ["traductor", "translator"],
  ["traductora", "translator"],
  ["ilustrador", "illustrator"],
  ["ilustradora", "illustrator"],
  ["editor literario", "editor"],
  ["editora literaria", "editor"],
  ["prologuista", "preface"],
  ["coordinador", "coordinator"],
  ["coordinadora", "coordinator"],
]);

// Correcciones revisadas para registros concretos.
// No se aplican por coincidencia de título.
const authorshipOverrides = new Map([
  [
    "991045449219708606",
    {
      status: "anonymous",
      reason:
        "Lazarillo de Tormes: obra anónima. Carmen Castro figura " +
        "como responsable de la edición y las notas.",
    },
  ],
]);

function parseContributor(value) {
  const roles = new Set();

  const name = text(
    value.replace(/\(([^()]*)\)/gu, (original, content) => {
      const label = comparable(content);
      const role = contributorRoles.get(label);

      if (role) {
        roles.add(role);
        return "";
      }

      // Retira fechas biográficas del nombre visible.
      // El texto original se conserva en raw.
      if (/^(?:ca\.\s*)?\d{3,4}(?:\s*-\s*\d{0,4})?$/.test(label)) {
        return "";
      }

      // Conserva calificadores que todavía no interpretamos.
      return original;
    })
  ).replace(/[,;\s]+$/u, "");

  const opening = (value.match(/\(/gu) ?? []).length;
  const closing = (value.match(/\)/gu) ?? []).length;

  return {
    name,
    roles: [...roles],
    raw: value,
    needsReview:
      roles.size === 0 ||
      opening !== closing ||
      !/\p{L}/u.test(name),
  };
}

function recoverAuthorFromCredits(raw, contributors) {
  const firstCredit = text(raw.mencion_de_autores)
    .split(";")[0]
    .trim()
    .replace(/^\[([^\[\]]+)\]$/u, "$1");

  const creditName = comparable(firstCredit)
    .replace(/^(?:por|by)\s+/u, "")
    .replace(/[.]$/u, "")
    .trim();

  if (!creditName) return contributors;

  const matches = contributors.filter((person) => {
    // Respeta las funciones que BNE ya indica.
    if (person.roles.length > 0) return false;

    // No interpreta nombres con calificadores o restos ambiguos.
    if (/[()[\]{};:]/u.test(person.name)) return false;

    const parts = person.name.split(",").map(text);

    if (parts.length > 2 || parts.some((part) => !part)) {
      return false;
    }

    const naturalName =
      parts.length === 2
        ? `${parts[1]} ${parts[0]}`
        : parts[0];

    return comparable(naturalName) === creditName;
  });

  // Exige una única coincidencia.
  if (matches.length !== 1) return contributors;

  return contributors.map((person) =>
    person === matches[0]
      ? {
          ...person,
          roles: ["author"],
          needsReview: false,
          roleEvidence: {
            source: "responsibility_name_match",
            statement: firstCredit,
          },
        }
      : person
  );
}

function normalizeAuthorship(raw) {
  const parsedContributors = splitSourceValues(raw.autores)
    .map(parseContributor);

  const contributors = recoverAuthorFromCredits(
    raw,
    parsedContributors
  );

  const override = authorshipOverrides.get(text(raw.id));

  const authorNames = [
    ...new Set(
      contributors
        .filter(
          (person) =>
            person.roles.includes("author") &&
            !person.needsReview
        )
        .map((person) => person.name)
    ),
  ];

  return {
    authorNames: override ? [] : authorNames,

    authorshipStatus:
      override?.status ??
      (authorNames.length > 0 ? "identified" : "unresolved"),

    authorshipEvidence: override
    ? {
        source: "manual_review",
        reason: override.reason,
      }
    : {
        source: contributors.some(
          (person) =>
            person.roleEvidence?.source ===
            "responsibility_name_match"
        )
          ? "bne_roles_and_credit_inference"
          : "bne_explicit_roles",
      },

    contributors,

    contributorRolesNeedReview: contributors.some(
      (person) => person.needsReview
    ),
  };
}

function normalize(raw) {
  return {
    source: "bne",
    sourceRecordId: text(raw.id),
    title: cleanTitle(raw),

    contributorsRaw: text(raw.autores),
    responsibilityStatement: text(raw.mencion_de_autores),

    ...normalizeAuthorship(raw),

    publicationYear: publicationYear(raw.fecha_de_publicacion),
    publicationDateRaw: text(raw.fecha_de_publicacion),

    languageRaw: text(raw.lengua_principal),
    originalLanguageRaw: text(raw.lengua_original),
    publisher: text(raw.editorial),

    isbnCandidates: splitSourceValues(raw.isbn),

    extentRaw: text(raw.extension),
    seriesStatement: text(raw.serie),
    forms: splitSourceValues(raw.genero_forma),
    subjectsRaw: text(raw.tema),
    notesRaw: text(raw.notas),

    originalPublicationYear: null,
  };
}

function scopeReviewReasons(record) {
  const title = comparable(record.title);
  const forms = comparable(record.forms.join(" "));
  const subjects = comparable(record.subjectsRaw);
  const metadata = `${forms} ${subjects}`;
  const reasons = [];

  const schoolMetadata =
    /libros escolares|libros de texto|cuadernos de ejercicios/;

  const schoolTitle =
  /\b(?:educacion|educacio) (?:primaria|secundaria|infantil)\b|\bbachillerato\b|\bbatxillerat\b|\b[1-6]\s*[º°.]?\s*[:.-]?\s*(?:de\s+)?(?:primaria|secundaria|eso)\b/;

  if (schoolMetadata.test(metadata) || schoolTitle.test(title)) {
    reasons.push("school_scope_review");
  }

  if (
    /tesis y escritos academicos/.test(forms) ||
    /tesis doctoral|inaugural[- ]dissertation/.test(title)
  ) {
    reasons.push("academic_scope_review");
  }

  const technicalStandard =
    /^(?:(?:une|en|iso|iec|cei|din|astm)[-\s]+)+\d/;

  if (
    technicalStandard.test(title) ||
    /manuales tecnicos|documentacion tecnica/.test(metadata)
  ) {
    reasons.push("technical_scope_review");
  }

  if (
    /^(?:reglamentos?|estatutos|memoria administrativa)\b/.test(title) ||
    /documentacion administrativa/.test(metadata)
  ) {
    reasons.push("administrative_scope_review");
  }

  if (/\bmanuales de formacion\b/.test(forms)) {
    reasons.push("training_scope_review");
  }

  return reasons;
}

function assessDataQuality(raw, record) {
  const reasons = [];
  const invalid = !record.sourceRecordId || !record.title;

  if (invalid) {
    reasons.push("missing_identifier_or_title");
  }

  if (/registro provisional/i.test(record.notesRaw)) {
    reasons.push("provisional_record");
  }

  if (record.authorshipStatus === "unresolved") {
    reasons.push("authorship_unresolved");
  }

  if (record.contributorRolesNeedReview) {
    reasons.push("contributor_roles_need_review");
  }

  const responsibility = comparable(
    record.responsibilityStatement
  ).replace(/^[\s[\]]+/u, "");

  const startsWithSupportingRole =
    /^(?:prologo|prefacio|introduccion|traduccion|ilustraciones|edicion y notas|edicion literaria)\b/u
      .test(responsibility);

  if (
    record.authorshipStatus === "identified" &&
    startsWithSupportingRole
  ) {
    reasons.push("authorship_role_conflict");
  }

  if (record.publicationYear === null) {
    reasons.push("missing_or_uncertain_publication_year");
  } else if (
    record.publicationYear > new Date().getFullYear() + 1
  ) {
    reasons.push("future_publication_year");
  }

  if (
    !record.languageRaw ||
    /^(indeterminado|varios idiomas)$/i.test(record.languageRaw)
  ) {
    reasons.push("uncertain_language");
  }

  if (!supportedTypes.has(text(raw.tipo_de_documento))) {
    reasons.push("unrecognized_document_type");
  }

  if (/\s\/\s|\s;\s|\^/.test(record.title)) {
    reasons.push("title_needs_review");
  }

  return {
    status: invalid
      ? "invalid"
      : reasons.length > 0
        ? "review"
        : "no_flags",
    reasons,
  };
}

function additionalScopeReviewReasons(record) {
  const title = comparable(record.title);
  const forms = comparable(record.forms.join(" / "));
  const subjects = comparable(record.subjectsRaw);
  const metadata = forms + " / " + subjects;
  const reasons = new Set();

  const generalReading =
    /\b(?:novelas?|cuentos?|poesia|poesias|poemas|teatro|comics?|historietas|ensayos?|obras de divulgacion|manuales para aficionados)\b/
      .test(metadata);

  // Señales explícitas de finalidad educativa o profesional.
  if (
    /\b(?:contestaciones|temarios|cuestionarios|test|tests) para oposiciones\b/.test(metadata) ||
    /\b(?:manuales de formacion|formacion profesional|certificados de profesionalidad)\b/.test(forms)
  ) {
    reasons.add("training_scope_review");
  }

  if (
    /\b(?:manuales de laboratorio|protocolos clinicos|guias de practica clinica|manuales de mantenimiento|especificaciones tecnicas)\b/.test(metadata)
  ) {
    reasons.add("technical_scope_review");
  }

  if (
    /\b(?:informes administrativos|formularios administrativos)\b/.test(metadata) ||
    /(?:^|\/| - )\s*legislacion\s*(?:$|\/| - )/.test(forms)
  ) {
    reasons.add("administrative_scope_review");
  }

  // Las pistas del título son más ambiguas.
  // Las aplicamos cuando no hay señales de lectura general.
  if (!generalReading) {
    if (
      /\bbacharelato\b|\beso\s*[1-4]\b/.test(title) ||
      /\b(?:guia|propuesta|proposta|programacion) didactica\b/.test(title) ||
      /\bapuntes de catedra\b/.test(title)
    ) {
      reasons.add("school_scope_review");
    }

    if (
      /^curso de (?:especialista|formacion profesional)\b/.test(title) ||
      /\b(?:temario|cuestionarios?|test|tests)\b.*\boposiciones\b|\boposiciones\b.*\b(?:temario|cuestionarios?|test|tests)\b/.test(title)
    ) {
      reasons.add("training_scope_review");
    }

    if (
      /^(?:metodos|tecnicas|manual) de laboratorio\b/.test(title) ||
      /^(?:guia de practica clinica|protocolo clinico|manual de mantenimiento)\b/.test(title) ||
      (
        /^determinacion de\b/.test(title) &&
        /\b(?:analisis|quimica analitica)\b/.test(subjects)
      )
    ) {
      reasons.add("technical_scope_review");
    }

    if (
      /^(?:censo de poblacion|memoria administrativa|annual report of|informe presentado al pleno)\b/.test(title) ||
      (
        /^estatutos?\b/.test(title) &&
        /\b(?:derecho|administracion)\b/.test(subjects)
      )
    ) {
      reasons.add("administrative_scope_review");
    }
  }

  return [...reasons];
}

function assessCatalogScope(record) {
  const excludedForm = record.forms.find((form) =>
    excludedForms.has(comparable(form).replace(/^-\s*/, ""))
  );

  if (excludedForm) {
    return {
      status: "out_of_scope",
      reasons: [`excluded_form:${comparable(excludedForm)}`],
    };
  }

  const reasons = [
    ...new Set([
      ...scopeReviewReasons(record),
      ...additionalScopeReviewReasons(record),
    ]),
  ];

  return {
    status: reasons.length > 0 ? "review" : "no_flags",
    reasons,
  };
}

function classify(raw, record) {
  const quality = assessDataQuality(raw, record);
  const scope = assessCatalogScope(record);

  const reasons = [
    ...quality.reasons,
    ...scope.reasons,
  ];

  const bucket =
    quality.status === "invalid" ||
    scope.status === "out_of_scope"
      ? "excluded"
      : quality.status === "review" ||
          scope.status === "review"
        ? "review"
        : "candidate";

  return {
    bucket,
    reasons,
    quality,
    scope,
  };
}

function retainSample(bucket, entry) {
  const sample = samples[bucket];
  const seen = counts[bucket];

  if (sample.length < sampleSize) {
    sample.push(entry);
    return;
  }

  const index = Math.floor(random() * seen);
  if (index < sampleSize) sample[index] = entry;
}

async function main() {
  const reader = createInterface({
    input: createReadStream(inputPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

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
      throw new Error(
        `JSON no válido en la línea ${lineNumber}. ` +
        "Se detiene el proceso sin generar un informe final."
      );
    }

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(`Registro inesperado en la línea ${lineNumber}.`);
    }

    const record = normalize(raw);
    const result = classify(raw, record);

    counts.total++;
    counts[result.bucket]++;

    assessmentCounts.quality[result.quality.status]++;
    assessmentCounts.scope[result.scope.status]++;

    const combination =
      `${result.quality.status}|${result.scope.status}`;

    assessmentCombinations.set(
      combination,
      (assessmentCombinations.get(combination) ?? 0) + 1
    );

    for (const reason of result.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }

    retainSample(result.bucket, {
      lineNumber,
      reasons: result.reasons,
      assessment: {
        quality: result.quality,
        scope: result.scope,
      },
      normalized: record,
      raw,
    });

    if (counts.total % 250000 === 0) {
      console.log(`Procesados: ${counts.total.toLocaleString("es-ES")}`);
    }
  }

  if (counts.total === 0) {
    throw new Error("No se han encontrado registros.");
  }

  await mkdir(reportsRoot, { recursive: true });

  const outputDir = await mkdtemp(resolve(reportsRoot, "preview-"));

  const summary = {
    inputPath,
    generatedAt: new Date().toISOString(),
    sampleSizePerBucket: sampleSize,
    counts,
    assessmentCounts,

    assessmentCombinations: Object.fromEntries(
      [...assessmentCombinations].sort(
        ([left], [right]) => left.localeCompare(right)
      )
    ),
    reasons: Object.fromEntries(
      [...reasonCounts].sort((a, b) => b[1] - a[1])
    ),
  };

  for (const [bucket, entries] of Object.entries(samples)) {
    await writeFile(
      resolve(outputDir, `${bucket}.sample.json`),
      JSON.stringify(entries, null, 2),
      "utf8"
    );
  }

  await writeFile(
    resolve(outputDir, "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  console.table(counts);
  console.log(`Informes guardados en: ${outputDir}`);
}

export { normalize, classify };

const isDirectExecution =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}