import { mcpServer } from "../mcp/MCPServer";

export class MCPService {
  async getOverview() {
    await mcpServer.initialize();
    return mcpServer.getOverview();
  }

  async listServers() {
    return (await this.getOverview()).servers;
  }

  async listTools() {
    return (await this.getOverview()).tools;
  }

  async connect(serverId: string) {
    return mcpServer.connect(serverId);
  }

  async disconnect(serverId: string) {
    return mcpServer.disconnect(serverId);
  }
}

export const mcpService = new MCPService();
