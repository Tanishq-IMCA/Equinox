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

type RuntimeNode = {
  id: number;
  tasks: LiveTask[];
  offline: boolean;
  temperature: number;
  powerAction?: "starting" | "stopping";
};

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
  const temperature = node.temperature;
  return { cpu: clamp(cpu), ram: clamp(ram), gpu: clamp(gpu), gpuMemory: clamp(gpuMemory), power: clamp(power), temperature, };
}

function thermalBand(task: TaskTemplate) {
  if (task.temperature >= 68) return "high";
  if (task.temperature <= 48) return "low";
  return "medium";
}

function temperatureTarget(node: RuntimeNode) {
  if (node.offline || node.powerAction === "stopping") return 0;
  if (!node.tasks.length) return 30;
  const taskHeat = average(node.tasks.map((task) => task.temperature));
  return clamp(24 + taskHeat * 0.58 + Math.min(node.tasks.length, 6) * 0.8, 28, 92);
}

function loadState(node: RuntimeNode) {
  if (node.powerAction === "starting") return "starting";
  if (node.powerAction === "stopping" || node.offline) return "offline";
  const load = Math.max(node.tasks.reduce((sum, task) => sum + task.cpu, 0), node.tasks.reduce((sum, task) => sum + task.gpu, 0), metrics(node).ram, metrics(node).gpuMemory, metrics(node).power);
  return load >= 70 ? "high" : load >= 35 ? "medium" : "low";
}

export function formatTelemetry(telemetry: NodeTelemetry) {
  return {
    cpu: `${telemetry.cpu.toFixed(1)} / 100%`,
    gpu: `${telemetry.gpu.toFixed(1)} / 100%`,
    ram: `${(telemetry.ram * 1.2).toFixed(1)} / 120 GB`,
    gpuMemory: `${(telemetry.gpuMemory * 0.6).toFixed(1)} / 60 GB`,
    power: `${(telemetry.power * 0.192).toFixed(2)} / 19.2 kW`,
    temperature: `${telemetry.temperature.toFixed(1)} / 100°C`,
  };
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
  const roll = Math.random();
  const desiredBand = roll < 0.1 ? "low" : roll < 0.7 ? "medium" : "high";
  const matching = source.filter((task) => thermalBand(task) === desiredBand);
  if (matching.length) return matching[Math.floor(Math.random() * matching.length)];
  return source[Math.floor(Math.random() * source.length)];
}

export function clusterForNode(id: number) {
  return (id - 1) % 6;
}

export function clusterNodeIds(cluster: number) {
  return Array.from({ length: 10 }, (_, index) => cluster + 1 + index * 6);
}

