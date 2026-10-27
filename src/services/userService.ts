import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Local authentic Figma avatar assets
import jenkinsAvatar from '../assets/users/avatar-jenkins.png';
import jenkinsLargeAvatar from '../assets/users/profile-jenkins-large.png';
import chenAvatar from '../assets/users/avatar-chen.png';
import rostovaAvatar from '../assets/users/avatar-rostova.png';

export type UserRole = 'Doctor' | 'Patient' | 'Admin';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type VerificationStatus = 'Verified' | 'Pending';

export interface UserItem {
  id: string;
  hvid: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  verification: VerificationStatus;
  created: string;
  lastLogin: string;
  avatarUrl?: string;
  largeAvatarUrl?: string;
  initials?: string;
  avatarBg?: string;
  avatarColor?: string;
  passwordLastChanged?: string;
  twoFactorStatus?: string;
  activeSessions?: string;
  trustedDevices?: string;
}

export interface UserDirectoryKPIs {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
}

export interface FetchUsersParams {
  search?: string;
  roleFilter?: string; // 'All' | 'Admins' | 'Doctors' | 'Patients'
  statusFilter?: string; // 'All' | 'Active' | 'Inactive'
  verificationFilter?: string; // 'All' | 'Pending' | 'Verified'
  activeChip?: string; // 'All Users' | 'Admins' | 'Doctors' | 'Patients' | 'Active' | 'Inactive' | 'Pending' | 'Verified'
  page?: number;
  limit?: number;
}

export interface FetchUsersResult {
  users: UserItem[];
  total: number;
  page: number;
  limit: number;
  kpis: UserDirectoryKPIs;
}

// Exact Mock data derived from Figma Node 20:516 and Node 20:882
const INITIAL_USERS: UserItem[] = [
  {
    id: 'user-1',
    name: 'Sarah Jenkins',
    hvid: 'HV-DOC-9821',
    role: 'Doctor',
    email: 'sarah.jenkins@hospital.org',
    phone: '+1 (555) 019-2834',
    status: 'ACTIVE',
    verification: 'Verified',
    created: 'Oct 12, 2021',
    lastLogin: 'Today, 08:45 AM',
    avatarUrl: jenkinsAvatar,
    largeAvatarUrl: jenkinsLargeAvatar,
    passwordLastChanged: 'Last changed 30 days ago',
    twoFactorStatus: 'Active (Authenticator App)',
    activeSessions: '3 sessions active',
    trustedDevices: '2 devices verified',
  },
  {
    id: 'user-2',
    name: 'Marcus Reynolds',
    hvid: 'PAT-11094',
    role: 'Patient',
    email: 'm.reynolds88@email.com',
    phone: '+1 (555) 993-1022',
    status: 'ACTIVE',
    verification: 'Pending',
    created: 'Nov 04, 2023',
    lastLogin: 'Yesterday, 14:30',
    initials: 'MR',
    avatarBg: '#3f1d8b',
    avatarColor: '#ab8efd',
  },
  {
    id: 'user-3',
    name: 'David Chen',
    hvid: 'ADM-00432',
    role: 'Admin',
    email: 'd.chen@healthvault.org',
    phone: '+1 (555) 443-8821',
    status: 'INACTIVE',
    verification: 'Verified',
    created: 'Jan 15, 2022',
    lastLogin: 'Sep 30, 2023',
    avatarUrl: chenAvatar,
  },
  {
    id: 'user-4',
    name: 'Elena Rostova',
    hvid: 'PAT-99201',
    role: 'Patient',
    email: 'elena.r@email.com',
    phone: '+1 (555) 112-7483',
    status: 'ACTIVE',
    verification: 'Verified',
    created: 'Mar 22, 2023',
    lastLogin: 'Just now',
    avatarUrl: rostovaAvatar,
  },
  {
    id: 'user-5',
    name: 'Dr. James Wilson',
    hvid: 'DOC-33104',
    role: 'Doctor',
    email: 'j.wilson@healthvault.org',
    phone: '+1 (555) 774-9002',
    status: 'ACTIVE',
    verification: 'Verified',
    created: 'Aug 05, 2023',
    lastLogin: 'Today, 08:15',
    initials: 'JW',
    avatarBg: 'rgba(0,106,96,0.2)',
    avatarColor: '#006a60',
  },
];

