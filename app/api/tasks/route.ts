import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

type TaskTemplate = {
  id: string;
  category: string;
  name: string;
  intensity: string;
  cpu: number;
  ram: number;
  gpu: number;
  gpuMemory: number;
  power: number;
  temperature: number;
};

function averageRange(value: string, fallback: number) {
  const numbers = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!numbers.length) return fallback;
  return numbers.length === 1 ? numbers[0] : (numbers[0] + numbers[1]) / 2;
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let value = "";
  let quoted = false;
  for (const character of line) {
    if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      result.push(value);
      value = "";
    } else value += character;
  }
  result.push(value);
  return result;
}

export async function GET() {
  const csv = await readFile("agenticwork/tasks_preview.csv", "utf8");
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = parseCsvLine(header);
  const tasks: TaskTemplate[] = lines.filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
    return {
      id: row.Task_ID,
      category: row.Category,
      name: row.Task_Name,
      intensity: row.Intensity_Tier,
      cpu: averageRange(row.CPU_Usage_Range, 5),
      ram: averageRange(row.RAM_Usage_Range, 512),
      gpu: averageRange(row.GPU_Usage_Range, 0),
      gpuMemory: averageRange(row.GPU_Memory_Range, 0),
      power: averageRange(row.Power_Usage_Range, 25),
      temperature: averageRange(row.Temperature_Range, 42),
    };
  });
  return NextResponse.json(tasks, { headers: { "Cache-Control": "public, max-age=3600" } });
}