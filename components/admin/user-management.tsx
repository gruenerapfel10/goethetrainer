'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, UserPlus, Shield, ShieldOff, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const t = useTranslations();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      const sortedUsers = [...data].sort((a, b) =>
        a.email.localeCompare(b.email),
      );
      setUsers(sortedUsers);
    } catch (error) {
      toast.error(t('errors.userFetch'));
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error(t('errors.fillAllFields'));
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
        }),
      });

      if (!response.ok) throw new Error('Failed to create user');

      toast.success(t('success.userCreate'));
      setNewUserEmail('');
      setNewUserPassword('');
      await fetchUsers();
    } catch (error) {
      toast.error(t('errors.userCreate'));
      console.error('Error creating user:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setIsUpdating(userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update user');

      setUsers((prev) =>
        [...prev]
          .map((user) =>
            user.id === userId ? { ...user, isAdmin: !currentStatus } : user,
          )
          .sort((a, b) => a.email.localeCompare(b.email)),
      );

      toast.success(t('success.userUpdate'));
    } catch (error) {
      toast.error(t('errors.userUpdate'));
      console.error('Error updating user:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      setIsDeleting(userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete user');

      setUsers((prev) =>
        prev
          .filter((user) => user.id !== userId)
          .sort((a, b) => a.email.localeCompare(b.email)),
      );

      toast.success(t('success.userDelete'));
    } catch (error) {
      toast.error(t('errors.userDelete'));
      console.error('Error deleting user:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t('userManagement.title')}</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-border bg-button-alpha hover:bg-button-hover"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('userManagement.addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('userManagement.createUser.title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  {t('userManagement.createUser.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder={t('userManagement.createUser.emailPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {t('userManagement.createUser.password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder={t(
                    'userManagement.createUser.passwordPlaceholder',
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">{t('actions.cancel')}</Button>
                </DialogClose>
                <Button onClick={handleCreateUser} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('userManagement.createUser.creating')}
                    </>
                  ) : (
                    t('userManagement.createUser.create')
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card-alpha rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('userManagement.table.email')}</TableHead>
              <TableHead>{t('userManagement.table.adminStatus')}</TableHead>
              <TableHead className="w-[100px]">
                {t('userManagement.table.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAdminStatus(user.id, user.isAdmin)}
                    disabled={isUpdating === user.id}
                    className="hover:bg-card-hover"
                  >
                    {isUpdating === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : user.isAdmin ? (
                      <Shield className="h-4 w-4 text-success" />
                    ) : (
                      <ShieldOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-card-hover"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {t('userManagement.deleteUser.title')}
                        </DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        {t('userManagement.deleteUser.confirmation')}
                      </p>
                      <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button variant="ghost">{t('actions.cancel')}</Button>
                        </DialogClose>
                        <Button
                          variant="destructive"
                          onClick={() => deleteUser(user.id)}
                          disabled={isDeleting === user.id}
                        >
                          {isDeleting === user.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              {t('userManagement.deleteUser.deleting')}
                            </>
                          ) : (
                            t('userManagement.deleteUser.delete')
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
