# AI 全流程全栈学习方案

> 从数学基础到模型部署，从经典机器学习到大模型应用开发——一份系统化的 AI 学习路线图。
>
> 最后更新：2026年7月

---

## 目录

1. [总览与学习路径](#总览与学习路径)
2. [第一阶段：数学与编程基础](#第一阶段数学与编程基础)
3. [第二阶段：机器学习核心](#第二阶段机器学习核心)
4. [第三阶段：深度学习](#第三阶段深度学习)
5. [第四阶段：自然语言处理与计算机视觉](#第四阶段自然语言处理与计算机视觉)
6. [第五阶段：大语言模型（LLM）](#第五阶段大语言模型llm)
7. [第六阶段：AI 应用开发](#第六阶段ai-应用开发)
8. [第七阶段：MLOps 与工程化部署](#第七阶段mlops-与工程化部署)
9. [第八阶段：AI 安全与伦理](#第八阶段ai-安全与伦理)
10. [持续学习：论文、社区与前沿追踪](#持续学习论文社区与前沿追踪)
11. [推荐项目实战清单](#推荐项目实战清单)
12. [学习时间规划建议](#学习时间规划建议)

---

## 总览与学习路径

```
数学基础 → 编程基础 → 机器学习 → 深度学习 → NLP/CV → LLM → AI应用开发 → MLOps部署
   ↑                                                                              |
   └──────────────────── 持续学习：论文阅读 / 社区 / 前沿追踪 ←────────────────────┘
```

**核心理念：**
- 理论与实践交替进行，每学一个概念就动手写代码验证
- 不追求"学完再动手"，而是"边学边做"
- 每个阶段都有明确的里程碑项目作为检验标准

---

## 第一阶段：数学与编程基础

> ⏱ 建议时长：6-10 周（有基础可跳过）

### 1.1 数学基础

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| 线性代数 | 向量、矩阵运算、特征值分解、SVD | 3Blue1Brown《Essence of Linear Algebra》(YouTube/B站) |
| 微积分 | 偏导数、链式法则、梯度、多元函数优化 | 3Blue1Brown《Essence of Calculus》 |
| 概率与统计 | 贝叶斯定理、分布、期望、最大似然估计 | StatQuest (YouTube)、可汗学院 |
| 优化理论 | 梯度下降、凸优化、拉格朗日乘子 | Boyd《Convex Optimization》(Stanford EE364a) |

**里程碑：** 能手推线性回归的梯度下降公式，理解反向传播的链式法则。

### 1.2 编程基础

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| Python 基础 | 数据类型、函数、OOP、装饰器 | Python官方教程 / 廖雪峰Python教程 |
| 科学计算 | NumPy、Pandas、Matplotlib | 《Python for Data Analysis》(Wes McKinney) |
| 数据结构与算法 | 数组、树、图、排序、动态规划 | LeetCode Easy 50题 |
| Linux & Git | 命令行操作、版本控制 | The Missing Semester (MIT) |

**里程碑：** 用纯 NumPy 实现一个线性回归 + 逻辑回归，不依赖 sklearn。

---

## 第二阶段：机器学习核心

> ⏱ 建议时长：8-12 周

### 2.1 经典机器学习

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| 监督学习 | 线性回归、逻辑回归、SVM、决策树、随机森林、XGBoost | Andrew Ng《Machine Learning Specialization》(Coursera) |
| 无监督学习 | K-Means、PCA、DBSCAN、GMM | 同上 + scikit-learn 文档 |
| 模型评估 | 交叉验证、过拟合/欠拟合、正则化、偏差-方差权衡 | 《Hands-On ML with Scikit-Learn & TensorFlow》(Aurélien Géron) |
| 特征工程 | 编码、缩放、特征选择、Pipeline | Kaggle Learn 系列 |

### 2.2 实践工具

- **scikit-learn**：经典 ML 的瑞士军刀
- **Kaggle**：参加入门竞赛（Titanic、House Prices）
- **Jupyter Notebook**：交互式实验环境

**里程碑：** 完成一个 Kaggle 竞赛，提交预测结果并进入前 50%。

---

## 第三阶段：深度学习

> ⏱ 建议时长：10-14 周

### 3.1 神经网络基础

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| 感知机与多层网络 | 激活函数、前向传播、反向传播 | Andrej Karpathy《Neural Networks: Zero to Hero》(YouTube) |
| 训练技巧 | 学习率调度、Batch Norm、Dropout、权重初始化 | 李沐《动手学深度学习》(d2l.ai) |
| 框架入门 | PyTorch 张量操作、autograd、nn.Module | PyTorch 官方教程 (60-min Blitz) |

### 3.2 核心架构

| 架构 | 应用场景 | 推荐资源 |
|------|----------|----------|
| CNN（卷积神经网络） | 图像分类、目标检测 | Stanford CS231n (YouTube) |
| RNN / LSTM / GRU | 序列建模（了解即可） | 李沐 d2l.ai 循环神经网络章节 |
| Transformer | 几乎所有现代 AI 的基石 | 3Blue1Brown《But what is a GPT?》+ 论文精读 |
| GAN / Diffusion | 图像生成 | Stanford CS236 / Lilian Weng 博客 |

### 3.3 关键论文（必读）

1. **Attention Is All You Need** (2017) — Transformer 架构
2. **ImageNet Classification with Deep CNNs (AlexNet)** (2012) — 深度学习爆发
3. **Deep Residual Learning (ResNet)** (2015) — 残差连接
4. **Batch Normalization** (2015) — 训练稳定性

**里程碑：** 用 PyTorch 从零实现一个 Transformer，在小型数据集上完成训练。

---

## 第四阶段：自然语言处理与计算机视觉

> ⏱ 建议时长：8-12 周

### 4.1 自然语言处理（NLP）

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| 文本表示 | Word2Vec、GloVe、TF-IDF | Stanford CS224n 前几讲 |
| 预训练模型 | BERT、GPT 系列、T5 | Hugging Face NLP Course (免费) |
| 文本分类/NER | 微调预训练模型做下游任务 | Hugging Face 实战教程 |
| 序列到序列 | 机器翻译、摘要生成 | CS224n + 论文精读 |

### 4.2 计算机视觉（CV）

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| 图像分类 | ResNet、EfficientNet、ViT | CS231n + timm 库 |
| 目标检测 | YOLO 系列、DETR | Ultralytics YOLO 文档 |
| 图像分割 | U-Net、SAM (Segment Anything) | Meta SAM 官方仓库 |
| 多模态 | CLIP、DALL·E、Stable Diffusion | Hugging Face Diffusers 库 |

**里程碑：** 用 Hugging Face 微调一个 BERT 模型完成情感分类任务，准确率达到 90%+。

---

## 第五阶段：大语言模型（LLM）

> ⏱ 建议时长：8-12 周

### 5.1 LLM 原理

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| 预训练 | 自回归语言建模、Tokenizer (BPE)、Scaling Laws | Karpathy《Let's build GPT from scratch》 |
| 对齐技术 | SFT、RLHF、DPO、Constitutional AI | Anthropic/OpenAI 技术报告 |
| 推理优化 | KV Cache、量化 (GPTQ/AWQ)、投机解码 | Hugging Face 优化指南 |
| 上下文窗口 | 长文本处理、RoPE、滑动窗口注意力 | 相关论文 |

### 5.2 LLM 实践

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| Prompt Engineering | 系统提示、Few-shot、CoT、ReAct | OpenAI Prompt Engineering Guide |
| 微调 | LoRA、QLoRA、全量微调 | Hugging Face PEFT 库 + Unsloth |
| 开源模型 | LLaMA、Qwen、Mistral、DeepSeek | Hugging Face Model Hub |
| 评估 | 困惑度、人工评估、LLM-as-Judge | lm-evaluation-harness |

### 5.3 关键论文

1. **Language Models are Few-Shot Learners (GPT-3)** (2020)
2. **Training language models to follow instructions (InstructGPT)** (2022)
3. **LLaMA: Open and Efficient Foundation Language Models** (2023)
4. **Constitutional AI** (Anthropic, 2022)

**里程碑：** 用 LoRA 微调一个 7B 开源模型，使其在特定领域任务上超越基线。

---

## 第六阶段：AI 应用开发

> ⏱ 建议时长：8-10 周

### 6.1 RAG（检索增强生成）

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| 向量数据库 | Embedding、相似度搜索、FAISS/Milvus/Pinecone | 各数据库官方文档 |
| 文档处理 | PDF解析、分块策略、Chunk优化 | LangChain/LlamaIndex 文档 |
| 检索策略 | 混合检索、重排序、Query改写 | LlamaIndex 高级教程 |
| 评估 | 忠实度、相关性、RAGAS框架 | RAGAS 官方文档 |

### 6.2 AI Agent

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| Agent 架构 | ReAct、Plan-and-Execute、Multi-Agent | LangGraph / CrewAI 文档 |
| 工具调用 | Function Calling、MCP协议 | OpenAI Function Calling 指南 |
| 记忆系统 | 短期/长期记忆、向量存储 | MemGPT / Letta |
| 工作流编排 | DAG、状态机、人机协同 | LangGraph / Dify |

### 6.3 全栈开发

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| 后端 API | FastAPI、流式响应、WebSocket | FastAPI 官方教程 |
| 前端交互 | React/Next.js + Vercel AI SDK | Vercel AI SDK 文档 |
| 模型服务 | vLLM、TGI、Ollama | 各框架官方文档 |
| 可观测性 | LangSmith、日志追踪、成本监控 | LangSmith 文档 |

**里程碑：** 开发一个完整的 RAG + Agent 应用（如：个人知识库问答助手），部署上线。

---

## 第七阶段：MLOps 与工程化部署

> ⏱ 建议时长：6-8 周

### 7.1 模型部署

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| 容器化 | Docker、Docker Compose | Docker 官方 Get Started |
| 模型服务 | TorchServe、Triton、vLLM | 各框架文档 |
| 云部署 | AWS SageMaker / GCP Vertex AI / 阿里云 PAI | 云平台官方教程 |
| Serverless | Modal、Replicate、Together AI | 各平台文档 |

### 7.2 MLOps 流程

| 主题 | 核心内容 | 推荐资源 |
|------|----------|----------|
| 实验管理 | MLflow、Weights & Biases | W&B 官方教程 |
| 数据管理 | 数据版本控制 (DVC)、数据质量 | DVC 文档 |
| CI/CD | 模型测试、A/B测试、金丝雀发布 | GitHub Actions + 自定义Pipeline |
| 监控 | 数据漂移、模型性能监控、告警 | Evidently AI / Grafana |

### 7.3 性能优化

| 主题 | 核心内容 |
|------|----------|
| 模型压缩 | 量化、剪枝、知识蒸馏 |
| 推理加速 | TensorRT、ONNX Runtime、FlashAttention |
| 分布式训练 | 数据并行、模型并行、DeepSpeed、FSDP |

**里程碑：** 将一个模型通过 Docker + FastAPI 部署到云端，配置完整的监控和自动扩缩容。

---

## 第八阶段：AI 安全与伦理

> ⏱ 建议时长：4-6 周（持续学习）

### 8.1 核心议题

| 主题 | 内容 | 资源 |
|------|------|------|
| 对齐与安全 | RLHF、Red Teaming、Jailbreak防御 | Anthropic Research Blog |
| 偏见与公平 | 数据偏见、模型公平性指标 | Google ML Fairness 教程 |
| 隐私保护 | 差分隐私、联邦学习 | Apple/Google 隐私ML文档 |
| 可解释性 | SHAP、LIME、注意力可视化 | Christoph Molnar《Interpretable ML》 |
| 治理与法规 | EU AI Act、中国AI管理办法 | 官方文件 |

### 8.2 推荐资源

- **Anthropic Research**：对齐研究前沿
- **AI Safety Fundamentals** (Berkeley)：免费课程
- **《The Alignment Problem》** (Brian Christian)：科普书籍

**里程碑：** 为自己的 AI 应用撰写一份安全评估报告（含偏见测试、对抗攻击测试）。

---

## 持续学习：论文、社区与前沿追踪

### 论文阅读

| 平台 | 说明 |
|------|------|
| [arXiv](https://arxiv.org) | 最新预印本，关注 cs.LG / cs.CL / cs.CV |
| [Papers With Code](https://paperswithcode.com) | 论文+代码+排行榜 |
| [Semantic Scholar](https://semanticscholar.org) | AI驱动的论文搜索 |
| [Connected Papers](https://connectedpapers.com) | 可视化论文引用关系 |
| 李沐《论文精读》(B站) | 中文论文解读 |

### 社区与信息源

| 来源 | 说明 |
|------|------|
| Hugging Face 社区 | 模型、数据集、讨论 |
| Reddit r/MachineLearning | 英文社区讨论 |
| Twitter/X AI圈 | 关注 Karpathy, Jim Fan, Yann LeCun 等 |
| 机器之心 / 量子位 | 中文AI资讯 |
| GitHub Trending | 追踪热门开源项目 |

### 推荐关注的研究者/创作者

- **Andrej Karpathy** — 深度学习教学、LLM实践
- **李沐** — 动手学深度学习、论文精读
- **Yannic Kilcher** — 论文解读 (YouTube)
- **Lilian Weng** — 高质量技术博客 (lilianweng.github.io)
- **Jay Alammar** — Transformer可视化 (jalammar.github.io)

---

## 推荐项目实战清单

按难度递进排列：

| # | 项目 | 涉及技能 | 难度 |
|---|------|----------|------|
| 1 | 手写数字识别 (MNIST) | PyTorch、CNN | ⭐ |
| 2 | 电影评论情感分析 | NLP、BERT微调 | ⭐⭐ |
| 3 | 图像风格迁移 | CNN、Neural Style Transfer | ⭐⭐ |
| 4 | 个人知识库问答 (RAG) | Embedding、向量DB、LLM | ⭐⭐⭐ |
| 5 | AI 写作助手 | Prompt Engineering、流式API | ⭐⭐⭐ |
| 6 | 多模态图文理解 | CLIP、多模态模型 | ⭐⭐⭐ |
| 7 | AI Agent 工作流 | LangGraph、工具调用、记忆 | ⭐⭐⭐⭐ |
| 8 | 开源模型微调+部署 | LoRA、vLLM、Docker | ⭐⭐⭐⭐ |
| 9 | 端到端 AI 产品 | 全栈、MLOps、监控 | ⭐⭐⭐⭐⭐ |

---

## 学习时间规划建议

### 全职学习（每天 6-8 小时）

| 阶段 | 时长 | 累计 |
|------|------|------|
| 数学+编程基础 | 2个月 | 2个月 |
| 机器学习 | 2个月 | 4个月 |
| 深度学习 | 3个月 | 7个月 |
| NLP + CV | 2个月 | 9个月 |
| LLM | 2个月 | 11个月 |
| AI应用开发 | 2个月 | 13个月 |
| MLOps | 1个月 | 14个月 |

### 业余学习（每天 2-3 小时）

总时长约 **18-24 个月**，建议：
- 工作日：理论学习 + 看视频（1-2小时）
- 周末：动手实践 + 项目（4-6小时）
- 利用碎片时间：播客、论文速读、社区浏览

### 学习原则

1. **70/30 法则**：70% 时间动手写代码，30% 时间看理论
2. **费曼学习法**：每学完一个主题，尝试用自己的话写博客或讲给别人听
3. **项目驱动**：每个阶段结束时完成一个可展示的项目
4. **不追求完美**：先跑通再优化，先理解大意再深入细节
5. **定期回顾**：每周花 1 小时回顾本周所学，整理笔记

---

## 核心资源汇总表

| 类别 | 资源 | 链接/说明 |
|------|------|-----------|
| 入门视频 | 3Blue1Brown 数学系列 | YouTube / B站 |
| 入门视频 | Andrej Karpathy Zero to Hero | YouTube |
| 系统课程 | Andrew Ng ML Specialization | Coursera |
| 系统课程 | 李沐《动手学深度学习》 | d2l.ai (免费) |
| 系统课程 | Stanford CS231n / CS224n | YouTube (免费) |
| 实践平台 | Hugging Face Courses | huggingface.co/learn |
| 实践平台 | fast.ai | course.fast.ai (免费) |
| 竞赛 | Kaggle | kaggle.com |
| 书籍 | 《Hands-On ML》(Géron) | 机器学习+深度学习实践 |
| 书籍 | 《Deep Learning》(Goodfellow) | 理论参考（花书） |
| 工具 | PyTorch | pytorch.org |
| 工具 | Hugging Face Transformers | huggingface.co |
| 工具 | LangChain / LlamaIndex | AI应用开发框架 |

---

> 💡 **最后一句话：** AI 领域变化极快，这份路线图是骨架而非圣经。保持好奇心，持续学习，动手实践——这比任何课程都重要。
