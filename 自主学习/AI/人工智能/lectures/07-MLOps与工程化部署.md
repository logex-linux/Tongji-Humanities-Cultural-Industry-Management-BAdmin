# 第七讲：MLOps 与工程化部署

> 本讲目标：掌握将 AI 模型从实验环境推向生产环境的完整工程能力——容器化、服务化、监控、优化。

---

## 一、为什么需要 MLOps？

### 1.1 从 Notebook 到生产的鸿沟

```
实验阶段（Notebook）：
  ✓ 数据是静态的
  ✓ 只跑一次
  ✓ 不在乎延迟
  ✓ 不需要高可用
  ✓ 一个人用

生产阶段（Production）：
  ✗ 数据持续流入
  ✗ 7×24 运行
  ✗ 延迟 < 200ms
  ✗ 99.9% 可用性
  ✗ 成千上万用户
  ✗ 模型会退化
  ✗ 需要版本管理和回滚
```

### 1.2 MLOps 全景图

```
数据管理 → 实验追踪 → 模型训练 → 模型评估 → 模型部署 → 监控运维
    ↑                                                          |
    └──────────── 反馈循环（数据漂移检测、重训练）←──────────────┘
```

---

## 二、容器化：Docker

### 2.1 为什么用 Docker？

"在我机器上能跑" → 用 Docker 打包整个环境，哪里都能跑。

```
不用 Docker：
  开发机: Python 3.10 + CUDA 11.8 + PyTorch 2.1
  服务器: Python 3.8 + CUDA 12.0 + PyTorch 2.0  → 跑不了！

用 Docker：
  镜像里包含一切 → 任何有 Docker 的机器都能跑
```

### 2.2 Dockerfile 实战

```dockerfile
# 基础镜像（带 CUDA 的 Python）
FROM nvidia/cuda:12.1-runtime-ubuntu22.04

# 安装 Python
RUN apt-get update && apt-get install -y python3.11 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 先复制依赖文件（利用 Docker 缓存层）
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2.3 构建与运行

```bash
# 构建镜像
docker build -t my-ai-app:1.0 .

# 运行（CPU）
docker run -p 8000:8000 my-ai-app:1.0

# 运行（GPU）
docker run --gpus all -p 8000:8000 my-ai-app:1.0

# 查看日志
docker logs -f <container_id>

# 停止
docker stop <container_id>
```

### 2.4 Docker Compose：多服务编排

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - MODEL_PATH=/models/bert-base
      - REDIS_URL=redis://cache:6379
    volumes:
      - ./models:/models
    depends_on:
      - cache
      - vectordb

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  vectordb:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - ./qdrant_data:/qdrant/storage

  frontend:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
    command: sh -c "npm install && npm run dev"
    ports:
      - "3000:3000"
```

```bash
# 一键启动所有服务
docker compose up -d

# 查看状态
docker compose ps

# 停止
docker compose down
```

### 2.5 镜像优化

```dockerfile
# 多阶段构建：减小镜像体积
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

FROM python:3.11-slim
COPY --from=builder /install /usr/local
COPY . /app
WORKDIR /app
CMD ["python", "main.py"]
```

**减小镜像的技巧：**
- 用 `slim` 或 `alpine` 基础镜像
- 多阶段构建（编译和运行分离）
- `.dockerignore` 排除不需要的文件
- 合并 RUN 命令（减少层数）
- 先 COPY requirements.txt 再 COPY 代码（利用缓存）

---

## 三、模型服务化

### 3.1 FastAPI 生产级服务

```python
"""生产级模型服务模板"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import time
import logging

app = FastAPI(title="AI Model Service", version="1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 模型加载（启动时一次性加载）
class ModelManager:
    def __init__(self):
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
    
    def load(self):
        logger.info("Loading model...")
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        self.tokenizer = AutoTokenizer.from_pretrained("bert-base-chinese")
        self.model = AutoModelForSequenceClassification.from_pretrained("bert-base-chinese")
        self.model.to(self.device).eval()
        logger.info("Model loaded!")

manager = ModelManager()

@app.on_event("startup")
async def startup():
    manager.load()

# 请求/响应模型
class PredictRequest(BaseModel):
    text: str
    max_length: int = 512

class PredictResponse(BaseModel):
    label: str
    confidence: float
    latency_ms: float

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    start = time.time()
    
    try:
        inputs = manager.tokenizer(
            req.text, return_tensors="pt", 
            truncation=True, max_length=req.max_length
        ).to(manager.device)
        
        with torch.no_grad():
            outputs = manager.model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)
            pred = probs.argmax(dim=-1).item()
            conf = probs[0, pred].item()
        
        latency = (time.time() - start) * 1000
        
        return PredictResponse(
            label=f"class_{pred}",
            confidence=round(conf, 4),
            latency_ms=round(latency, 2),
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": manager.model is not None}
```

