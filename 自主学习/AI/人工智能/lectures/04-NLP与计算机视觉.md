# 第四讲：自然语言处理与计算机视觉

> 本讲目标：掌握预训练模型时代的核心技术——从 Word2Vec 到 BERT/GPT，从 CNN 到 ViT，理解多模态 AI 的基本原理。

---

## 一、NLP 基础：从文字到数字

### 1.1 文本表示的演进

计算机不能直接处理文字，需要把文本变成数字向量：

```
"我喜欢学习AI" → ???（数字）
```

| 方法 | 表示 | 维度 | 缺点 |
|------|------|------|------|
| One-Hot | [0,0,1,0,...,0] | 词表大小(5万+) | 稀疏、无意义关系 |
| TF-IDF | 加权词频 | 词表大小 | 忽略语序 |
| Word2Vec | 密集向量 | 300 | 一词一向量，无法处理多义词 |
| **上下文表示 (BERT/GPT)** | 动态向量 | 768+ | 当前主流 |

### 1.2 Word2Vec：词嵌入的开端

**核心思想：** 一个词的含义由它的上下文决定（分布假说）。

两种训练方式：
- **CBOW**：用上下文预测中心词（"我 _ 学习 AI" → "喜欢"）
- **Skip-gram**：用中心词预测上下文（"喜欢" → "我"、"学习"、"AI"）

```python
# Word2Vec 的魔力：向量算术
king - man + woman ≈ queen
北京 - 中国 + 法国 ≈ 巴黎
```

```python
from gensim.models import Word2Vec

# 训练
sentences = [['我', '喜欢', '学习'], ['AI', '很', '有趣'], ...]
model = Word2Vec(sentences, vector_size=300, window=5, min_count=1)

# 使用
vec = model.wv['学习']           # 获取词向量
similar = model.wv.most_similar('学习', topn=5)  # 最相似的词
```

**局限：** 每个词只有一个固定向量。"苹果很好吃"和"苹果手机"中的"苹果"应该有不同含义。

### 1.3 分词 (Tokenization)

中文和英文的分词方式不同：

```python
# 英文：按空格 + 子词
"unhappiness" → ["un", "happiness"]  (BPE)

# 中文：按字或子词
"我喜欢学习" → ["我", "喜欢", "学习"]  (jieba)
             → ["我", "喜", "欢", "学", "习"]  (按字)
```

**现代 LLM 使用 BPE (Byte Pair Encoding)：**
- 从字符开始，反复合并最频繁的相邻对
- 词表大小通常 32K-128K
- 能处理任何语言、任何拼写

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("bert-base-chinese")
tokens = tokenizer.tokenize("我喜欢学习人工智能")
print(tokens)  # ['我', '喜', '欢', '学', '习', '人', '工', '智', '能']

# 编码为 ID
ids = tokenizer.encode("我喜欢学习人工智能")
print(ids)  # [101, 2769, 1599, 3614, 2110, 739, 782, 2336, 5632, 102]
```

---

## 二、预训练语言模型

### 2.1 预训练 + 微调范式

```
阶段1：预训练（海量无标注文本）
  "今天天气真[MASK]" → 预测 "好"
  学到：语法、语义、世界知识

阶段2：微调（少量标注数据）
  在预训练模型基础上，用特定任务数据继续训练
  学到：任务特定能力
```

**为什么有效？** 预训练让模型"读了整个互联网"，已经理解了语言。微调只需要教它"怎么回答特定问题"。

### 2.2 BERT：双向理解

**BERT (2018, Google)**：Encoder-only Transformer

**预训练任务：**
1. **MLM (Masked Language Model)**：随机遮住 15% 的词，让模型预测
   - "今天天气真[MASK]" → "好"
2. **NSP (Next Sentence Prediction)**：判断两句话是否相邻

```python
from transformers import BertTokenizer, BertForMaskedLM
import torch

tokenizer = BertTokenizer.from_pretrained('bert-base-chinese')
model = BertForMaskedLM.from_pretrained('bert-base-chinese')

# 填空
text = "今天天气真[MASK]，适合出去散步。"
inputs = tokenizer(text, return_tensors='pt')
with torch.no_grad():
    outputs = model(**inputs)

# 找到 [MASK] 位置的预测
mask_idx = (inputs['input_ids'] == tokenizer.mask_token_id).nonzero()[0, 1]
logits = outputs.logits[0, mask_idx]
top5 = torch.topk(logits, 5)
for idx in top5.indices:
    print(f"  {tokenizer.decode(idx)}: {torch.softmax(logits, 0)[idx]:.4f}")
