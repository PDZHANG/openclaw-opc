
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import type { TaskFile, TaskDeliverable, CollaborationTask } from '../../types';

export class DeliverableService {
  private static readonly EXCLUDE_DIRS = ['node_modules', '.git', '__pycache__'];
  private static readonly EXCLUDE_FILES = ['.DS_Store', 'Thumbs.db'];

  static scanWorkspace(workspacePath: string): TaskFile[] {
    console.log('=== DeliverableService.scanWorkspace ===');
    console.log('Workspace path:', workspacePath);

    if (!fs.existsSync(workspacePath)) {
      console.log('Workspace does not exist');
      return [];
    }

    const files: TaskFile[] = [];
    this.scanDirectory(workspacePath, workspacePath, files);

    console.log('Scanned files:', files.length);
    return files;
  }

  private static scanDirectory(
    rootPath: string,
    currentPath: string,
    files: TaskFile[]
  ): void {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const relativePath = path.relative(rootPath, fullPath);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (this.EXCLUDE_DIRS.includes(item)) {
          continue;
        }
        files.push({
          path: relativePath,
          name: item,
          size: 0,
          type: 'directory',
          modifiedAt: new Date(stat.mtime)
        });
        this.scanDirectory(rootPath, fullPath, files);
      } else {
        if (this.EXCLUDE_FILES.includes(item)) {
          continue;
        }
        files.push({
          path: relativePath,
          name: item,
          size: stat.size,
          type: 'file',
          modifiedAt: new Date(stat.mtime)
        });
      }
    }
  }

  static async createZip(
    workspacePath: string,
    taskId: string,
    outputDir: string
  ): Promise<string> {
    console.log('=== DeliverableService.createZip ===');
    console.log('Workspace path:', workspacePath);
    console.log('Task ID:', taskId);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const zipPath = path.join(outputDir, `task-${taskId}-deliverable.zip`);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log('Zip created:', zipPath);
        console.log('Total bytes:', archive.pointer());
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        console.error('Zip creation error:', err);
        reject(err);
      });

      archive.pipe(output);
      archive.directory(workspacePath, false);
      archive.finalize();
    });
  }

  static generateSummary(
    task: CollaborationTask,
    files: TaskFile[]
  ): string {
    console.log('=== DeliverableService.generateSummary ===');
    console.log('Task:', task.title);
    console.log('Files count:', files.length);

    const fileCount = files.filter(f => f.type === 'file').length;
    const dirCount = files.filter(f => f.type === 'directory').length;
    const totalSize = files
      .filter(f => f.type === 'file')
      .reduce((sum, f) => sum + f.size, 0);

    const summary = [
      '# 任务交付',
      '',
      '## 任务信息',
      `- **任务名称**: ${task.title}`,
      `- **描述**: ${task.description || '无'}`,
      `- **创建时间**: ${task.createdAt.toLocaleString()}`,
      `- **完成时间**: ${new Date().toLocaleString()}`,
      '',
      '## 交付内容',
      `本次交付包含 **${fileCount}** 个文件和 **${dirCount}** 个目录，总大小约为 **${this.formatSize(totalSize)}**。`,
      '',
      '### 主要文件类型',
      this.analyzeFileTypes(files),
      '',
      '### 文件列表',
      this.listImportantFiles(files),
      '',
      '---',
      '*交付已生成。您可以下载 Zip 压缩包获取所有文件。*'
    ].join('\n');

    console.log('Generated summary length:', summary.length);
    return summary;
  }

  private static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private static analyzeFileTypes(files: TaskFile[]): string {
    const extCounts: Record<string, number> = {};
    const fileFiles = files.filter(f => f.type === 'file');

    for (const file of fileFiles) {
      const ext = path.extname(file.name).toLowerCase() || 'no extension';
      extCounts[ext] = (extCounts[ext] || 0) + 1;
    }

    const sorted = Object.entries(extCounts).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 5).map(([ext, count]) => `- ${ext}: ${count}`).join('\n');
  }

  private static listImportantFiles(files: TaskFile[]): string {
    const importantExts = ['.md', '.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.html', '.css'];
    const importantFiles = files
      .filter(f => f.type === 'file')
      .filter(f => importantExts.some(ext => f.name.toLowerCase().endsWith(ext)) || f.name === 'README.md')
      .slice(0, 20);

    if (importantFiles.length === 0) {
      return '- 无重要文件';
    }

    return importantFiles.map(f => `- ${f.path} (${this.formatSize(f.size)})`).join('\n');
  }

  static async generateDeliverable(
    task: CollaborationTask
  ): Promise<TaskDeliverable> {
    console.log('=== DeliverableService.generateDeliverable ===');
    console.log('Task ID:', task.id);

    let files: TaskFile[] = [];
    let summary: string = '';
    let zipPath: string = '';

    if (task.workspacePath) {
      files = this.scanWorkspace(task.workspacePath);
      summary = this.generateSummary(task, files);
      const zipOutputDir = path.join(task.workspacePath, '..');
      zipPath = await this.createZip(task.workspacePath, task.id, zipOutputDir);
    } else {
      console.warn('Task has no workspace path, generating minimal deliverable');
      summary = [
        '# 任务交付',
        '',
        '## 任务信息',
        `- **任务名称**: ${task.title}`,
        `- **描述**: ${task.description || '无'}`,
        `- **创建时间**: ${task.createdAt.toLocaleString()}`,
        `- **完成时间**: ${new Date().toLocaleString()}`,
        '',
        '---',
        '*此任务没有可用的工作空间路径。*'
      ].join('\n');
    }

    const deliverable: TaskDeliverable = {
      taskId: task.id,
      files,
      summary,
      zipPath,
      generatedAt: new Date()
    };

    console.log('Deliverable generated successfully');
    return deliverable;
  }
}

