import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/apiClient';
import { FileItem } from '../models/driveModel';

// Хук для получения списка файлов
export function useFilesList(path: string) {
  return useQuery({
    queryKey: ['files', path],
    queryFn: () => api.listFiles(path) as Promise<{ files: Omit<FileItem, 'isSelected'>[] }>,
  });
}

// Хук для создания папки
export function useCreateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ name, path }: { name: string; path: string }) =>
      api.createFolder(name, path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

// Хук для удаления файла
export function useDeleteFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (path: string) => api.deleteFile(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

// Хук для получения прав доступа
export function useFilePermissions(path: string) {
  return useQuery({
    queryKey: ['file-permissions', path],
    queryFn: () => api.getFilePermissions(path) as Promise<{ allowedUsers: string[] }>,
    enabled: !!path,
  });
}

// Хук для обновления прав доступа
export function useUpdateFilePermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ path, allowedUsers }: { path: string; allowedUsers: string[] }) =>
      api.updateFilePermissions(path, allowedUsers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-permissions'] });
    },
  });
}
