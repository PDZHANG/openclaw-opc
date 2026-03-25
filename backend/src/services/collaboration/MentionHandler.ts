import { Agent } from '../../models/Agent';
import type { ParsedMessage } from './types';

export class MentionHandler {
  private static readonly TASK_KEYWORDS = [
    '需要', '请', '帮忙', '完成', '实现', '设计', '开发', '测试',
    '做', '帮', '搞', '写', '编', '制', '造', '作',
    '分析', '研究', '调查', '整理', '总结', '汇报',
    '创建', '生成', '制作', '构建', '搭建', '部署',
    '解决', '处理', '修复', '优化', '改进', '完善',
    '审查', '检查', '审核', '评估', '验证',
    '协调', '组织', '安排', '计划', '规划',
    '讨论', '沟通', '交流', '协商',
    '准备', '筹备', '收集', '搜集',
    '翻译', '解释', '说明', '演示',
    '培训', '指导', '帮助', '支持',
    '协作', '配合', '参与', '加入',
    '看看', '想想', '考虑', '评估'
  ];

  static parse(content: string, existingMentions?: string[], isTaskMode?: boolean): ParsedMessage {
    const mentions = this.parseMentions(content);
    const allMentions = [
      ...(existingMentions || []),
      ...mentions
    ].filter((v, i, a) => a.indexOf(v) === i);

    const hasTaskPrefix = content.startsWith('任务：') || content.startsWith('任务:');
    const hasTaskIntent = isTaskMode || allMentions.length > 0 || hasTaskPrefix || this.checkTaskIntent(content);
    const taskTitle = hasTaskIntent ? content.substring(0, 30) : undefined;
    const hasTaskCompletion = this.detectTaskCompletion(content);

    return {
      mentions: allMentions,
      hasTaskIntent,
      taskTitle,
      hasTaskCompletion
    };
  }

  private static detectTaskCompletion(content: string): boolean {
    const completionPatterns = [
      /\[TASK_COMPLETE\]/i,
      /任务已完成/i,
      /任务完成/i,
      /已完成/i,
      /完成了/i,
      /done/i,
      /completed/i,
      /finish/i,
      /finished/i
    ];

    return completionPatterns.some(pattern => pattern.test(content));
  }

  private static parseMentions(content: string): string[] {
    console.log('=== MentionHandler.parseMentions ===');
    console.log('Content:', content);
    
    const mentions: string[] = [];
    const agents = Agent.findAll();
    
    console.log('All agents found:', agents.map(a => ({ id: a.id, name: a.name })));
    
    for (const agent of agents) {
      const mention = `@${agent.name}`;
      if (content.includes(mention) && !mentions.includes(agent.id)) {
        mentions.push(agent.id);
        console.log(`Found mention for agent: ${agent.name} (${agent.id})`);
      }
    }

    console.log('Final mentions:', mentions);
    return mentions;
  }

  private static checkTaskIntent(content: string): boolean {
    return this.TASK_KEYWORDS.some(keyword => content.includes(keyword));
  }
}
