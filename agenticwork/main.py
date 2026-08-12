import random
import pandas as pd

random.seed(42)

# ---------------------------------------------------------------------------
# Resource tier bounds (my own assumptions -- documented in the workbook)
# ---------------------------------------------------------------------------
CPU_BOUNDS = {          # % of a single node's total CPU capacity
    'negligible': (0.1, 1.0),
    'low': (1.0, 8.0),
    'medium': (8.0, 25.0),
    'high': (25.0, 70.0),
}
RAM_BOUNDS = {          # MB
    'negligible': (10, 100),
    'low': (100, 1024),
    'medium': (1024, 8192),
    'high': (8192, 32768),
}
GPU_UTIL_BOUNDS = {     # % of a single node's GPU compute capacity
    'none': (0, 0),
    'low': (0, 5),
    'medium': (15, 50),
    'high': (50, 95),
}
GPU_MEM_BOUNDS = {      # MB
    'none': (0, 0),
    'low': (0, 2048),
    'medium': (2048, 12288),
    'high': (12288, 40960),
}
POWER_BOUNDS = {        # Watts contributed to the node by this single task
    'negligible': (1, 5),
    'low': (5, 25),
    'medium': (25, 150),
    'high': (150, 900),
}
TEMP_BOUNDS = {         # Deg C -- component temperature while this task is active
    'negligible': (30, 40),
    'low': (35, 50),
    'medium': (50, 70),
    'high': (70, 95),
}


def rand_subrange(bounds_tuple, integer=True):
    lo, hi = bounds_tuple
    if hi <= lo:
        return (0, 0)
    span = hi - lo
    a = lo + random.uniform(0, span * 0.6)
    b = a + random.uniform(span * 0.15, max(span * 0.5, 0.01))
    b = min(b, hi)
    if integer:
        a, b = int(round(a)), int(round(b))
        if b <= a:
            b = a + 1
    else:
        a, b = round(a, 1), round(b, 1)
        if b <= a:
            b = round(a + 0.1, 1)
    return (a, b)


def fmt_pct(rng):
    a, b = rng
    return f"{a}-{b}%"


def fmt_watts(rng):
    a, b = rng
    return f"{a}-{b} W"


def fmt_temp(rng):
    a, b = rng
    return f"{a}-{b} \u00b0C"


def fmt_mem(rng_mb):
    a, b = rng_mb
    if b == 0:
        return "0 MB"
    if b < 1024:
        return f"{a}-{b} MB"
    a_gb = round(a / 1024, 2)
    b_gb = round(b / 1024, 2)
    return f"{a_gb}-{b_gb} GB"


def build_row(cpu_tier, gpu_tier, power_tier=None, temp_tier=None, ram_tier=None):
    # default: power/temp/ram track the cpu tier unless overridden
    power_tier = power_tier or cpu_tier
    temp_tier = temp_tier or cpu_tier
    ram_tier = ram_tier or cpu_tier
    cpu = rand_subrange(CPU_BOUNDS[cpu_tier], integer=False)
    ram = rand_subrange(RAM_BOUNDS[ram_tier])
    gpu_u = rand_subrange(GPU_UTIL_BOUNDS[gpu_tier], integer=False)
    gpu_m = rand_subrange(GPU_MEM_BOUNDS[gpu_tier])
    pwr = rand_subrange(POWER_BOUNDS[power_tier])
    temp = rand_subrange(TEMP_BOUNDS[temp_tier])
    return {
        'CPU_Usage_Range': fmt_pct(cpu),
        'RAM_Usage_Range': fmt_mem(ram),
        'GPU_Usage_Range': fmt_pct(gpu_u) if gpu_tier != 'none' else "0%",
        'GPU_Memory_Range': fmt_mem(gpu_m) if gpu_tier != 'none' else "0 MB",
        'Power_Usage_Range': fmt_watts(pwr),
        'Temperature_Range': fmt_temp(temp),
    }


