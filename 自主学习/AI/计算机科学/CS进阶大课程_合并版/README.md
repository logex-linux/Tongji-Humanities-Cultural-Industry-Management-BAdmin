# CS 进阶大课程 · 合并版

直接打开 **index.html**。这是一个自带课程内容、公式字体和示意图引擎的离线文件；可以单独复制，无需服务器或 API。

面向已做过 Python、API、部署或自动化项目的跨专业学习者。保留原来的29门课、14必修/15选修；以修订版269个单元作主线，接入旧版372篇讲义的主题节选。237个主线单元带深入阅读；综合实践等单元以项目任务、固定练习与正式考核为中心，不强行加入无关材料。

## 使用

1. 从首页进入 CS102 入课诊断，或从全部课程选取已有等价基础的课程。
2. 阅读一个主线单元，需要时展开对应的定义、推导和机制深读。
3. 切换到“独立练习”，先保存自己的过程，再看“答案与评分”。
4. 用笔记记录条件、错误与反例；读完只标“已读”，不会自动变成“掌握”。
5. 加入复习后，在“我的学习记录”中查看到期单元；7–14天再用新题进行独立复测。

支持全文检索、课程收藏、笔记、作答草稿、参考阅读记录、复习队列、深色阅读、当前讲义打印、JSON备份和Markdown笔记导出。备份导入会保留现有内容，冲突笔记并排保存；答案保护属于教学约定，不是文件加密。

浏览器记录保存在当前文件对应的 localStorage。更换浏览器、文件位置或清理浏览数据前，先导出学习备份。浏览器不允许本地存储时仍可阅读和导出；本次实际浏览器验收使用 Microsoft Edge。没有把原库 learner 记录复制为网页成绩，两版原记录均保持原样。

## 本次诊断修订

合并版修订 `2026-10-30-r1` 使用 `content/overrides.json` 登记22份覆盖稿，正文在 `content/overrides/`。构建先核对源稿哈希，再应用覆盖；两版原稿不变。旧题面的作答继续保存，修订题需要重新作答，不能用旧提交自动解锁新版答案。

备份合并保留不同尝试及独立性声明；同一尝试有独立/辅助冲突时保守展示为辅助。完成回忆后保存动作历史，安排7天后的D1独立复测。完成按钮不等于评分通过，历史记录随备份导出；旧备份不会重新加入已完成的同一任务。

当前修复与检查见 `reports/2026-10-30-repair/修复与验收.md`，原诊断仍保留。

## 合并取舍

- 修订版负责教学顺序、先修语义、主线讲义、固定练习、分离答案与正式考核。
- 旧版负责更完整的定义、推导和常见误区。旧题库、旧评分、独立计时演示不进入统一验收。
- 逐课新增导读，说明核心问题、学习目的、保留深度与最终产物。
- CS102首课深读后移；CS301保留先测试后重构；CS202补写对数界证明并用真实操作计数替换错误演示。
- 保留已修订的搜索＋ML双产物与S/M双门槛、本地语言模型实验、实机硬件、完整NP归约及固定消融条件。

逐单元对应关系见 `reports/逐单元合并映射.md`。首次合并过程与当时的验收边界见 `reports/合并审计与验收.md`；本轮诊断修复和当前产物的检查结果见 `reports/2026-10-30-repair/修复与验收.md`。

## 文件

- `index.html`：完整离线交付。
- `src/`：页面源文件和有许可证的本地公式/图形依赖。
- `build/editorial.py`：人工编写的主题映射、29课导读和已知问题提示。
- `build/merge.py`：读取两版原稿，构建内容包与HTML；不改原库。
- `content/`：新增算法证明与可运行操作计数实验。
- `reports/`：源文件保护、逐单元映射、独立诊断及每轮验证证据。
- `output/playwright/`：桌面和手机截图，验收用备份样本。

## 重新构建

来源目录由 `build/sources.json` 显式配置，路径相对本合并版根目录。目前两版位于同级的 `../原始内容/` 下；移动来源后只改该配置，不重写 `reports/source-before.json` 基线哈希。Python需要 `markdown` 库；覆盖稿在 `content/overrides/` 修改，索引中的 `base_sha256` 只指向原稿；更新覆盖内容无需改这个原稿哈希。KaTeX与Mermaid已随 `src/vendor/` 保存，重建不需要下载。

```sh
PYTHONDONTWRITEBYTECODE=1 python3 build/merge.py
PYTHONDONTWRITEBYTECODE=1 python3 build/test_render.py
PYTHONDONTWRITEBYTECODE=1 python3 build/check_content.py
PYTHONDONTWRITEBYTECODE=1 python3 build/check_revision.py
PYTHONDONTWRITEBYTECODE=1 python3 build/audit_task_overlap.py
python3 content/complexity_counts.py
node build/verify.mjs
node build/verify_revision.mjs
node build/audit_diagrams.mjs
```

只修改页面样式或交互时，可运行 `python3 build/merge.py --assemble`。浏览器验收脚本使用本机已配置的 Playwright 与 Edge，路径见脚本；迁移开发环境时按实际安装路径调整。

本文件夹中的检查证明合并内容、入口、显示和已知任务约束得到了相应验证；它们不认证全库每条定理、每份答案或学习者已经掌握课程。外部资料继承原库核验状态，本次没有重新联网核验全部来源。
