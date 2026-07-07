import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { verifyPassword } from './password.util';
import { PreviewLoginDto } from './dto/preview-login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async previewLogin(previewLoginDto: PreviewLoginDto) {
    const user = await this.usersService.findByUsernameWithPassword(
      previewLoginDto.username,
    );

    if (!user || !verifyPassword(previewLoginDto.password, user.passwordHash)) {
      throw new UnauthorizedException(
        'Invalid username or password',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tu usuario esta deshabilitado. Contacta al administrador.',
      );
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;

    return {
      message: 'Preview login validated successfully',
      user: safeUser,
      nextPhase: 'JWT and full authentication will be added in a future phase.',
    };
  }
}
