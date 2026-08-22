import { runSync } from "@/lib/sync-service";

runSync()
  .then(() => {
    process.stdout.write("Sync concluída.\n");
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
