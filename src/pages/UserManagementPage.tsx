import React, { useState, useEffect } from 'react';
import { Plus, Users, RefreshCw } from 'lucide-react';
import { DashboardUser, CreateUserRequest, UpdateUserRequest } from '../types/auth';
import { userService } from '../services/userService';
import UserList from '../components/UserList';
import UserForm from '../components/UserForm';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';

const UserManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';

  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<DashboardUser | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await userService.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const fetchedUsers = await userService.getUsers();
      setUsers(fetchedUsers);
      toast.success('Lista actualizada');
    } catch (error) {
      console.error('Error refreshing users:', error);
      toast.error('Error al actualizar la lista');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddUser = () => {
    if (isViewer) return;
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: DashboardUser) => {
    if (isViewer) return;
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleCloseForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleSubmitUser = async (data: CreateUserRequest | UpdateUserRequest) => {
    try {
      if (editingUser) {
        // Update existing user
        const updatedUser = await userService.updateUser(editingUser.id, data as UpdateUserRequest);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
        toast.success('Usuario actualizado exitosamente');
      } else {
        // Create new user
        const newUser = await userService.createUser(data as CreateUserRequest);
        setUsers(prev => [newUser, ...prev]);
        toast.success('Usuario creado exitosamente');
      }
    } catch (error: any) {
      console.error('Error submitting user:', error);
      toast.error(error.message || 'Error al procesar la solicitud');
      throw error; // Re-throw to prevent form from closing
    }
  };

  const handleDeleteUser = (user: DashboardUser) => {
    if (isViewer) return;
    setDeletingUser(user);
    setShowDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeletingUser(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    try {
      await userService.deleteUser(deletingUser.id);
      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      toast.success('Usuario eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Error al eliminar usuario');
      throw error; // Re-throw to prevent dialog from closing
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestión de Usuarios
              </h1>
              <p className="text-gray-600 mt-1">
                Administra los usuarios que tienen acceso al dashboard
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                refreshing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </button>
            
            <button
              onClick={handleAddUser}
              disabled={isViewer}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${isViewer ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Usuario
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de Usuarios
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : users.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="h-3 w-3 bg-green-600 rounded-full"></div>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Usuarios Activos
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : users.filter(u => u.lastLogin).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <div className="h-3 w-3 bg-yellow-600 rounded-full"></div>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Nuevos Usuarios
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : users.filter(u => !u.lastLogin).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User List */}
      <UserList
        users={users}
        loading={loading}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        isViewer={isViewer}
      />

      {/* User Form Modal */}
      <UserForm
        isOpen={showUserForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmitUser}
        user={editingUser}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        user={deletingUser}
      />
    </div>
  );
};

export default UserManagementPage;