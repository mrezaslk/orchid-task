const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Boards
  async getBoard(boardId: string) {
    return this.request<any>(`/boards/${boardId}`);
  }

  async getBoards() {
    return this.request<any[]>('/boards');
  }

  // Tasks
  async getTasks(boardId: string) {
    return this.request<any[]>(`/tasks?boardId=${boardId}`);
  }

  async createTask(data: {
    boardId: string;
    columnId: string;
    title: string;
    description?: string;
  }) {
    return this.request<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async moveTask(taskId: string, toColumnId: string) {
    return this.request<any>(`/tasks/${taskId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ toColumnId }),
    });
  }
}

export const api = new ApiClient();