### 3.2 vLLM 高性能 LLM 服务

```bash
# 安装
pip install vllm

# 启动服务（OpenAI 兼容 API）
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.90 \
    --max-num-seqs 256 \
    --enable-prefix-caching
```

**vLLM 的核心优化——PagedAttention：**
```
传统 KV Cache: 预分配连续内存 → 碎片化、浪费
PagedAttention: 像操作系统管理内存页一样管理 KV Cache
  → 显存利用率提升 2-4x
  → 吞吐量提升 2-4x
```

### 3.3 模型仓库与版本管理

```python
# 使用 Hugging Face Hub 管理模型
from huggingface_hub import HfApi

api = HfApi()

# 上传模型
api.upload_folder(
    folder_path="./my-model",
    repo_id="username/my-model-v1",
    repo_type="model",
)

# 下载模型
from huggingface_hub import snapshot_download
snapshot_download("username/my-model-v1", local_dir="./models/v1")
```

---

## 四、实验管理

### 4.1 Weights & Biases (W&B)

```python
import wandb

# 初始化实验
wandb.init(
    project="text-classification",
    name="bert-base-lr3e-5",
    config={
        "model": "bert-base-chinese",
        "learning_rate": 3e-5,
        "batch_size": 32,
        "epochs": 5,
        "max_length": 256,
    }
)

# 训练循环中记录
for epoch in range(5):
    train_loss = train_one_epoch()
    val_acc = evaluate()
    
    wandb.log({
        "train/loss": train_loss,
        "val/accuracy": val_acc,
        "epoch": epoch,
        "lr": optimizer.param_groups[0]['lr'],
    })

# 保存模型
wandb.save("best_model.pt")
wandb.finish()
```

### 4.2 MLflow（开源替代）

```python
import mlflow
import mlflow.pytorch

mlflow.set_tracking_uri("http://localhost:5000")
mlflow.set_experiment("text-classification")

with mlflow.start_run(run_name="bert-lr3e-5"):
    mlflow.log_params({"lr": 3e-5, "batch_size": 32, "epochs": 5})
    
    # 训练...
    mlflow.log_metrics({"train_loss": 0.23, "val_acc": 0.94})
    
    # 保存模型
    mlflow.pytorch.log_model(model, "model")
    
    # 保存 artifacts
    mlflow.log_artifact("training_curve.png")
```

```bash
# 启动 MLflow UI
mlflow ui --port 5000
# 浏览器打开 http://localhost:5000 查看所有实验对比
```

---

## 五、CI/CD 与自动化

### 5.1 GitHub Actions：模型测试与部署

```yaml
# .github/workflows/deploy.yml
name: Deploy AI Service

on:
  push:
    branches: [main]
    paths:
      - 'model/**'
      - 'api/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Run model tests
        run: |
          pytest tests/test_model.py -v
          pytest tests/test_api.py -v
      
      - name: Check model performance
        run: python scripts/validate_model.py --min-accuracy 0.92

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker image
        run: docker build -t my-ai-app:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          docker tag my-ai-app:${{ github.sha }} registry.example.com/my-ai-app:${{ github.sha }}
          docker push registry.example.com/my-ai-app:${{ github.sha }}
      
      - name: Deploy
        run: |
          kubectl set image deployment/ai-service \
            ai-service=registry.example.com/my-ai-app:${{ github.sha }}
```

### 5.2 模型测试

```python
"""tests/test_model.py"""
import pytest
import torch

class TestModel:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.model = load_model()
        self.model.eval()
    
    def test_output_shape(self):
        """输出形状正确"""
        x = torch.randn(1, 3, 224, 224)
        out = self.model(x)
        assert out.shape == (1, 10)
    
    def test_deterministic(self):
        """相同输入产生相同输出"""
        x = torch.randn(1, 3, 224, 224)
        out1 = self.model(x)
        out2 = self.model(x)
        assert torch.allclose(out1, out2)
    
    def test_known_input(self):
        """已知输入的预期输出（回归测试）"""
        x = load_test_image("cat.jpg")
        pred = self.model(x).argmax().item()
        assert pred == 3  # 类别3=猫
    
    def test_latency(self):
        """推理延迟在可接受范围内"""
        x = torch.randn(1, 3, 224, 224)
        start = time.time()
        for _ in range(100):
            self.model(x)
        avg_latency = (time.time() - start) / 100 * 1000
        assert avg_latency < 50  # < 50ms
    
    def test_edge_cases(self):
        """边界情况不崩溃"""
        # 全零输入
        x = torch.zeros(1, 3, 224, 224)
        out = self.model(x)
        assert not torch.isnan(out).any()
        
        # 极大值输入
        x = torch.ones(1, 3, 224, 224) * 1e6
        out = self.model(x)
        assert not torch.isnan(out).any()
```