// Persistent in-memory cache for session
let usersStore: UserItem[] = [...INITIAL_USERS];

export async function fetchUsers(params: FetchUsersParams = {}): Promise<FetchUsersResult> {
  const { search = '', activeChip = 'All Users', page = 1, limit = 5 } = params;

  let filtered = [...usersStore];

  // Apply Filter Chip
  if (activeChip === 'Admins') {
    filtered = filtered.filter((u) => u.role === 'Admin');
  } else if (activeChip === 'Doctors') {
    filtered = filtered.filter((u) => u.role === 'Doctor');
  } else if (activeChip === 'Patients') {
    filtered = filtered.filter((u) => u.role === 'Patient');
  } else if (activeChip === 'Active') {
    filtered = filtered.filter((u) => u.status === 'ACTIVE');
  } else if (activeChip === 'Inactive') {
    filtered = filtered.filter((u) => u.status === 'INACTIVE');
  } else if (activeChip === 'Pending') {
    filtered = filtered.filter((u) => u.verification === 'Pending');
  } else if (activeChip === 'Verified') {
    filtered = filtered.filter((u) => u.verification === 'Verified');
  }

  // Apply Search
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.hvid.toLowerCase().includes(q),
    );
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginatedUsers = filtered.slice(startIndex, startIndex + limit);

  // Figma KPI numbers from 20:516
  const kpis: UserDirectoryKPIs = {
    totalUsers: 146059,
    activeUsers: 142854,
    inactiveUsers: 3205,
    pendingUsers: 847,
  };

  return {
    users: paginatedUsers,
    total,
    page,
    limit,
    kpis,
  };
}

export async function createUser(data: Omit<UserItem, 'id' | 'created' | 'lastLogin'>): Promise<UserItem> {
  const newUser: UserItem = {
    ...data,
    id: `user-${Date.now()}`,
    created: 'Just now',
    lastLogin: 'Never',
    initials: data.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
    avatarBg: data.role === 'Doctor' ? 'rgba(0,106,96,0.2)' : data.role === 'Admin' ? '#3f1d8b' : '#edeef0',
    avatarColor: data.role === 'Doctor' ? '#006a60' : data.role === 'Admin' ? '#ab8efd' : '#191c1e',
  };

  usersStore = [newUser, ...usersStore];
  return newUser;
}

export function useUsersQuery(params: FetchUsersParams) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => fetchUsers(params),
    staleTime: 1000 * 60,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export async function fetchUserById(id: string): Promise<UserItem | null> {
  const user = usersStore.find((u) => u.id === id);
  if (user) {
    return { ...user };
  }
  // Default fallback to first user (Sarah Jenkins) if id not found or user-1
  return usersStore[0] ? { ...usersStore[0] } : null;
}

export function useUserQuery(id?: string) {
  return useQuery({
    queryKey: ['admin-user-details', id],
    queryFn: () => fetchUserById(id || 'user-1'),
    staleTime: 1000 * 60,
  });
}

export async function updateUser(data: Partial<UserItem> & { id: string }): Promise<UserItem> {
  const index = usersStore.findIndex((u) => u.id === data.id);
  if (index !== -1) {
    usersStore[index] = { ...usersStore[index], ...data };
    return usersStore[index];
  }
  throw new Error(`User with ID ${data.id} not found`);
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-details', updatedUser.id] });
    },
  });
}

export async function toggleUserStatus(id: string): Promise<UserItem> {
  const index = usersStore.findIndex((u) => u.id === id);
  if (index !== -1) {
    const nextStatus: UserStatus = usersStore[index].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    usersStore[index] = { ...usersStore[index], status: nextStatus };
    return usersStore[index];
  }
  throw new Error(`User with ID ${id} not found`);
}

export function useToggleUserStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-details', updatedUser.id] });
    },
  });
}

