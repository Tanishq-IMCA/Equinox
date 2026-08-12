import argparse
import importlib.metadata
import os
import shlex
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parent
IS_WINDOWS = os.name == "nt"
NPM_COMMAND = ["npm.cmd"] if IS_WINDOWS else ["npm"]
REPLIT_NPM_MIRROR = "http://package-firewall.replit.local/npm/"
PUBLIC_NPM_REGISTRY = "https://registry.npmjs.org/"
DEFAULT_FRONTEND_PORT = 5000


def print_status(message: str) -> None:
    print(f"[equinox] {message}")


def run_command(
    command: list[str],
    cwd: Path | None = None,
    check: bool = True,
    capture_output: bool = False,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        check=check,
        text=True,
        capture_output=capture_output,
    )


def start_process(command: list[str], cwd: Path) -> subprocess.Popen[str]:
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if IS_WINDOWS else 0
    return subprocess.Popen(command, cwd=str(cwd), creationflags=creationflags)


def is_port_available(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return sock.connect_ex((host, port)) != 0


def find_available_port(start_port: int, host: str = "127.0.0.1", attempts: int = 20) -> int:
    for port in range(start_port, start_port + attempts):
        if is_port_available(port, host=host):
            return port
    raise RuntimeError(f"No free port found between {start_port} and {start_port + attempts - 1}.")


def command_exists(command: list[str]) -> bool:
    try:
        run_command(command, check=True, capture_output=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def ensure_node_available() -> None:
    if not command_exists(["node", "--version"]):
        raise RuntimeError("Node.js is required but was not found in PATH.")
    if not command_exists(NPM_COMMAND + ["--version"]):
        raise RuntimeError("npm is required but was not found in PATH.")


def npm_dependencies_satisfied(project_dir: Path) -> bool:
    node_modules = project_dir / "node_modules"
    if not node_modules.exists():
        return False

    try:
        run_command(
            NPM_COMMAND + ["ls", "--depth=0", "--silent"],
            cwd=project_dir,
            check=True,
            capture_output=True,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def ensure_npm_dependencies(project_dir: Path) -> None:
    package_json = project_dir / "package.json"
    if not package_json.exists():
        return

    ensure_node_available()
    sanitize_npm_lockfile(project_dir)

    if npm_dependencies_satisfied(project_dir):
        print_status(f"Node dependencies already satisfied in {project_dir.name or project_dir}.")
        return

    print_status(f"Installing Node dependencies in {project_dir.name or project_dir}...")
    install_command = NPM_COMMAND + ["ci"] if (project_dir / "package-lock.json").exists() else NPM_COMMAND + ["install"]
    run_command(install_command, cwd=project_dir)


def sanitize_npm_lockfile(project_dir: Path) -> None:
    lockfile = project_dir / "package-lock.json"
    if not lockfile.exists():
        return

    content = lockfile.read_text(encoding="utf-8")
    if REPLIT_NPM_MIRROR not in content:
        return

    print_status("Rewriting stale Replit npm mirror entries in package-lock.json...")
    lockfile.write_text(content.replace(REPLIT_NPM_MIRROR, PUBLIC_NPM_REGISTRY), encoding="utf-8")


def normalize_requirement_name(name: str) -> str:
    return name.strip().lower().replace("_", "-")


def parse_requirement_name(line: str) -> str | None:
    candidate = line.split(";", 1)[0].split("[", 1)[0].strip()
    if not candidate or candidate.startswith(("-", "#")):
        return None

    for separator in ("==", ">=", "<=", "~=", "!=", ">", "<"):
        if separator in candidate:
            candidate = candidate.split(separator, 1)[0].strip()
            break

    return normalize_requirement_name(candidate) if candidate else None


def iter_requirements(requirements_file: Path) -> Iterable[str]:
    for raw_line in requirements_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith(("-r", "--requirement", "git+", "http://", "https://")):
            yield line
            continue
        name = parse_requirement_name(line)
        if name:
            yield name


def python_requirements_satisfied(requirements_file: Path) -> bool:
    for requirement in iter_requirements(requirements_file):
        if requirement.startswith(("-r", "--requirement", "git+", "http://", "https://")):
            return False
        try:
            importlib.metadata.version(requirement)
        except importlib.metadata.PackageNotFoundError:
            return False
    return True


def ensure_python_requirements(requirements_file: Path) -> None:
    if not requirements_file.exists():
        return

    if python_requirements_satisfied(requirements_file):
        print_status(f"Python dependencies already satisfied in {requirements_file.parent.name}.")
        return

    print_status(f"Installing Python dependencies from {requirements_file.relative_to(ROOT)}...")
    run_command([sys.executable, "-m", "pip", "install", "-r", str(requirements_file)], cwd=requirements_file.parent)


def detect_frontend_dir() -> Path | None:
    for candidate in (ROOT, ROOT / "frontend"):
        if (candidate / "package.json").exists():
            return candidate
    return None


def detect_backend_entry() -> tuple[Path, list[str]] | None:
    candidates = (
        (ROOT / "backend", ["run.py", "app.py", "main.py", "server.py"]),
        (ROOT, ["backend.py"]),
    )
    for directory, files in candidates:
        if not directory.exists():
            continue
        for filename in files:
            entrypoint = directory / filename
            if entrypoint.exists():
                return directory, [sys.executable, filename]
    return None


def launch_services(frontend_dir: Path | None, backend: tuple[Path, list[str]] | None) -> list[subprocess.Popen[str]]:
    processes: list[subprocess.Popen[str]] = []

    if backend:
        backend_dir, backend_command = backend
        print_status(f"Starting backend: {' '.join(shlex.quote(part) for part in backend_command)}")
        processes.append(start_process(backend_command, cwd=backend_dir))
    else:
        print_status("No standalone backend detected. The current Next.js app serves the project entrypoint.")

    if frontend_dir:
        frontend_port = find_available_port(DEFAULT_FRONTEND_PORT)
        frontend_command = NPM_COMMAND + ["run", "dev", "--", "-p", str(frontend_port)]
        print_status(f"Starting frontend: {' '.join(shlex.quote(part) for part in frontend_command)}")
        processes.append(start_process(frontend_command, cwd=frontend_dir))
        print_status(f"Frontend expected at http://localhost:{frontend_port}")
    else:
        print_status("No frontend package.json found.")

    return processes


def stop_processes(processes: list[subprocess.Popen[str]]) -> None:
    for process in processes:
        if process.poll() is not None:
            continue
        process.terminate()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check dependencies and launch the Equinox frontend/backend services."
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Verify or install dependencies without launching any services.",
    )
    args = parser.parse_args()

    frontend_dir = detect_frontend_dir()
    backend = detect_backend_entry()

    if not frontend_dir and not backend:
        print_status("No runnable frontend or backend was detected.")
        return 1

    if frontend_dir:
        ensure_npm_dependencies(frontend_dir)

    if backend:
        backend_dir, _ = backend
        ensure_python_requirements(backend_dir / "requirements.txt")

    if args.check_only:
        print_status("Dependency check complete.")
        return 0

    processes = launch_services(frontend_dir, backend)
    if not processes:
        print_status("Nothing was launched.")
        return 1

    try:
        while True:
            for process in processes:
                exit_code = process.poll()
                if exit_code is not None:
                    print_status(f"Process {process.pid} exited with code {exit_code}.")
                    stop_processes(processes)
                    return exit_code
            time.sleep(1)
    except KeyboardInterrupt:
        print_status("Stopping services...")
        stop_processes(processes)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
