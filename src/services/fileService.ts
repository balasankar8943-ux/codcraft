// src/services/fileService.ts
import { supabase } from '../supabaseClient';

export interface FileItem {
  id: string;
  user_id: string;
  parent_folder_id: string | null;
  name: string;
  type: 'file' | 'folder';
  language: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export const inferLanguageFromName = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py': return 'python';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'h': return 'cpp';
    case 'c': return 'c';
    case 'java': return 'java';
    case 'js':
    case 'ts': return 'javascript';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    default: return 'python';
  }
};

const LOCAL_STORAGE_KEY = (userId: string) => `codcraft_ide_files_${userId}`;

const getDefaultInitialFiles = (userId: string): FileItem[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'folder_src',
      user_id: userId,
      parent_folder_id: null,
      name: 'src',
      type: 'folder',
      language: '',
      content: '',
      created_at: now,
      updated_at: now
    },
    {
      id: 'file_main_py',
      user_id: userId,
      parent_folder_id: 'folder_src',
      name: 'main.py',
      type: 'file',
      language: 'python',
      content: `# Free Cloud IDE Playground\ndef main():\n    print("Hello from CodCraft Cloud IDE!")\n    numbers = [3, 1, 4, 1, 5, 9, 2]\n    numbers.sort()\n    print("Sorted array:", numbers)\n\nif __name__ == "__main__":\n    main()\n`,
      created_at: now,
      updated_at: now
    },
    {
      id: 'file_solution_cpp',
      user_id: userId,
      parent_folder_id: 'folder_src',
      name: 'solution.cpp',
      type: 'file',
      language: 'cpp',
      content: `// CodCraft C++ Workspace\n#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nint main() {\n    cout << "Welcome to C++ IDE!" << endl;\n    vector<int> nums = {10, 5, 20, 15};\n    sort(nums.begin(), nums.end());\n    for (int x : nums) cout << x << " ";\n    cout << endl;\n    return 0;\n}\n`,
      created_at: now,
      updated_at: now
    }
  ];
};

export const fetchUserFiles = async (userId: string): Promise<FileItem[]> => {
  try {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .order('type', { ascending: false }) // Folders first
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      // Fallback to local storage or defaults for guest/sandbox users
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY(userId));
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
      const initial = getDefaultInitialFiles(userId);
      localStorage.setItem(LOCAL_STORAGE_KEY(userId), JSON.stringify(initial));
      return initial;
    }

    return data as FileItem[];
  } catch (err) {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY(userId));
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const initial = getDefaultInitialFiles(userId);
    localStorage.setItem(LOCAL_STORAGE_KEY(userId), JSON.stringify(initial));
    return initial;
  }
};

export const createFileItem = async (
  userId: string,
  name: string,
  type: 'file' | 'folder',
  parentFolderId: string | null = null,
  content: string = '',
  language?: string
): Promise<FileItem> => {
  const itemLang = type === 'file' ? (language || inferLanguageFromName(name)) : '';
  const newItem: FileItem = {
    id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: userId,
    parent_folder_id: parentFolderId,
    name: name,
    type: type,
    language: itemLang,
    content: type === 'file' ? content : '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('files')
      .insert([newItem])
      .select()
      .single();

    if (!error && data) {
      return data as FileItem;
    }
  } catch (err) {}

  // Fallback to local storage update
  const current = await fetchUserFiles(userId);
  const updated = [...current, newItem];
  localStorage.setItem(LOCAL_STORAGE_KEY(userId), JSON.stringify(updated));
  return newItem;
};

export const updateFileItem = async (
  id: string,
  userId: string,
  updates: Partial<FileItem>
): Promise<FileItem | null> => {
  const updatedTime = new Date().toISOString();
  const payload = { ...updates, updated_at: updatedTime };

  try {
    const { data, error } = await supabase
      .from('files')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (!error && data) {
      return data as FileItem;
    }
  } catch (err) {}

  // Fallback local storage
  const current = await fetchUserFiles(userId);
  let target: FileItem | null = null;
  const updatedList = current.map(item => {
    if (item.id === id) {
      target = { ...item, ...payload };
      return target;
    }
    return item;
  });
  localStorage.setItem(LOCAL_STORAGE_KEY(userId), JSON.stringify(updatedList));
  return target;
};

export const deleteFileItem = async (id: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (!error) {
      return true;
    }
  } catch (err) {}

  // Local storage fallback (recursive delete of item & children)
  const current = await fetchUserFiles(userId);
  const idsToDelete = new Set<string>([id]);

  let added = true;
  while (added) {
    added = false;
    current.forEach(item => {
      if (item.parent_folder_id && idsToDelete.has(item.parent_folder_id) && !idsToDelete.has(item.id)) {
        idsToDelete.add(item.id);
        added = true;
      }
    });
  }

  const filtered = current.filter(item => !idsToDelete.has(item.id));
  localStorage.setItem(LOCAL_STORAGE_KEY(userId), JSON.stringify(filtered));
  return true;
};