# 好: 0.82, 不错: 0.05, 棒: 0.03, ...
```

**BERT 的特点：**
- 双向注意力：每个词能同时看到左边和右边
- 适合**理解任务**：分类、NER、问答
- 不适合生成（因为训练时是填空，不是续写）

### 2.3 GPT：自回归生成

**GPT (2018-2020, OpenAI)**：Decoder-only Transformer

**预训练任务：** 预测下一个词（自回归）
- "今天天气" → 预测 "真"
- "今天天气真" → 预测 "好"

```python
from transformers import GPT2LMHeadModel, GPT2Tokenizer

tokenizer = GPT2Tokenizer.from_pretrained('gpt2')
model = GPT2LMHeadModel.from_pretrained('gpt2')

prompt = "The future of AI is"
inputs = tokenizer.encode(prompt, return_tensors='pt')
outputs = model.generate(inputs, max_new_tokens=50, temperature=0.7, do_sample=True)
print(tokenizer.decode(outputs[0]))
```

**GPT vs BERT：**

| | BERT | GPT |
|---|---|---|
| 架构 | Encoder (双向) | Decoder (单向/因果) |
| 预训练 | 填空 (MLM) | 续写 (Next Token) |
| 擅长 | 理解（分类、NER） | 生成（写作、对话） |
| 注意力 | 看到所有位置 | 只看到左边 |

### 2.4 使用 Hugging Face 做文本分类

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from transformers import TrainingArguments, Trainer
from datasets import load_dataset

# 1. 加载数据
dataset = load_dataset("imdb")  # 电影评论情感分类

# 2. 加载预训练模型
model_name = "bert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)

# 3. 分词
def tokenize(examples):
    return tokenizer(examples['text'], truncation=True, padding=True, max_length=256)
dataset = dataset.map(tokenize, batched=True)

# 4. 训练配置
training_args = TrainingArguments(
    output_dir='./results',
    num_train_epochs=3,
    per_device_train_batch_size=16,
    learning_rate=2e-5,
    weight_decay=0.01,
    evaluation_strategy="epoch",
)

# 5. 训练
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset['train'].shuffle(seed=42).select(range(2000)),  # 用子集演示
    eval_dataset=dataset['test'].shuffle(seed=42).select(range(500)),
)
trainer.train()

# 6. 评估
results = trainer.evaluate()
print(f"准确率: {results['eval_accuracy']:.2%}")
```

### 2.5 命名实体识别 (NER)

```python
from transformers import pipeline

ner = pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple")
result = ner("Barack Obama was born in Hawaii and studied at Harvard.")
for entity in result:
    print(f"{entity['word']}: {entity['entity_group']} ({entity['score']:.2f})")
# Barack Obama: PER (0.99)
# Hawaii: LOC (0.99)
# Harvard: ORG (0.98)
```

---

## 三、计算机视觉

### 3.1 图像分类：从 CNN 到 ViT

**经典 CNN 路线：**
```
图片 → [Conv+BN+ReLU+Pool] × N → [GlobalAvgPool] → [FC] → 类别
```

**Vision Transformer (ViT, 2020)：**
```
图片 → 切成 16×16 的 patch → 线性映射 → [Transformer Encoder] × N → [CLS] → 类别
```

```python
# 用预训练的 ViT 做图像分类
from transformers import ViTForImageClassification, ViTFeatureExtractor
from PIL import Image
import requests

url = "http://images.cocodataset.org/val2017/000000039769.jpg"
image = Image.open(requests.get(url, stream=True).raw)

feature_extractor = ViTFeatureExtractor.from_pretrained('google/vit-base-patch16-224')
model = ViTForImageClassification.from_pretrained('google/vit-base-patch16-224')

inputs = feature_extractor(images=image, return_tensors="pt")
outputs = model(**inputs)
predicted_class = outputs.logits.argmax(-1).item()
print(model.config.id2label[predicted_class])  # "Egyptian cat"
```

### 3.2 目标检测：YOLO

**目标检测 = 分类 + 定位**（找出图中所有物体，画出框并标注类别）

```python
from ultralytics import YOLO

# 加载预训练模型
model = YOLO('yolov8n.pt')  # nano 版本，速度快

# 推理
results = model('image.jpg')

# 查看结果
for box in results[0].boxes:
    x1, y1, x2, y2 = box.xyxy[0].tolist()
    conf = box.conf[0].item()
    cls = model.names[int(box.cls[0])]
    print(f"{cls}: {conf:.2f} at ({x1:.0f},{y1:.0f},{x2:.0f},{y2:.0f})")

# 保存可视化结果
results[0].save('detected.jpg')
```

