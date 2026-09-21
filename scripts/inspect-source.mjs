import fs from "node:fs";
const s = fs.readFileSync(process.argv[2] || "original.html", "utf8");
console.log(
  s
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(-25000),
);
console.log(
  "\nLINKS\n" +
    [...new Set([...s.matchAll(/href="([^"]+)"/g)].map((x) => x[1]))]
      .filter((x) => !x.includes("parastorage") && !x.includes("googleapis"))
      .join("\n"),
);
console.log(
  "\nIMAGES\n" +
    [
      ...new Set(
        [...s.matchAll(/https:[^\s"<>]+\.(?:jpg|jpeg|png)[^\s"<>]*/g)].map(
          (x) => x[0],
        ),
      ),
    ]
      .slice(0, 40)
      .join("\n"),
);
