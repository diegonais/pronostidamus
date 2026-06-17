import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { verifyPassword } from './password.util';
import { PreviewLoginDto } from './dto/preview-login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async previewLogin(previewLoginDto: PreviewLoginDto) {
    const user = await this.usersService.findActiveByUsername(
      previewLoginDto.username,
    );

    if (!user || !verifyPassword(previewLoginDto.password, user.passwordHash)) {
      throw new UnauthorizedException(
        'Invalid username or password',
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