# ---------------------------------------------------------------------------
# Task name libraries (50 each, real / believable software & OS process names)
# ---------------------------------------------------------------------------

OS_TASKS = [
    "System Idle Process", "System", "Registry", "smss.exe", "csrss.exe (Session 0)",
    "csrss.exe (Session 1)", "wininit.exe", "services.exe", "lsass.exe", "winlogon.exe",
    "svchost.exe (DcomLaunch)", "svchost.exe (RpcSs)", "svchost.exe (RpcEptMapper)",
    "svchost.exe (Schedule)", "svchost.exe (EventLog)", "svchost.exe (LanmanServer)",
    "svchost.exe (LanmanWorkstation)", "svchost.exe (Dnscache)", "svchost.exe (NcbService)",
    "svchost.exe (Power)", "svchost.exe (ProfSvc)", "svchost.exe (Themes)",
    "svchost.exe (SysMain)", "svchost.exe (Netman)", "svchost.exe (nsi)",
    "svchost.exe (TimeBrokerSvc)", "svchost.exe (UserManager)", "dwm.exe", "explorer.exe",
    "taskhostw.exe", "taskeng.exe", "RuntimeBroker.exe", "dllhost.exe (COM Surrogate)",
    "conhost.exe", "WmiPrvSE.exe", "spoolsv.exe", "LogonUI.exe", "fontdrvhost.exe",
    "sihost.exe", "ctfmon.exe", "msdtc.exe", "vssvc.exe", "TrustedInstaller.exe",
    "dfsrs.exe", "Ntfrs.exe", "lsm.exe", "audiodg.exe", "SecurityHealthService.exe",
    "WUDFHost.exe", "dns.exe (Windows DNS Server role)",
]

BG_TASKS = [
    "Windows Update (wuauserv)", "Windows Defender Antivirus Scan (MsMpEng.exe)",
    "Windows Defender Real-Time Protection", "Background Intelligent Transfer Service (BITS)",
    "Print Spooler (Spooler)", "Task Scheduler Engine", "Windows Search Indexer (SearchIndexer.exe)",
    "SysMain (Superfetch)", "Remote Registry Service", "Server Service (LanmanServer)",
    "Workstation Service (LanmanWorkstation)", "DHCP Client Service", "DNS Client Service",
    "Windows Time Service (W32Time)", "Group Policy Client Service", "Volume Shadow Copy Service (VSS)",
    "Windows Firewall Service (MpsSvc)", "Network List Service", "Network Location Awareness (NLA)",
    "Certificate Propagation Service", "Credential Manager Service", "Device Setup Manager Service",
    "Distributed Link Tracking Client", "Windows Event Log Service",
    "Windows Management Instrumentation (WMI)", "Windows Push Notifications Service",
    "IP Helper Service (iphlpsvc)", "Smart Card Service", "Windows Biometric Service",
    "Application Identity Service", "COM+ Event System", "Diagnostic Policy Service",
    "Windows Connection Manager", "Remote Procedure Call Locator", "Superfetch Cache Maintenance",
    "Delivery Optimization Service", "OneDrive Sync Engine (OneDrive.exe)",
    "NVIDIA Telemetry Container", "NVIDIA Display Container LS", "Google Update Service (gupdate)",
    "Adobe Genuine Software Service", "Java Update Scheduler (jusched.exe)",
    "Apple Mobile Device Service", "Realtek Audio Universal Service",
    "Intel(R) Dynamic Platform and Thermal Framework", "Dell SupportAssist Agent",
    "HP Support Assistant Service", "Bonjour Service (mDNSResponder)",
    "Windows Modules Installer (TrustedInstaller service)", "Cryptographic Services (CryptSvc)",
]