---

## 六、监控与运维

### 6.1 数据漂移检测

```python
"""检测输入数据分布是否发生变化"""
from scipy import stats
import numpy as np

class DataDriftDetector:
    def __init__(self, reference_data: np.ndarray, threshold=0.05):
        self.reference = reference_data
        self.threshold = threshold
    
    def detect(self, current_data: np.ndarray) -> dict:
        results = {}
        for i in range(self.reference.shape[1]):
            # KS 检验：两个分布是否相同
            stat, p_value = stats.ks_2samp(
                self.reference[:, i], current_data[:, i]
            )
            results[f"feature_{i}"] = {
                "statistic": stat,
                "p_value": p_value,
                "drift_detected": p_value < self.threshold,
            }
        return results

# 使用
detector = DataDriftDetector(reference_data=train_features)
drift_report = detector.detect(current_data=new_features)

if any(v["drift_detected"] for v in drift_report.values()):
    alert("数据漂移检测！模型可能需要重训练")
```

### 6.2 模型性能监控

```python
"""监控模型在生产中的表现"""
import time
from collections import deque
from dataclasses import dataclass

@dataclass
class PredictionLog:
    timestamp: float
    input_text: str
    prediction: str
    confidence: float
    latency_ms: float
    user_feedback: int = None  # 1=好, -1=差

class ModelMonitor:
    def __init__(self, window_size=1000):
        self.logs = deque(maxlen=window_size)
    
    def log(self, entry: PredictionLog):
        self.logs.append(entry)
    
    def get_metrics(self) -> dict:
        if not self.logs:
            return {}
        
        logs = list(self.logs)
        return {
            "total_predictions": len(logs),
            "avg_latency_ms": np.mean([l.latency_ms for l in logs]),
            "p99_latency_ms": np.percentile([l.latency_ms for l in logs], 99),
            "avg_confidence": np.mean([l.confidence for l in logs]),
            "low_confidence_rate": sum(1 for l in logs if l.confidence < 0.7) / len(logs),
            "negative_feedback_rate": (
                sum(1 for l in logs if l.user_feedback == -1) / 
                max(1, sum(1 for l in logs if l.user_feedback is not None))
            ),
        }
    
    def should_retrain(self) -> bool:
        metrics = self.get_metrics()
        return (
            metrics.get("negative_feedback_rate", 0) > 0.15 or
            metrics.get("low_confidence_rate", 0) > 0.3 or
            metrics.get("p99_latency_ms", 0) > 500
        )
```

### 6.3 告警与自动扩缩容

```yaml
# Kubernetes HPA (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: requests_per_second
        target:
          type: AverageValue
          averageValue: "100"
```

---

## 七、模型优化

### 7.1 量化

```python
# PyTorch 动态量化（CPU 推理加速）
import torch.quantization

model_fp32 = load_model()
model_int8 = torch.quantization.quantize_dynamic(
    model_fp32, {torch.nn.Linear}, dtype=torch.qint8
)
# 模型大小减少 ~4x，推理速度提升 ~2x

# GPTQ 量化（GPU，LLM 专用）
from transformers import AutoModelForCausalLM, GPTQConfig

quantization_config = GPTQConfig(
    bits=4,
    dataset="c4",
    tokenizer=tokenizer,
)
model = AutoModelForCausalLM.from_pretrained(
    "model_name",
    quantization_config=quantization_config,
    device_map="auto",
)
```

### 7.2 ONNX 导出

```python
import torch
import onnxruntime as ort

# 导出 ONNX
model = load_model().eval()
dummy_input = torch.randn(1, 3, 224, 224)
torch.onnx.export(
    model, dummy_input, "model.onnx",
    input_names=["image"],
    output_names=["logits"],
    dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}},
)

# ONNX Runtime 推理（通常比 PyTorch 快 20-50%）
session = ort.InferenceSession("model.onnx", providers=["CUDAExecutionProvider"])
inputs = {"image": input_array}
outputs = session.run(None, inputs)
```

### 7.3 知识蒸馏

```python
"""用大模型（Teacher）指导小模型（Student）学习"""

class DistillationLoss(nn.Module):
    def __init__(self, temperature=4.0, alpha=0.7):
        super().__init__()
        self.T = temperature
        self.alpha = alpha
    
    def forward(self, student_logits, teacher_logits, labels):
        # 软标签损失（学习 Teacher 的"暗知识"）
        soft_loss = F.kl_div(
            F.log_softmax(student_logits / self.T, dim=-1),
            F.softmax(teacher_logits / self.T, dim=-1),
            reduction='batchmean'
        ) * (self.T ** 2)
        
        # 硬标签损失（学习真实标签）
        hard_loss = F.cross_entropy(student_logits, labels)
        
        return self.alpha * soft_loss + (1 - self.alpha) * hard_loss

# Teacher: ResNet-152 (大模型)
# Student: MobileNet (小模型)
# 结果: Student 达到 Teacher 95% 的精度，但快 10x
```

