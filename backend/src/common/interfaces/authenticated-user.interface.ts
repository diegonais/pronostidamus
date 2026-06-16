import { UserRole } from '../enums/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  username: string;
  roles: UserRole[];
  isActive: boolean;
}