ML_TASKS = [
    "TensorFlow model.fit() training run", "PyTorch training loop (ResNet-50)",
    "PyTorch DataLoader worker", "Keras Sequential model training",
    "scikit-learn RandomForestClassifier fit", "XGBoost training job", "LightGBM training job",
    "CatBoost training job", "Jupyter kernel executing training notebook", "MLflow experiment run",
    "Hugging Face Trainer fine-tuning (BERT-base)", "Hugging Face Trainer fine-tuning (DistilBERT)",
    "YOLOv8 object detection training", "YOLOv5 inference batch job", "ONNX Runtime inference session",
    "CUDA cuDNN convolution benchmark", "Ray Tune hyperparameter search",
    "Optuna hyperparameter optimization", "Albumentations image augmentation pipeline",
    "H2O AutoML search", "Google AutoML Vision training job", "scikit-image feature extraction job",
    "OpenCV DNN module inference", "Pandas feature engineering pipeline",
    "Dask distributed training worker", "Apache Spark MLlib training job",
    "TensorBoard logging process", "Weights & Biases sync agent", "PyTorch Lightning training run",
    "FastAI training loop", "Detectron2 instance segmentation training", "Mask R-CNN training job",
    "GAN training loop (StyleGAN2)", "Variational Autoencoder training",
    "Reinforcement learning training (Stable-Baselines3 PPO)",
    "Reinforcement learning training (OpenAI Gym env)", "AlphaFold protein structure inference",
    "Time-series forecasting (Prophet) fit", "Time-series forecasting (ARIMA) fit",
    "Feature scaling / normalization pipeline (scikit-learn)",
    "Cross-validation grid search (GridSearchCV)", "Model quantization job (TensorFlow Lite converter)",
    "Model pruning job (PyTorch)", "ONNX model export job", "TensorRT engine build",
    "Data labeling pipeline (Label Studio backend)", "Feature store sync job (Feast)",
    "Kubeflow Pipelines training component", "SageMaker training container (local sim)",
    "NVIDIA DALI data loading pipeline",
]
ML_CPU_ONLY = {
    "scikit-learn RandomForestClassifier fit", "XGBoost training job", "LightGBM training job",
    "CatBoost training job", "Pandas feature engineering pipeline",
    "Time-series forecasting (Prophet) fit", "Time-series forecasting (ARIMA) fit",
    "Feature scaling / normalization pipeline (scikit-learn)",
    "Cross-validation grid search (GridSearchCV)", "scikit-image feature extraction job",
}

LLM_TASKS = [
    "llama.cpp inference (Llama 3 8B)", "llama.cpp inference (Llama 3 70B, quantized)",
    "Ollama serving Mistral 7B", "Ollama serving Mixtral 8x7B", "vLLM serving Llama 2 13B",
    "vLLM serving GPT-J 6B", "text-generation-webui running LLaMA 2 7B",
    "FastChat serving Vicuna 13B", "Hugging Face transformers pipeline (text-generation)",
    "Hugging Face transformers pipeline (summarization)", "GPT-NeoX 20B inference",
    "Falcon 40B inference session", "GGUF quantized model inference (Q4_K_M)",
    "LM Studio local inference session", "Triton Inference Server serving LLM",
    "DeepSpeed inference engine (ZeRO-Inference)", "TensorRT-LLM execution",
    "LangChain agent execution", "LlamaIndex RAG query pipeline",
    "Sentence-Transformers embedding generation", "OpenAI Whisper transcription (large-v3)",
    "Stable Diffusion XL image generation", "Stable Diffusion 1.5 inference batch",
    "ComfyUI workflow execution", "Automatic1111 WebUI inference", "Chroma vector database query",
    "Pinecone local index build", "FAISS similarity search job", "Semantic Kernel plugin execution",
    "AutoGPT autonomous agent loop", "BabyAGI task loop", "Claude API local proxy cache layer",
    "Local RAG document ingestion pipeline", "GPT4All local model inference",
    "Phi-3 model inference (Microsoft)", "Gemma 7B inference", "Command R+ inference",
    "Mistral-7B-Instruct fine-tuning (LoRA)", "QLoRA fine-tuning job", "PEFT adapter training",
    "Text embedding batch job (local endpoint)", "Speech synthesis (Coqui TTS) inference",
    "Whisper.cpp transcription", "LLM token streaming server (llama-cpp-python server)",
    "Multi-modal inference (LLaVA)", "Function-calling agent execution",
    "Retrieval-augmented chatbot backend", "Model context caching service",
    "Prompt evaluation batch job (local LangSmith)",
    "KV-cache paged attention server (vLLM continuous batching)",
]
LLM_CPU_LEAN = {
    "GGUF quantized model inference (Q4_K_M)", "Whisper.cpp transcription",
    "FAISS similarity search job", "Chroma vector database query", "Pinecone local index build",
    "Claude API local proxy cache layer", "Model context caching service",
}

