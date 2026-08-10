"use client";

import { useEffect, useRef, useState } from "react";

export type TaskTemplate = {
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

export type LiveTask = TaskTemplate & {
  uid: string;
  remaining: number;
  duration: number;
  state: "running" | "terminating";
  endsAt?: number;
};

export type NodeTelemetry = {
  id: number;
  cluster: number;
  state: string;
  cpu: number;
  ram: number;
  gpu: number;
  gpuMemory: number;
  power: number;
  temperature: number;
  tasks: LiveTask[];
};

export type SimulationLog = { time: string; kind: string; message: string };

const fallbackTasks: TaskTemplate[] = [
  { id: "OS-001", category: "Operating System", name: "System Idle Process", intensity: "Low", cpu: 2, ram: 420, gpu: 0, gpuMemory: 0, power: 18, temperature: 38 },
  { id: "BG-001", category: "Background services", name: "Windows Defender service", intensity: "Low", cpu: 5, ram: 650, gpu: 0, gpuMemory: 0, power: 14, temperature: 42 },
  { id: "ML-001", category: "Machine learning", name: "PyTorch training epoch", intensity: "High", cpu: 28, ram: 6500, gpu: 62, gpuMemory: 18000, power: 620, temperature: 76 },
  { id: "LLM-001", category: "LLM model execution", name: "vLLM inference batch", intensity: "High", cpu: 19, ram: 7200, gpu: 54, gpuMemory: 21000, power: 540, temperature: 72 },
  { id: "GAME-001", category: "Gaming", name: "Counter-Strike 2 server", intensity: "Medium", cpu: 18, ram: 2800, gpu: 25, gpuMemory: 6000, power: 210, temperature: 59 },
  { id: "HOST-001", category: "Hosting", name: "IIS Worker Process", intensity: "Low", cpu: 8, ram: 1100, gpu: 0, gpuMemory: 0, power: 28, temperature: 46 },
  { id: "DISK-001", category: "Disk read/write", name: "Storage Spaces repair", intensity: "Medium", cpu: 11, ram: 1800, gpu: 0, gpuMemory: 0, power: 45, temperature: 51 },
  { id: "WEB-001", category: "General tasks", name: "Microsoft Edge worker", intensity: "Low", cpu: 4, ram: 800, gpu: 4, gpuMemory: 400, power: 19, temperature: 41 },
];

type RuntimeNode = { id: number; tasks: LiveTask[] };

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const average = (items: number[]) => items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : 0;
const nowLabel = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function metrics(node: RuntimeNode): Omit<NodeTelemetry, "id" | "cluster" | "state" | "tasks"> {
  const tasks = node.tasks;
  const cpu = tasks.reduce((sum, task) => sum + task.cpu, 0);
  const ram = tasks.reduce((sum, task) => sum + task.ram, 0) / 1200;
  const gpu = tasks.reduce((sum, task) => sum + task.gpu, 0);
  const gpuMemory = tasks.reduce((sum, task) => sum + task.gpuMemory, 0) / 600;
  const power = tasks.reduce((sum, task) => sum + task.power, 0) / 192;
  const temperature = clamp(27 + average(tasks.map((task) => task.temperature)) + tasks.length * 0.8, 27, 99);
  return { cpu: clamp(cpu), ram: clamp(ram), gpu: clamp(gpu), gpuMemory: clamp(gpuMemory), power: clamp(power), temperature, };
}

function canAccept(node: RuntimeNode, task: TaskTemplate) {
  const current = metrics(node);
  return current.cpu + task.cpu <= 80 && current.ram + task.ram / 1200 <= 80 &&
    current.gpu + task.gpu <= 80 && current.gpuMemory + task.gpuMemory / 600 <= 80 &&
    current.power + task.power / 192 <= 80 && current.temperature + task.temperature * 0.08 <= 88;
}

function makeTask(template: TaskTemplate, sequence: number): LiveTask {
  const minimum = template.category === "Machine learning" || template.category === "LLM model execution" || template.category === "Gaming" ? 80 : 10;
  const duration = minimum + Math.floor(Math.random() * (150 - minimum + 1));
  return { ...template, uid: `${template.id}-${sequence}`, duration, remaining: duration, state: "running" };
}

function pickTemplate(catalog: TaskTemplate[]) {
  const source = catalog.length ? catalog : fallbackTasks;
  const weights = source.map((task) => /Machine learning|LLM|Gaming/i.test(task.category) ? 1 : 2);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.random() * total;
  for (let index = 0; index < source.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return source[index];
  }
  return source[0];
}

export function clusterForNode(id: number) {
  return (id - 1) % 6;
}

export function clusterNodeIds(cluster: number) {
  return Array.from({ length: 10 }, (_, index) => cluster + 1 + index * 6);
}

export function useSimulation() {
  const runtime = useRef<RuntimeNode[]>(Array.from({ length: 60 }, (_, index) => ({ id: index + 1, tasks: [] })));
  const catalog = useRef<TaskTemplate[]>([]);
  const sequence = useRef(0);
  const [, redraw] = useState(0);
  const [logs, setLogs] = useState<SimulationLog[]>([{ time: nowLabel(), kind: "ENGINE", message: "Telemetry engine initialized across six isolated clusters." }]);
  const [notice, setNotice] = useState("");

  const addLog = (kind: string, message: string) => setLogs((current) => [{ time: nowLabel(), kind, message }, ...current].slice(0, 80));

  useEffect(() => {
    fetch("/api/tasks").then((response) => response.json()).then((tasks: TaskTemplate[]) => { catalog.current = tasks; }).catch(() => addLog("NOTICE", "Task library unavailable; running the safe local baseline."));
    runtime.current.forEach((node) => {
      for (let count = 0; count < 4; count += 1) {
        const template = pickTemplate(catalog.current);
        if (canAccept(node, template)) node.tasks.push(makeTask(template, sequence.current++));
      }
    });
    let lastIntakeAt = Date.now();
    const interval = window.setInterval(() => {
      const current = Date.now();
      const intakeDue = current - lastIntakeAt >= 10000;
      runtime.current.forEach((node) => {
        node.tasks = node.tasks.flatMap((task) => {
          if (task.state === "terminating" && task.endsAt && current >= task.endsAt) {
            addLog("POWER", `Task ${task.name} terminated on node ${node.id}.`);
            return [];
          }
          if (task.state === "running" && task.remaining <= 0) {
            addLog("COMPLETE", `Task ${task.name} completed on node ${node.id}.`);
            return [];
          }
          if (task.state === "running") return [{ ...task, remaining: task.remaining - 1 }];
          return [task];
        });
        if (intakeDue && node.tasks.length < 18) {
          const template = pickTemplate(catalog.current);
          if (canAccept(node, template)) {
            node.tasks.push(makeTask(template, sequence.current++));
            addLog("ENGINE", `New ${template.category} task assigned to node ${node.id}.`);
          }
        }
      });
      if (intakeDue) lastIntakeAt = current;
      redraw((value) => value + 1);
    }, 1000);
    const intake = window.setInterval(() => addLog("ENGINE", "Cluster intake cycle evaluated against the 80% operating envelope."), 10000);
    return () => { window.clearInterval(interval); window.clearInterval(intake); };
  }, []);

  const telemetry = runtime.current.map((node): NodeTelemetry => {
    const values = metrics(node);
    return { id: node.id, cluster: clusterForNode(node.id), state: node.tasks.length ? "online" : "ready", ...values, tasks: node.tasks };
  });

  function terminateTask(nodeId: number, uid: string) {
    const node = runtime.current.find((candidate) => candidate.id === nodeId);
    const task = node?.tasks.find((candidate) => candidate.uid === uid);
    if (!node || !task || task.state === "terminating") return;
    const peers = runtime.current.filter((candidate) => clusterForNode(candidate.id) === clusterForNode(nodeId) && candidate.id !== nodeId && canAccept(candidate, task));
    if (!peers.length) {
      setNotice(`Transfer paused: no server in Cluster ${String(clusterForNode(nodeId) + 1).padStart(2, "0")} has enough capacity for ${task.name}.`);
      addLog("NOTICE", `Could not transfer ${task.name} before termination on node ${nodeId}.`);
      window.setTimeout(() => setNotice(""), 5200);
      return;
    }
    task.state = "terminating";
    task.endsAt = Date.now() + (3000 + Math.floor(Math.random() * 3001));
    addLog("TRANSFER", `Transferring ${task.name} from node ${nodeId} before shutdown.`);
    redraw((value) => value + 1);
  }

  return { telemetry, logs, notice, terminateTask };
}