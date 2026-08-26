const { resolve, join } = require("path");
const { createHash } = require("crypto");
const {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} = require("fs");

process.env.NODE_ENV = "production";
const PLACEHOLDER = "NB_INLINE_SCRIPT_PLACEHOLDER";
console.log("Starting post-build script to extract inline scripts...");

// Function to find HTML files recursively
function findHtmlFiles(dir) {
  const files = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findHtmlFiles(fullPath));
    } else if (entry.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

// For Next.js export output, the files are in the 'out' directory
const baseDir = resolve("out");
const htmlFiles = findHtmlFiles(baseDir);

console.log(`Found ${htmlFiles.length} .html files to process`);

// Ensure assets directory exists
const assetsDir = `${baseDir}/assets`;
mkdirSync(assetsDir, { recursive: true });

htmlFiles.forEach((file) => {
  // Read file contents
  const contents = readFileSync(file, "utf8");
  const scripts = [];

  // Extract inline scripts
  const newFile = contents.replace(
    /<script(?![^>]*src)([^>]*)>(.+?)<\/script>/gs,
    (match, attributes, scriptContent) => {
      // Skip if script has src attribute (external script)
      if (attributes.includes("src=")) {
        return match;
      }

      const addPlaceholderString = scripts.length === 0;
      const cleanedScript = scriptContent.trim();

      if (cleanedScript) {
        scripts.push(
          `${cleanedScript}${cleanedScript.endsWith(";") ? "" : ";"}`,
        );
      }

      return addPlaceholderString ? PLACEHOLDER : "";
    },
  );

  // Early exit if no inline scripts found
  if (!scripts.length) {
    console.log(`No inline scripts found`);
    return;
  }

  // Combine scripts and create hash
  const chunk = scripts.join("\n");
  const hash = createHash("md5").update(chunk).digest("hex").slice(0, 8);
  const chunkFileName = `chunk.${hash}.js`;
  const chunkPath = `${assetsDir}/${chunkFileName}`;

  // Write the chunk file
  writeFileSync(chunkPath, chunk, "utf8");

  // Replace placeholder string with script tag
  const updatedFile = newFile.replace(
    PLACEHOLDER,
    `<script src="/assets/${chunkFileName}" crossorigin=""></script>`,
  );

  // Write updated HTML file
  writeFileSync(file, updatedFile, "utf8");
});

console.log("Post-build script completed successfully!");