GAMING_TASKS = [
    "Cyberpunk 2077", "Counter-Strike 2", "Call of Duty: Warzone", "Fortnite",
    "Minecraft Java Edition (client)", "Minecraft Java Edition (dedicated server)", "Valorant",
    "League of Legends", "Grand Theft Auto V", "Red Dead Redemption 2", "Elden Ring",
    "Apex Legends", "World of Warcraft", "Dota 2", "Rust (dedicated server)",
    "ARK: Survival Evolved (dedicated server)", "Baldur's Gate 3", "Starfield",
    "Forza Horizon 5", "Overwatch 2", "PUBG: Battlegrounds", "Escape from Tarkov",
    "Genshin Impact", "Rocket League", "Team Fortress 2", "Palworld (dedicated server)",
    "Valheim (dedicated server)", "7 Days to Die (dedicated server)", "Destiny 2", "Diablo IV",
    "Hogwarts Legacy", "The Witcher 3: Wild Hunt", "Microsoft Flight Simulator",
    "Assassin's Creed Valhalla", "Battlefield 2042", "Halo Infinite", "EA Sports FC 24",
    "Age of Empires IV", "Total War: Warhammer III", "Sea of Thieves",
    "Terraria (dedicated server)", "Stardew Valley", "Space Engineers (dedicated server)",
    "Satisfactory (dedicated server)", "Left 4 Dead 2", "Garry's Mod (dedicated server)",
    "Squad (dedicated server)", "Warframe", "Path of Exile", "Star Citizen",
]

HOSTING_TASKS = [
    "IIS Worker Process (w3wp.exe)", "Apache HTTP Server (httpd)", "Nginx reverse proxy",
    "Microsoft SQL Server (sqlservr.exe)", "MySQL Server (mysqld)", "PostgreSQL Server (postgres)",
    "MongoDB Server (mongod)", "Redis Server", "Docker container - nginx",
    "Docker container - node-app", "Kubernetes kubelet", "Kubernetes kube-proxy",
    "Node.js Express server", "Apache Tomcat servlet container", "RabbitMQ broker",
    "Elasticsearch node", "FileZilla FTP Server", "Minecraft server hosting process",
    "Plex Media Server", "Microsoft Exchange Server (Transport service)",
    "WordPress hosting (PHP-FPM worker)", "phpMyAdmin (Apache-hosted)",
    "Jenkins CI Server", "GitLab Runner", "TeamSpeak 3 Server",
    "Discord bot hosting process (Node.js)", "Nextcloud server (PHP-FPM)",
    "Home Assistant server", "Grafana server", "Prometheus server", "InfluxDB server",
    "HAProxy load balancer", "Squid proxy server", "OpenVPN server", "WireGuard VPN server",
    "Samba file server (smbd)", "NFS server", "vsftpd FTP server", "Memcached server",
    "Cassandra node", "CouchDB server", "Kafka broker", "Zookeeper node",
    "MinIO object storage server", "Portainer container management", "Traefik reverse proxy",
    "Certbot renewal service", "Webmin control panel service", "Ghost blogging platform (Node.js)",
    "Caddy web server",
]

