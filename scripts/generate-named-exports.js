// generate-named-exports.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 模拟 CommonJS 中的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 多个相对目录路径（相对本脚本所在位置）
const targetDirArray = [
  "../src/hooks",
  "../src/lib/bezier",
  "../src/lib/canvas",
  "../src/lib/utils",
].map((dir) => path.resolve(__dirname, dir));// 💡 转成绝对路径，防止路径问题

function getNamedExports(filePath) {
  const code = fs.readFileSync(filePath, "utf8");

  // 匹配命名导出的 function / const / let / class / var
  const regex = /export\s+(?:(?:async\s+)?function\*?|const|let|var|class)\s+([a-zA-Z0-9_]+)/g;
  const matches = [];
  let match;
  while ((match = regex.exec(code)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function generateIndex() {
  targetDirArray.forEach((targetDir) => {
    const files = fs
      .readdirSync(targetDir)
      .filter((f) => f.endsWith(".js") && f !== "index.js");

    const lines = [];

    for (const file of files) {
        const baseName = path.basename(file, ".js");
      const filePath = path.join(targetDir, file);
      const exports = getNamedExports(filePath);
      if (exports.length) {
        lines.push(`export { ${exports.join(", ")} } from './${baseName}.js';`);
      }
    }

    const indexPath = path.join(targetDir, "index.js");
    fs.writeFileSync(indexPath, lines.join("\n") + "\n");
    console.log(`[index.js updated with named exports]`);
  });
}

generateIndex();