export function useSimulation() {
  const runtime = useRef<RuntimeNode[]>(Array.from({ length: 60 }, (_, index) => ({
    id: index + 1,
    tasks: [],
    offline: false,
    temperature: 30,
  })));
  const catalog = useRef<TaskTemplate[]>([]);
  const sequence = useRef(0);
  const powerTimers = useRef<number[]>([]);
  const pendingAutonomousTasks = useRef<LiveTask[]>([]);
  const autonomousRef = useRef(false);
  const autonomousReady = useRef(false);
  const autonomousStarting = useRef(false);
  const [, redraw] = useState(0);
  const [autonomous, setAutonomous] = useState(false);
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
        const target = temperatureTarget(node);
        const rate = target === 0 ? 0.16 : 0.09;
        node.temperature += (target - node.temperature) * rate;
        if (Math.abs(target - node.temperature) < 0.15) node.temperature = target;
        if (node.offline && !node.powerAction) {
          return;
        }
        if (node.powerAction === "starting") return;
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
        if (!autonomousRef.current && intakeDue && node.tasks.length < 18) {
          const template = pickTemplate(catalog.current);
          if (canAccept(node, template)) {
            node.tasks.push(makeTask(template, sequence.current++));
            addLog("ENGINE", `New ${template.category} task assigned to node ${node.id}.`);
          }
        }
      });
      if (autonomousRef.current && autonomousReady.current && intakeDue) {
        pendingAutonomousTasks.current.push(makeTask(pickTemplate(catalog.current), sequence.current++));
        dispatchAutonomousWork();
      } else if (!autonomousRef.current && intakeDue) {
        consolidateNormalCapacity();
      }
      if (autonomousRef.current && autonomousReady.current) {
        const runningTasks = runtime.current.reduce((sum, node) => sum + node.tasks.length, 0);
        if (!runningTasks && !pendingAutonomousTasks.current.length) {
          pendingAutonomousTasks.current.push(makeTask(pickTemplate(catalog.current), sequence.current++));
          dispatchAutonomousWork();
        }
        if (!pendingAutonomousTasks.current.length) consolidateAutonomousCapacity();
      }
      if (intakeDue) lastIntakeAt = current;
      redraw((value) => value + 1);
    }, 1000);
    const intake = window.setInterval(() => addLog("ENGINE", "Cluster intake cycle evaluated against the 80% operating envelope."), 10000);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(intake);
      powerTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const telemetry = runtime.current.map((node): NodeTelemetry => {
    const values = metrics(node);
    return {
      id: node.id,
      cluster: clusterForNode(node.id),
      state: loadState(node),
      ...values,
      tasks: node.tasks,
    };
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

  function powerCluster(cluster: number) {
    const targets = runtime.current.filter((node) => clusterForNode(node.id) === cluster);
    const shouldStart = targets.some((node) => node.offline && !node.powerAction);
    if (!targets.length) {
      setNotice(`Cluster ${String(cluster + 1).padStart(2, "0")} has no nodes.`);
      window.setTimeout(() => setNotice(""), 5200);
      return;
    }
    const activeTargets = targets.filter((node) => !node.offline && !node.powerAction);
    if (!shouldStart) {
      const blocked = activeTargets.filter((source) => {
        if (!source.tasks.length) return false;
        const peers = activeTargets.filter((candidate) => candidate !== source);
        const target = peers.find((candidate) => canAcceptAll(candidate, source.tasks));
        return !target;
      });
      activeTargets.forEach((source) => {
        if (!source.tasks.length) return;
        const target = activeTargets.find((candidate) => candidate !== source && canAcceptAll(candidate, source.tasks));
        if (target) moveTasks(source, target);
      });
      if (blocked.length) {
        setNotice(`Cluster ${String(cluster + 1).padStart(2, "0")} kept ${blocked.length} node(s) online because their tasks could not be transferred safely.`);
      }
    }
    targets.forEach((node, index) => {
      if (node.powerAction || (shouldStart ? !node.offline : node.offline)) return;
      if (!shouldStart && node.tasks.length) return;
      node.powerAction = shouldStart ? "starting" : "stopping";
      const timer = window.setTimeout(() => {
        if (shouldStart) {
          node.offline = false;
          node.temperature = Math.max(node.temperature, 0);
          node.powerAction = undefined;
          addLog("POWER", `Node ${node.id} started in Cluster ${String(cluster + 1).padStart(2, "0")}.`);
        } else {
          node.offline = true;
          node.powerAction = undefined;
          addLog("POWER", `Node ${node.id} shut down in Cluster ${String(cluster + 1).padStart(2, "0")}.`);
        }
        redraw((value) => value + 1);
      }, index * 500);
      powerTimers.current.push(timer);
    });
    setNotice(shouldStart
      ? `Cluster ${String(cluster + 1).padStart(2, "0")} starting nodes one by one.`
      : `Cluster ${String(cluster + 1).padStart(2, "0")} powering down nodes one by one.`);
    addLog("POWER", `${shouldStart ? "Starting" : "Shutting down"} Cluster ${String(cluster + 1).padStart(2, "0")} sequentially.`);
    redraw((value) => value + 1);
    window.setTimeout(() => setNotice(""), 5200);
  }

  function powerAllServers() {
    if (autonomousRef.current) return;
    let startingCount = 0;
    runtime.current.forEach((node, index) => {
      if (!node.offline || node.powerAction) return;
      startingCount += 1;
      node.powerAction = "starting";
      const timer = window.setTimeout(() => {
        node.offline = false;
        node.powerAction = undefined;
        node.temperature = Math.max(node.temperature, 0);
        addLog("POWER", `Node ${node.id} started during full-capacity restore.`);
        redraw((value) => value + 1);
      }, index * 500);
      powerTimers.current.push(timer);
    });
    if (pendingAutonomousTasks.current.length) {
      window.setTimeout(() => {
        const active = runtime.current.filter((node) => !node.offline && !node.powerAction);
        while (pendingAutonomousTasks.current.length) {
          const task = pendingAutonomousTasks.current[0];
          const target = active.find((node) => canAccept(node, task));
          if (!target) break;
          target.tasks.push(task);
          pendingAutonomousTasks.current.shift();
        }
        redraw((value) => value + 1);
      }, Math.max(startingCount * 500 + 250, 500));
    }
    addLog("POWER", "Full-capacity mode requested. Starting offline nodes sequentially.");
    redraw((value) => value + 1);
  }

  function canAcceptAll(target: RuntimeNode, tasks: LiveTask[]) {
    let projected = { ...target, tasks: [...target.tasks] };
    return tasks.every((task) => {
      if (!canAccept(projected, task)) return false;
      projected.tasks.push(task);
      return true;
    });
  }

  function moveTasks(source: RuntimeNode, target: RuntimeNode) {
    const tasks = [...source.tasks];
    if (!tasks.length || source === target || target.offline || target.powerAction) return false;
    if (!canAcceptAll(target, tasks)) return false;
    target.tasks.push(...source.tasks);
    source.tasks = [];
    return true;
  }

  function schedulePowerDown(node: RuntimeNode, delay: number) {
    if (node.offline || node.powerAction) return;
    node.powerAction = "stopping";
    const timer = window.setTimeout(() => {
      node.offline = true;
      node.powerAction = undefined;
      addLog("POWER", `Node ${node.id} powered down after workload consolidation.`);
      redraw((value) => value + 1);
    }, delay);
    powerTimers.current.push(timer);
  }

  function consolidateNormalCapacity() {
    const active = runtime.current.filter((node) => !node.offline && !node.powerAction && node.tasks.length);
    const candidates = active.filter((node) => loadState(node) === "low").sort((a, b) => a.tasks.length - b.tasks.length);
    for (const source of candidates) {
      const target = active.find((node) => node !== source && canAcceptAll(node, source.tasks) && loadState(node) !== "high");
      if (target) {
        moveTasks(source, target);
        addLog("POWER", `Moved ${source.tasks.length || "idle"} workload from node ${source.id} to node ${target.id}; saving power.`);
        schedulePowerDown(source, 500);
        redraw((value) => value + 1);
        return;
      }
    }
  }

  function consolidateAutonomousCapacity() {
    const active = runtime.current.filter((node) => !node.offline && !node.powerAction);
    if (active.length <= 1) return;

    const target = active.find((node) => node.tasks.length) ?? active[0];
    for (const source of active) {
      if (source === target) continue;
      if (source.tasks.length && canAcceptAll(target, source.tasks)) {
        moveTasks(source, target);
        addLog("AUTONOMOUS", `Consolidated node ${source.id} into node ${target.id}; preserving active capacity.`);
      }
      if (!source.tasks.length) schedulePowerDown(source, 500);
    }
  }

  function dispatchAutonomousWork() {
    if (!autonomousReady.current || autonomousStarting.current) return;
    while (pendingAutonomousTasks.current.length) {
      const task = pendingAutonomousTasks.current[0];
      const target = runtime.current.find((node) => !node.offline && !node.powerAction && canAccept(node, task));
      if (target) {
        target.tasks.push(task);
        pendingAutonomousTasks.current.shift();
        addLog("AUTONOMOUS", `Assigned ${task.name} to node ${target.id}.`);
        continue;
      }
      const nextNode = runtime.current.find((node) => node.offline && !node.powerAction);
      if (!nextNode) return;
      autonomousStarting.current = true;
      nextNode.powerAction = "starting";
      window.setTimeout(() => {
        nextNode.offline = false;
        nextNode.powerAction = undefined;
        nextNode.temperature = Math.max(nextNode.temperature, 0);
        autonomousStarting.current = false;
        addLog("AUTONOMOUS", `Activated node ${nextNode.id} for queued work.`);
        dispatchAutonomousWork();
        redraw((value) => value + 1);
      }, 500);
      return;
    }
  }

  function setAutonomousMode(enabled: boolean) {
    if (enabled === autonomousRef.current) return;
    autonomousRef.current = enabled;
    setAutonomous(enabled);
    pendingAutonomousTasks.current = [];
    if (!enabled) {
      autonomousReady.current = false;
      autonomousStarting.current = false;
      powerAllServers();
      addLog("AUTONOMOUS", "Autonomous capacity control disabled.");
    return;
    }
    autonomousReady.current = false;
    runtime.current.forEach((node, index) => {
      pendingAutonomousTasks.current.push(...node.tasks);
      node.tasks = [];
      if (node.offline) {
        node.temperature = 0;
        return;
      }
      node.powerAction = "stopping";
      window.setTimeout(() => {
        node.offline = true;
        node.powerAction = undefined;
        redraw((value) => value + 1);
      }, index * 500);
    });
    const activeCount = runtime.current.filter((node) => node.powerAction === "stopping").length;
    const startDelay = Math.max(activeCount * 500 + 250, 750);
    window.setTimeout(() => {
      if (!autonomousRef.current) return;
      autonomousReady.current = true;
      addLog("AUTONOMOUS", "All node lights are out. Demand-based capacity control is active.");
      dispatchAutonomousWork();
    }, startDelay);
    addLog("AUTONOMOUS", "Autonomous mode engaged. Preserving workloads, then powering down sequentially.");
    setNotice("AUTONOMOUS MODE: draining workloads and waiting for all lights to go out.");
    window.setTimeout(() => setNotice(""), 5200);
    redraw((value) => value + 1);
  }

  return {
    telemetry,
    logs,
    notice,
    terminateTask,
    powerCluster,
    powerAllServers,
    autonomous,
    queuedTasks: pendingAutonomousTasks.current.length,
    setAutonomousMode,
  };
}