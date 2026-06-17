import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PreviewLoginDto } from './dto/preview-login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async previewLogin(previewLoginDto: PreviewLoginDto) {
    const user = await this.usersService.findActiveByUsernameAndEmail(
      previewLoginDto.username,
      previewLoginDto.email,
    );

    if (!user) {
      throw new UnauthorizedException(
        'Active user not found with the provided username and email',
      );
    }

    return {
      message: 'Preview login validated successfully',
      user,
      nextPhase: 'JWT and full authentication will be added in a future phase.',
    };
  }
}