**YOLO 的核心思想：**
- 把图片分成 S×S 的网格
- 每个网格预测：是否有物体 + 边界框 + 类别
- 一次前向传播完成所有检测（快！）

### 3.3 图像分割

| 类型 | 输出 | 应用 |
|------|------|------|
| 语义分割 | 每个像素的类别 | 自动驾驶（道路/行人） |
| 实例分割 | 每个物体的精确轮廓 | 医学影像 |
| 全景分割 | 语义 + 实例 | 场景理解 |

**SAM (Segment Anything Model, Meta 2023)：**

```python
from segment_anything import sam_model_registry, SamPredictor
import cv2
import numpy as np

sam = sam_model_registry["vit_h"](checkpoint="sam_vit_h.pth")
predictor = SamPredictor(sam)

image = cv2.imread("image.jpg")
image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
predictor.set_image(image_rgb)

# 点击一个点，自动分割
input_point = np.array([[500, 375]])
input_label = np.array([1])  # 1=前景
masks, scores, _ = predictor.predict(point_coords=input_point, point_labels=input_label)
```

### 3.4 图像生成：Stable Diffusion

```python
from diffusers import StableDiffusionPipeline
import torch

pipe = StableDiffusionPipeline.from_pretrained(
    "stabilityai/stable-diffusion-2-1",
    torch_dtype=torch.float16
).to("cuda")

prompt = "A beautiful sunset over mountains, oil painting style"
image = pipe(prompt, num_inference_steps=30, guidance_scale=7.5).images[0]
image.save("sunset.png")
```

**扩散模型原理回顾：**
1. 前向：图片 → 逐步加高斯噪声 → 纯噪声
2. 反向：训练 U-Net 预测每一步的噪声
3. 生成：从纯噪声开始，用 U-Net 逐步去噪 → 图片
4. 文本条件：用 CLIP 文本编码器把 prompt 变成向量，注入 U-Net

---

## 四、多模态 AI

### 4.1 CLIP：连接图像与文本

**CLIP (OpenAI, 2021)**：同时训练图像编码器和文本编码器，让匹配的图文对向量接近。

```python
from transformers import CLIPProcessor, CLIPModel
from PIL import Image

model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

image = Image.open("cat.jpg")
texts = ["a photo of a cat", "a photo of a dog", "a painting"]

inputs = processor(text=texts, images=image, return_tensors="pt", padding=True)
outputs = model(**inputs)

# 计算图文相似度
similarity = outputs.logits_per_image.softmax(dim=-1)
for text, score in zip(texts, similarity[0]):
    print(f"{text}: {score:.3f}")
# a photo of a cat: 0.92
# a photo of a dog: 0.06
# a painting: 0.02
```

**CLIP 的应用：**
- 零样本图像分类（不需要训练！）
- 图文检索
- 作为其他模型的图像/文本编码器

### 4.2 多模态大模型

现代多模态模型（GPT-4V、Qwen-VL、LLaVA）的架构：

```
图片 → [视觉编码器 (ViT)] → 视觉 token
                                    ↓
文本 → [Tokenizer] → 文本 token → [LLM (Decoder)] → 回答
```

```python
from transformers import AutoProcessor, LlavaForConditionalGeneration
from PIL import Image

model = LlavaForConditionalGeneration.from_pretrained("llava-hf/llava-1.5-7b-hf")
processor = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf")

image = Image.open("chart.png")
prompt = "USER: <image>\nDescribe this chart in detail.\nASSISTANT:"

inputs = processor(text=prompt, images=image, return_tensors="pt")
output = model.generate(**inputs, max_new_tokens=200)
print(processor.decode(output[0], skip_special_tokens=True))
```

---

## 五、迁移学习与预训练模型使用

### 5.1 为什么迁移学习有效？

```
ImageNet 预训练的 CNN 各层学到的特征：
第1层：边缘、颜色块
第2层：纹理、简单图案
第3层：物体部件（眼睛、轮子）
第4层：完整物体
第5层：场景语义
```

底层特征是通用的（边缘在哪都是边缘），顶层是任务特定的。所以：
- **冻结底层，只训练顶层** → 少量数据就够
- **全部微调** → 数据充足时效果更好

### 5.2 图像分类迁移学习

```python
import torch
import torchvision.models as models
import torchvision.transforms as transforms

# 加载预训练 ResNet
model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)

# 冻结所有层
for param in model.parameters():
    param.requires_grad = False

# 替换最后的分类头（1000类 → 你的类别数）
model.fc = torch.nn.Linear(2048, 10)  # 10个新类别

# 只训练新的分类头
optimizer = torch.optim.Adam(model.fc.parameters(), lr=1e-3)

# 数据增强
transform_train = transforms.Compose([
    transforms.RandomResizedCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
```

