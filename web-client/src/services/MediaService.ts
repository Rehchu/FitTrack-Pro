import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface UploadProgressCallback {
  (progress: number): void;
}

class MediaService {
  static async uploadVideo(
    file: File, 
    data: {
      title: string;
      description: string;
      category_id: number;
      difficulty: string;
    },
    onProgress?: UploadProgressCallback
  ) {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category_id', data.category_id.toString());
    formData.append('difficulty', data.difficulty);

    return axios.post(`${BASE_URL}/workouts/videos/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
  }

  static async getWorkoutCategories() {
    const response = await axios.get(`${BASE_URL}/workouts/categories/`);
    return response.data;
  }

  static async getWorkoutVideos(filters?: {
    category_id?: number;
    difficulty?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.category_id) {
      params.append('category_id', filters.category_id.toString());
    }
    if (filters?.difficulty) {
      params.append('difficulty', filters.difficulty);
    }

    const response = await axios.get(`${BASE_URL}/workouts/videos/?${params}`);
    return response.data;
  }

  static async getWorkoutVideo(id: number) {
    const response = await axios.get(`${BASE_URL}/workouts/videos/${id}`);
    return response.data;
  }

  static async deleteWorkoutVideo(id: number) {
    return axios.delete(`${BASE_URL}/workouts/videos/${id}`);
  }

  // Generic file upload method for client files
  static async uploadClientFile(
    file: File,
    type: 'progress-photo' | 'health-app' | 'gym-photo',
    clientId: number,
    onProgress?: UploadProgressCallback
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('client_id', clientId.toString());

    return axios.post(`${BASE_URL}/clients/files/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
  }

  // Get client files by type
  static async getClientFiles(clientId: number, type?: 'progress-photo' | 'health-app' | 'gym-photo') {
    const params = new URLSearchParams();
    if (type) {
      params.append('type', type);
    }

    const response = await axios.get(`${BASE_URL}/clients/${clientId}/files/?${params}`);
    return response.data;
  }
}

export default MediaService;