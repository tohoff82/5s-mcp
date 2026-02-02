/**
 * Memory Helper для інтеграції з skill_memory
 * 🧠 Допоміжник для роботи з пам'яттю в 5S MCP
 */

export class MemoryHelper {
  constructor(toolOrchestrator) {
    this.tools = toolOrchestrator;
  }

  /**
   * Отримати відкриті напруження
   */
  async getTensions(options = {}) {
    try {
      const result = await this.tools.executeTool('skill_memory', {
        action: 'get_tensions',
        status: options.status || 'open'
      });

      return {
        success: result.success,
        tensions: result.success ? JSON.parse(result.result).tensions || [] : []
      };
    } catch (error) {
      console.warn('Memory tensions fetch failed:', error.message);
      return { success: false, tensions: [] };
    }
  }

  /**
   * Зареєструвати рішення
   */
  async registerDecision(title, decision, rationale, consequences) {
    try {
      const result = await this.tools.executeTool('skill_memory', {
        action: 'register_decision',
        title,
        decision,  
        rationale,
        consequences: Array.isArray(consequences) ? consequences : [consequences]
      });

      return { success: result.success };
    } catch (error) {
      console.warn('Memory decision registration failed:', error.message);
      return { success: false };
    }
  }

  /**
   * Отримати рішення
   */
  async getDecisions(options = {}) {
    try {
      const result = await this.tools.executeTool('skill_memory', {
        action: 'get_decisions',
        status: options.status
      });

      return {
        success: result.success,
        decisions: result.success ? JSON.parse(result.result).decisions || [] : []
      };
    } catch (error) {
      console.warn('Memory decisions fetch failed:', error.message);
      return { success: false, decisions: [] };
    }
  }
}