### 5.3 文本分类迁移学习（完整示例）

```python
from transformers import pipeline

# 零样本分类（不需要任何训练数据！）
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

text = "这家餐厅的菜品非常精致，服务态度也很好，但价格偏贵。"
labels = ["正面评价", "负面评价", "中性评价"]

result = classifier(text, labels)
for label, score in zip(result['labels'], result['scores']):
    print(f"{label}: {score:.3f}")
# 正面评价: 0.72
# 中性评价: 0.20
# 负面评价: 0.08
```

---

## 六、实践：构建一个图像搜索系统

```python
"""用 CLIP 构建以文搜图系统"""
import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import os

class ImageSearchEngine:
    def __init__(self, image_dir):
        self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        self.image_paths = []
        self.image_embeddings = []
        self._index_images(image_dir)
    
    def _index_images(self, image_dir):
        """预计算所有图片的向量"""
        for fname in os.listdir(image_dir):
            if fname.endswith(('.jpg', '.png')):
                path = os.path.join(image_dir, fname)
                image = Image.open(path)
                inputs = self.processor(images=image, return_tensors="pt")
                with torch.no_grad():
                    emb = self.model.get_image_features(**inputs)
                    emb = emb / emb.norm(dim=-1, keepdim=True)  # 归一化
                self.image_paths.append(path)
                self.image_embeddings.append(emb)
        self.image_embeddings = torch.cat(self.image_embeddings)
    
    def search(self, query, top_k=5):
        """用文字搜索图片"""
        inputs = self.processor(text=[query], return_tensors="pt", padding=True)
        with torch.no_grad():
            text_emb = self.model.get_text_features(**inputs)
            text_emb = text_emb / text_emb.norm(dim=-1, keepdim=True)
        
        # 余弦相似度
        similarity = (text_emb @ self.image_embeddings.T).squeeze()
        top_indices = similarity.argsort(descending=True)[:top_k]
        
        results = [(self.image_paths[i], similarity[i].item()) for i in top_indices]
        return results

# 使用
engine = ImageSearchEngine("./my_photos")
results = engine.search("a sunset at the beach")
for path, score in results:
    print(f"{score:.3f} - {path}")
```

---

## 七、本讲小结

| 技术 | 核心思想 | 代表模型 |
|------|----------|----------|
| Word2Vec | 词的含义由上下文决定 | Word2Vec, GloVe |
| BERT | 双向 Transformer + 填空预训练 | BERT, RoBERTa |
| GPT | 单向 Transformer + 续写预训练 | GPT-2/3/4 |
| ViT | 图片切 patch → Transformer | ViT, DeiT |
| YOLO | 单阶段实时检测 | YOLOv8 |
| SAM | 通用图像分割 | Segment Anything |
| CLIP | 图文对比学习 | CLIP, SigLIP |
| 扩散模型 | 逐步去噪生成 | Stable Diffusion |

**关键认知转变：**
- 旧范式：每个任务训练一个模型
- 新范式：一个预训练大模型 + 微调/提示 → 解决所有任务

---

## 八、练习题

### 基础题
1. 用 Hugging Face pipeline 完成：情感分析、NER、文本摘要各一个例子
2. 用预训练 ResNet 对自己的 10 张照片做分类（迁移学习）
3. 用 YOLOv8 检测一张街景图片中的所有物体，可视化结果

### 进阶题
4. 微调 BERT 做中文情感分类（用 ChnSentiCorp 数据集），对比冻结/不冻结底层的效果
5. 用 CLIP 实现一个"以图搜图"系统
6. 用 Stable Diffusion 生成 5 张不同风格的图片，分析 prompt 对结果的影响

### 挑战题
7. 实现一个简化版 ViT：把图片切成 patch，过 Transformer，做分类
8. 用 LoRA 微调一个多模态模型（如 LLaVA），让它学会描述特定领域的图片
9. 构建一个完整的图文问答系统：上传图片 → 用自然语言提问 → 得到回答

---

## 九、推荐资源

| 资源 | 说明 |
|------|------|
| Stanford CS224n (NLP) | NLP 经典课程，YouTube 免费 |
| Hugging Face NLP Course | 免费，实操为主 |
| Hugging Face CV Course | 计算机视觉实操 |
| Ultralytics YOLO 文档 | 目标检测最易上手的框架 |
| CLIP 论文 (Learning Transferable Visual Models) | 多模态奠基之作 |
| Jay Alammar 博客 | BERT/GPT 可视化讲解 |

---

> **下一讲预告：** 第五讲深入大语言模型——从 GPT 的训练原理到 Prompt Engineering、微调、对齐技术。