DISK_TASKS = [
    "CHKDSK scan", "Windows Defender full disk scan", "Robocopy large file transfer",
    "Storage Spaces resync", "RAID array rebuild", "BitLocker drive encryption pass",
    "Disk Defragmenter (defrag.exe)", "Veeam Backup & Replication job",
    "Windows Server Backup job", "mysqldump database backup", "pg_dump database backup",
    "Volume Shadow Copy (VSS) snapshot creation", "SearchIndexer.exe file indexing",
    "7-Zip archive extraction", "WinRAR archive creation",
    "HandBrake video transcode (disk write)", "Log rotation write job", "qBittorrent seeding",
    "rsync file synchronization", "tar archive creation", "SQL Server transaction log write",
    "Hyper-V VM disk snapshot commit", "VMware vSAN resync", "ZFS scrub operation",
    "NTFS journal update", "Robocopy mirror job (/MIR)", "xcopy batch transfer",
    "Windows Update disk staging", "SSD TRIM operation", "Storage tiering migration (ReFS)",
    "Database index rebuild (SQL Server)", "Full-text index population",
    "Event log archival write", "Crash dump write (memory.dmp)", "Page file write operation",
    "Windows Search catalog rebuild", "Duplicati backup job", "Restic backup job",
    "rclone cloud sync job", "Docker image layer pull/write", "Git large repository clone",
    "Video surveillance NVR recording write", "Database transaction checkpoint",
    "Exchange Server mailbox database write", "SharePoint content database write",
    "Print job spooling to disk", "Windows Installer (MSI) package write",
    "System Restore point creation", "Disk cleanup temp file purge",
    "iSCSI target disk write",
]

GEN_TASKS = [
    "Google Chrome - browsing tab", "Google Chrome - YouTube video playback tab",
    "Google Chrome - Gmail tab", "Google Chrome - Google Docs tab",
    "Microsoft Edge - browsing tab", "Microsoft Edge - Outlook Web Access tab",
    "Mozilla Firefox - browsing tab", "Mozilla Firefox - Netflix streaming tab",
    "Spotify Desktop - music playback", "Spotify Desktop - podcast playback",
    "Zoom Meeting Client", "Microsoft Teams", "Outlook desktop email sync", "Slack Desktop",
    "Adobe Acrobat Reader (PDF viewing)", "Microsoft Word (document editing)",
    "Microsoft Excel (spreadsheet open)", "Microsoft PowerPoint (idle)", "Notepad++",
    "Visual Studio Code (idle editor)", "Windows File Explorer", "Windows Photos Viewer",
    "Steam Client (idle/background)", "Discord (voice chat idle)",
    "Discord (text chat browsing)", "WhatsApp Desktop", "Telegram Desktop",
    "OneNote background sync", "VLC Media Player (local video playback)",
    "Windows Calculator", "Windows Settings App", "Windows Snipping Tool",
    "Windows Sticky Notes", "Paint (mspaint.exe)", "Windows Mail app", "Skype",
    "Signal Desktop", "Amazon Kindle app", "Google Chrome - Facebook tab",
    "Google Chrome - Twitter/X tab", "Google Chrome - Reddit tab",
    "Google Chrome - LinkedIn tab", "Google Chrome - Amazon shopping tab",
    "Microsoft Edge - Bing search tab", "Firefox - Wikipedia browsing tab",
    "Notion desktop app", "Evernote desktop app", "Windows Media Player", "iTunes (idle)",
    "CCleaner scan",
]

assert len(OS_TASKS) == 50, len(OS_TASKS)
assert len(BG_TASKS) == 50, len(BG_TASKS)
assert len(ML_TASKS) == 50, len(ML_TASKS)
assert len(LLM_TASKS) == 50, len(LLM_TASKS)
assert len(GAMING_TASKS) == 50, len(GAMING_TASKS)
assert len(HOSTING_TASKS) == 50, len(HOSTING_TASKS)
assert len(DISK_TASKS) == 50, len(DISK_TASKS)
assert len(GEN_TASKS) == 50, len(GEN_TASKS)

rows = []
counter = 1

