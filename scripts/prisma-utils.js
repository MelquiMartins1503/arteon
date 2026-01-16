import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const schemaPath = path.join(cwd, "prisma", "schema.prisma");
const modelsDir = path.join(cwd, "prisma", "models");
const outputPath = path.join(cwd, "prisma", "temp.prisma");

const action = process.argv[2];

if (action === "build") {
  try {
    console.log("Building Prisma schema...");
    let content = fs.readFileSync(schemaPath, "utf8");

    // Verify that extensions are included
    if (!content.includes("extensions =")) {
      console.warn("⚠ Warning: No extensions found in schema.prisma");
      console.warn(
        "  If using Supabase, make sure to declare pre-installed extensions",
      );
    }

    if (fs.existsSync(modelsDir)) {
      const files = fs
        .readdirSync(modelsDir)
        .filter((f) => f.endsWith(".prisma"));
      files.sort(); // Ensure deterministic order

      for (const file of files) {
        console.log(`  - Adding ${file}`);
        content += `\n${fs.readFileSync(path.join(modelsDir, file), "utf8")}`;
      }
    }

    fs.writeFileSync(outputPath, content);
    console.log("✔ Schema built at prisma/temp.prisma");

    // Verify extensions are in output
    const tempContent = fs.readFileSync(outputPath, "utf8");
    if (tempContent.includes("extensions =")) {
      const extensionsMatch = tempContent.match(/extensions = \[(.*?)\]/s);
      if (extensionsMatch) {
        console.log(`  Extensions included: ${extensionsMatch[1].trim()}`);
      }
    }
  } catch (error) {
    console.error("✘ Error building schema:", error);
    process.exit(1);
  }
} else if (action === "clean") {
  try {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log("✔ Cleaned up prisma/temp.prisma");
    }
  } catch (error) {
    console.error("✘ Error cleaning up:", error);
    process.exit(1);
  }
} else {
  console.log("Usage: node scripts/prisma-utils.js [build|clean]");
  process.exit(1);
}