### 7.4 分布式训练

```python
"""多 GPU 训练（PyTorch DDP）"""
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP

def setup(rank, world_size):
    dist.init_process_group("nccl", rank=rank, world_size=world_size)
    torch.cuda.set_device(rank)

def train(rank, world_size):
    setup(rank, world_size)
    
    model = MyModel().to(rank)
    model = DDP(model, device_ids=[rank])
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    
    for epoch in range(10):
        sampler.set_epoch(epoch)
        for batch in dataloader:
            loss = model(batch)
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()
    
    dist.destroy_process_group()

# 启动: torchrun --nproc_per_node=4 train.py
```

---

## 八、云平台部署

### 8.1 部署选项对比

| 方案 | 适用场景 | 成本 | 复杂度 |
|------|----------|------|--------|
| 本地服务器 | 数据敏感、长期运行 | 高（硬件） | 高 |
| 云 VM (EC2/ECS) | 需要完全控制 | 中 | 中 |
| 容器服务 (EKS/ACK) | 微服务、自动扩缩 | 中 | 中高 |
| Serverless (Modal/Replicate) | 按需调用、不想运维 | 按用量 | **低** |
| 模型 API (OpenAI/Claude) | 不想管基础设施 | 按 token | **最低** |

### 8.2 Modal：Serverless GPU 部署

```python
import modal

app = modal.App("ai-service")

image = modal.Image.debian_slim().pip_install("torch", "transformers", "fastapi")

@app.cls(gpu="A10G", image=image, container_idle_timeout=300)
class ModelService:
    @modal.enter()
    def load_model(self):
        from transformers import pipeline
        self.pipe = pipeline("text-generation", model="Qwen/Qwen2.5-7B-Instruct")
    
    @modal.method()
    def generate(self, prompt: str) -> str:
        return self.pipe(prompt, max_new_tokens=200)[0]["generated_text"]

@app.function(image=image)
def api():
    from fastapi import FastAPI
    web_app = FastAPI()
    
    @web_app.post("/generate")
    async def generate(prompt: str):
        return await ModelService().generate.remote(prompt)
    
    return web_app
```

```bash
# 部署
modal deploy main.py
# 得到 URL: https://your-app.modal.run
```

---

## 九、本讲小结

| 环节 | 核心工具 | 关键实践 |
|------|----------|----------|
| 容器化 | Docker, Compose | 多阶段构建、GPU 支持 |
| 模型服务 | FastAPI, vLLM | 流式响应、健康检查 |
| 实验管理 | W&B, MLflow | 参数/指标/模型版本化 |
| CI/CD | GitHub Actions | 自动测试、构建、部署 |
| 监控 | 自定义 + Grafana | 延迟、漂移、反馈 |
| 优化 | 量化、ONNX、蒸馏 | 减小体积、加速推理 |
| 部署 | K8s, Modal, 云平台 | 自动扩缩、高可用 |

---

## 十、练习题

### 基础题
1. 写一个 Dockerfile，把你的 FastAPI 模型服务打包成镜像并运行
2. 用 W&B 记录一次完整的训练实验（参数、损失曲线、模型文件）
3. 对一个 PyTorch 模型做 INT8 量化，对比量化前后的精度和速度

### 进阶题
4. 用 Docker Compose 编排：API 服务 + Redis 缓存 + 向量数据库
5. 写一个 GitHub Actions 工作流：push 时自动跑测试、构建镜像、部署
6. 实现数据漂移检测：对比训练数据和线上数据的分布差异

### 挑战题
7. 用 vLLM 部署一个 7B 模型，压测 QPS 和 P99 延迟
8. 实现完整的模型版本管理：训练→评估→注册→部署→回滚
9. 用知识蒸馏把 BERT-base 的能力迁移到 DistilBERT，对比效果

---

## 十一、推荐资源

| 资源 | 说明 |
|------|------|
| Docker 官方 Get Started | 容器化入门 |
| FastAPI 官方教程 | 最好的 Python Web 框架文档 |
| vLLM 文档 | LLM 高性能推理 |
| W&B 官方教程 | 实验管理 |
| Made With ML (Goku Mohandas) | MLOps 全流程免费课 |
| 《Designing Machine Learning Systems》(Chip Huyen) | ML 系统设计圣经 |

---

> **下一讲预告：** 第八讲 AI 安全与伦理——对齐、偏见、隐私、可解释性，做一个负责任的 AI 工程师。