def add_category(prefix, category_label, tasks, tier_fn, gpu_fn):
    global counter
    for name in tasks:
        cpu_tier = tier_fn(name)
        gpu_tier = gpu_fn(name, cpu_tier)
        row = build_row(cpu_tier=cpu_tier, gpu_tier=gpu_tier)
        row_out = {
            'Task_ID': f"{prefix}-{counter:03d}",
            'Category': category_label,
            'Task_Name': name,
            'Intensity_Tier': cpu_tier.capitalize(),
        }
        row_out.update(row)
        rows.append(row_out)
        counter += 1

# --- 1. Operating System tasks: low to negligible ---
def os_tier(name):
    return random.choices(['negligible', 'low'], weights=[30, 70])[0]
def no_gpu(name, tier):
    return 'none'
add_category("OS", "Operating System", OS_TASKS, os_tier, no_gpu)

# --- 2. Background services: low to negligible, tiny gpu exceptions ---
GPU_TOUCH_BG = {"NVIDIA Telemetry Container", "NVIDIA Display Container LS"}
def bg_tier(name):
    return random.choices(['negligible', 'low'], weights=[30, 70])[0]
def bg_gpu(name, tier):
    return 'low' if name in GPU_TOUCH_BG else 'none'
add_category("BG", "Background Services", BG_TASKS, bg_tier, bg_gpu)

# --- 3. Machine learning: 80% medium-high, 20% low ---
def ml_tier(name):
    if random.random() < 0.8:
        return random.choice(['medium', 'high'])
    return 'low'
def ml_gpu(name, tier):
    if name in ML_CPU_ONLY:
        return 'low'
    return tier if tier in ('medium', 'high') else 'low'
add_category("ML", "Machine Learning", ML_TASKS, ml_tier, ml_gpu)

# --- 4. LLM model execution: 80% medium-high, 20% low ---
def llm_tier(name):
    if random.random() < 0.8:
        return random.choice(['medium', 'high'])
    return 'low'
def llm_gpu(name, tier):
    if name in LLM_CPU_LEAN:
        return 'low'
    return tier if tier in ('medium', 'high') else 'low'
add_category("LLM", "LLM Model Execution", LLM_TASKS, llm_tier, llm_gpu)

# --- 5. Gaming: full low-high spread ---
def gaming_tier(name):
    return random.choice(['low', 'medium', 'high'])
def gaming_gpu(name, tier):
    if "server)" in name or "dedicated server" in name:
        return 'low'
    return tier
add_category("GAM", "Gaming", GAMING_TASKS, gaming_tier, gaming_gpu)

# --- 6. Hosting: low-medium only, no/low gpu ---
def hosting_tier(name):
    return random.choice(['low', 'medium'])
def hosting_gpu(name, tier):
    return 'low' if name == "Plex Media Server" else 'none'
add_category("HOST", "Hosting", HOSTING_TASKS, hosting_tier, hosting_gpu)

# --- 7. Disk read/write: low-medium only, no gpu ---
def disk_tier(name):
    return random.choice(['low', 'medium'])
add_category("DISK", "Disk Read/Write", DISK_TASKS, disk_tier, no_gpu)

# --- 8. General tasks / browsing: low only, occasional negligible/low gpu ---
GPU_TOUCH_GEN = {
    "Google Chrome - YouTube video playback tab", "Mozilla Firefox - Netflix streaming tab",
    "VLC Media Player (local video playback)", "Windows Media Player",
}
def gen_tier(name):
    return random.choices(['negligible', 'low'], weights=[25, 75])[0]
def gen_gpu(name, tier):
    return 'low' if name in GPU_TOUCH_GEN else 'none'
add_category("GEN", "General/Browsing", GEN_TASKS, gen_tier, gen_gpu)

df = pd.DataFrame(rows)
print(df.shape)
print(df['Category'].value_counts())
df.to_pickle('tasks.pkl')
df.to_csv('tasks_preview.csv', index=False)
df.to_excel('tasks_library.xlsx', index=False)
print(df.head(10).to_string())