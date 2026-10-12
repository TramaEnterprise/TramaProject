import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const args = process.argv.slice(2);

  const preview = args.length === 1;
  const apply = args.length === 3 && args[1] === "--apply" && /^[a-f0-9]{64}$/i.test(args[2]);

  if (!preview && !apply) {
    throw new Error("Uso: node apply-pilot-batch.mjs RUTA_BATCH " + "[--apply SHA256]");
  }

  const batchPath = resolve(args[0]);
  const file = await readFile(batchPath);

  const sha256 = createHash("sha256").update(file).digest("hex");

  if (apply && args[2].toLowerCase() !== sha256) {
    throw new Error("El archivo no coincide con el SHA256 revisado.");
  }

  const batch = JSON.parse(file.toString("utf8"));

  if (!Array.isArray(batch) || batch.length !== 6) {
    throw new Error("El lote debe contener seis registros.");
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY.");
  }

  if (key.startsWith("sb_publishable_")) {
    throw new Error("Esta operación requiere una clave de servidor.");
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  console.log(`Archivo: ${batchPath}`);
  console.log(`SHA256: ${sha256}`);

  const { data, error } = await client.rpc("apply_bne_pilot_batch", {
    p_batch: batch,
    p_apply: apply,
  });

  if (error) {
    throw new Error(`RPC: ${error.message}`);
  }

  console.log(JSON.stringify(data, null, 2));

  if (preview) {
    console.log("Vista previa completada. No se han actualizado registros.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
